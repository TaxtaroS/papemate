# 서비스: 업로드 이미지에서 OCR 및 메타 정보를 추출하여 멀티모달 증거를 만듭니다.
"""Extract image evidence for multimodal analysis.

Uploaded image files are always considered evidence. Embedded document images
are restored with quality filters so blank spacers, lines, and tiny decorations
do not pollute the visual lane.
"""

import base64
import io
import json
import mimetypes
import posixpath
import re
import zipfile
from hashlib import sha1
from typing import Any
from xml.etree import ElementTree

from app.core.config import settings
from app.services.openai_client import OPENAI_VISION_TIMEOUT_SECONDS, make_openai_client, openai_error_message


MAX_IMAGE_INPUT_BYTES = 1_500_000
MAX_OPENAI_VISION_BYTES = 3_500_000
MAX_OCR_CHARS = 2600
MAX_CONTEXT_CHARS = 2400
MAX_MERGED_TEXT_CHARS = 4200
SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
IMAGE_MAGIC_EXTENSIONS = (
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\xff\xd8\xff", "jpg"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"BM", "bmp"),
    (b"RIFF", "webp"),
)
OCR_CONFIGS = (
    "--oem 3 --psm 6",
    "--oem 3 --psm 11",
)
ZIP_XML_VISUAL_TAGS = {
    "tbl",
    "table",
    "tr",
    "tc",
    "row",
    "cell",
    "p",
    "para",
    "paragraph",
    "pic",
    "image",
    "img",
    "ole",
    "container",
    "shapeobject",
    "shape",
    "picture",
    "graphic",
    "drawing",
}
TABLE_TAGS = {"tbl", "table"}
VISUAL_KEYWORD_RE = re.compile(r"(?:그림|이미지|사진|표|그래프|차트|figure|image|table|graph|chart)", re.IGNORECASE)
NUMERIC_TABLE_RE = re.compile(r"(?:\d[\d,]*(?:\.\d+)?%?\s+){3,}")


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _clean_context_text(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    text = str(text or "").replace("\x0c", "\n").replace("\r", "\n")
    lines = []
    seen = set()
    for raw_line in text.splitlines():
        line = re.sub(r"[ \t]+", " ", raw_line).strip(" \t\r\n|")
        if not line:
            continue
        compact = re.sub(r"\s+", "", line)
        if compact in seen:
            continue
        seen.add(compact)
        lines.append(line)
    return "\n".join(lines).strip()[:limit]


def _dedupe_join(parts: list[str], *, separator: str = "\n\n", limit: int = MAX_MERGED_TEXT_CHARS) -> str:
    output = []
    seen = set()
    for part in parts:
        text = _clean_context_text(part, limit=limit)
        if not text:
            continue
        compact = re.sub(r"\s+", "", text)
        if compact in seen:
            continue
        seen.add(compact)
        output.append(text)
    return separator.join(output)[:limit]


def _local_name(tag: str) -> str:
    return str(tag or "").rsplit("}", 1)[-1].split(":")[-1].lower()


def _visual_kind_from_text(text: str) -> str:
    value = str(text or "").lower()
    if re.search(r"코드|소스|함수|변수|string|int|select|poly|vertex|target|code|script", value):
        return "code_image"
    if re.search(r"그래프|차트|chart|graph|axis|legend|추이|증감|비율|%", value):
        return "chart_text"
    if re.search(r"표|table|구분|합계|총계|평균|최대|최소", value) or NUMERIC_TABLE_RE.search(value):
        return "table_text"
    if re.search(r"저자|소개|프로필|profile|portrait|author", value):
        return "profile_image"
    return "document_visual_text"


def _has_searchable_visual_text(text: str) -> bool:
    cleaned = _clean_context_text(text)
    alnum = len(re.findall(r"[0-9A-Za-z가-힣]", cleaned))
    return alnum >= 8 or bool(VISUAL_KEYWORD_RE.search(cleaned))


def _clean_ocr_text(text: str) -> str:
    lines = []
    seen = set()
    for raw_line in str(text or "").replace("\x0c", "\n").splitlines():
        line = re.sub(r"[ \t]+", " ", raw_line).strip(" \t\r\n|")
        if len(line) <= 1:
            continue
        compact = re.sub(r"\s+", "", line)
        if compact in seen:
            continue
        seen.add(compact)
        lines.append(line)
    return "\n".join(lines).strip()


def _ocr_quality(text: str) -> tuple[int, int, int]:
    cleaned = _clean_ocr_text(text)
    hangul = len(re.findall(r"[가-힣]", cleaned))
    alnum = len(re.findall(r"[0-9A-Za-z가-힣]", cleaned))
    rows = len([line for line in cleaned.splitlines() if line.strip()])
    return alnum + hangul * 2 + rows * 6, hangul, len(cleaned)


def _ocr_variants(image):
    try:
        from PIL import Image, ImageFilter, ImageOps
    except ModuleNotFoundError:
        return [image]

    variants = [image]
    try:
        base = ImageOps.exif_transpose(image).convert("RGB")
        width, height = base.size
        scale = 3 if max(width, height) < 900 else 2 if max(width, height) < 1600 else 1
        if scale > 1:
            resample = getattr(getattr(Image, "Resampling", object), "LANCZOS", 1)
            base = base.resize((width * scale, height * scale), resample)

        gray = ImageOps.grayscale(base)
        enhanced = ImageOps.autocontrast(gray).filter(ImageFilter.SHARPEN)
        variants.extend(
            [
                enhanced,
                enhanced.point(lambda value: 255 if value > 180 else 0),
            ]
        )
    except Exception:
        return variants

    return variants


def _mime_type(name: str, image_format: str | None = None) -> str:
    guessed = mimetypes.guess_type(name or "")[0]
    if guessed:
        return guessed
    if image_format:
        return f"image/{image_format.lower().replace('jpeg', 'jpeg')}"
    return "image/png"


def _data_url(image_bytes: bytes, mime_type: str) -> str | None:
    if not image_bytes or len(image_bytes) > MAX_IMAGE_INPUT_BYTES:
        return None
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _vision_data_url(image, image_bytes: bytes, mime_type: str) -> str | None:
    if image_bytes and len(image_bytes) <= MAX_OPENAI_VISION_BYTES:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    try:
        from PIL import Image, ImageOps
    except ModuleNotFoundError:
        return None

    try:
        base = ImageOps.exif_transpose(image).convert("RGB")
        width, height = base.size
        max_side = max(width, height)
        if max_side > 1800:
            scale = 1800 / max_side
            resample = getattr(getattr(Image, "Resampling", object), "LANCZOS", 1)
            base = base.resize((max(1, int(width * scale)), max(1, int(height * scale))), resample)

        for quality in (88, 78, 68):
            output = io.BytesIO()
            base.save(output, format="JPEG", quality=quality, optimize=True)
            candidate = output.getvalue()
            if len(candidate) <= MAX_OPENAI_VISION_BYTES:
                encoded = base64.b64encode(candidate).decode("ascii")
                return f"data:image/jpeg;base64,{encoded}"
    except Exception:
        return None

    return None


def _image_extension_from_bytes(data: bytes, fallback: str = "png") -> str:
    for magic, extension in IMAGE_MAGIC_EXTENSIONS:
        if data.startswith(magic):
            if extension == "webp" and data[8:12] != b"WEBP":
                continue
            return extension
    return fallback


def _json_from_text(text: str) -> dict:
    cleaned = str(text or "").replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start:end + 1])
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _string_list(value: Any, limit: int = 8) -> list[str]:
    if isinstance(value, list):
        return [_clean_context_text(item, limit=240) for item in value[:limit] if _clean_context_text(item, limit=240)]
    if isinstance(value, str) and value.strip():
        return [_clean_context_text(value, limit=800)]
    return []


def _markdown_table_from_rows(value: Any) -> str:
    if isinstance(value, str):
        return _clean_context_text(value, limit=1200)
    if not isinstance(value, list) or not value:
        return ""
    rows = [row for row in value if isinstance(row, dict)]
    if not rows:
        return ""
    columns = []
    for row in rows:
        for key in row.keys():
            if key not in columns:
                columns.append(str(key))
        if len(columns) >= 8:
            break
    columns = columns[:8]
    if not columns:
        return ""
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
    ]
    for row in rows[:12]:
        lines.append("| " + " | ".join(_clean_context_text(row.get(column, ""), limit=120) for column in columns) + " |")
    return "\n".join(lines)


def _vision_payload_to_text(payload: dict) -> str:
    parts = []
    visual_type = _clean_context_text(payload.get("visual_type", ""), limit=80)
    if visual_type:
        parts.append(f"GPT-4o 시각자료 유형: {visual_type}")

    summary = _clean_context_text(payload.get("summary", ""), limit=900)
    if summary:
        parts.append(f"GPT-4o 요약: {summary}")

    visible_text = _clean_context_text(payload.get("visible_text", ""), limit=1000)
    if visible_text:
        parts.append(f"GPT-4o 판독 문자: {visible_text}")

    table_markdown = _markdown_table_from_rows(payload.get("table"))
    if table_markdown:
        parts.append(f"GPT-4o 표 구조:\n{table_markdown}")

    chart_values = payload.get("chart_values")
    if chart_values:
        if isinstance(chart_values, (dict, list)):
            chart_text = json.dumps(chart_values, ensure_ascii=False)
        else:
            chart_text = str(chart_values)
        parts.append(f"GPT-4o 그래프/수치 후보: {_clean_context_text(chart_text, limit=1000)}")

    key_points = _string_list(payload.get("key_points"))
    if key_points:
        parts.append("GPT-4o 핵심 포인트:\n" + "\n".join(f"- {point}" for point in key_points))

    confidence = payload.get("confidence")
    if confidence is not None:
        parts.append(f"GPT-4o 신뢰도: {_clean_context_text(confidence, limit=40)}")

    discard_reason = _clean_context_text(payload.get("discard_reason", ""), limit=260)
    if discard_reason:
        parts.append(f"GPT-4o 제외 판단: {discard_reason}")

    return _dedupe_join(parts, limit=MAX_MERGED_TEXT_CHARS)


def _openai_vision_enrichment(
    *,
    image,
    image_bytes: bytes,
    mime_type: str,
    name: str,
    source_label: str,
    width: int,
    height: int,
    ocr_text: str,
    table_text: str,
    document_text: str,
    openai_api_key: str | None = None,
) -> tuple[dict[str, Any], str, str | None]:
    api_key = (openai_api_key or settings.openai_api_key or "").strip()
    if not api_key:
        return {}, "", None

    data_url = _vision_data_url(image, image_bytes, mime_type)
    if not data_url:
        return {}, "", "이미지가 너무 커서 GPT-4o Vision 입력으로 압축하지 못했습니다."

    prompt = (
        "너는 PaperMate의 문서 이미지 추출 보강 엔진이다. "
        "이미지에 실제로 보이는 내용만 근거로 삼고, OCR/주변 텍스트는 보조 단서로만 사용해라. "
        "표라면 행/열 구조를 복원하고, 그래프라면 제목, 축, 범례, 값 후보, 추세를 뽑아라. "
        "코드 스크린샷이면 코드 내용을 최대한 보존하고, 저자 소개/프로필이면 이름, 소속, 사진 여부, 소개 문구를 분리해라. "
        "장식 이미지라면 discard_reason을 적되, 그래도 보이는 텍스트가 있으면 visible_text에 남겨라. "
        "반드시 JSON 객체만 반환해라.\n\n"
        "JSON 스키마:\n"
        "{"
        "\"visual_type\":\"table|chart|diagram|code|profile|screenshot|photo|decorative|unknown\","
        "\"summary\":\"한국어 요약\","
        "\"visible_text\":\"이미지에서 직접 보이는 문자\","
        "\"table\":[{\"열\":\"값\"}],"
        "\"chart_values\":{\"title\":\"\",\"x_axis\":\"\",\"y_axis\":\"\",\"legend\":[],\"values\":[],\"trend\":\"\"},"
        "\"key_points\":[\"문서 검색에 유용한 핵심 근거\"],"
        "\"confidence\":\"high|medium|low\","
        "\"discard_reason\":\"장식/빈 이미지일 때만 사유\""
        "}\n\n"
        f"파일명: {name}\n"
        f"출처: {source_label}\n"
        f"크기: {width}x{height}px\n"
        f"OCR 텍스트:\n{ocr_text or '(없음)'}\n\n"
        f"표 OCR 후보:\n{table_text or '(없음)'}\n\n"
        f"문서 주변 텍스트:\n{document_text or '(없음)'}"
    )

    try:
        client = make_openai_client(api_key, OPENAI_VISION_TIMEOUT_SECONDS)
        response = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url, "detail": "high"}},
                    ],
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or ""
        payload = _json_from_text(content)
        return payload, _vision_payload_to_text(payload), None
    except Exception as exc:
        return {}, "", openai_error_message(exc)


def _image_quality(image) -> tuple[bool, str]:
    width, height = image.size
    if width < 80 or height < 80:
        return False, "too-small"
    if width * height < 12_000:
        return False, "too-small-area"
    ratio = max(width / max(height, 1), height / max(width, 1))
    if ratio > 12:
        return False, "line-like"

    try:
        grayscale = image.convert("L").resize((64, 64))
        histogram = grayscale.histogram()
        total = sum(histogram) or 1
        mean = sum(value * count for value, count in enumerate(histogram)) / total
        variance = sum(((value - mean) ** 2) * count for value, count in enumerate(histogram)) / total
        dark_or_colored = sum(histogram[:245]) / total
    except Exception:
        return True, "unknown"

    if variance < 8 and dark_or_colored < 0.04:
        return False, "blank"
    return True, "content"


def _table_like_text_from_ocr_data(image, pytesseract) -> str:
    try:
        data = pytesseract.image_to_data(
            image,
            lang="kor+eng",
            config="--oem 3 --psm 6",
            output_type=pytesseract.Output.DICT,
            timeout=8,
        )
    except Exception:
        return ""

    words = []
    for index, text in enumerate(data.get("text", [])):
        word = _clean_text(text)
        if not word:
            continue
        try:
            conf = float(data.get("conf", [])[index])
        except Exception:
            conf = -1
        if conf < 20:
            continue
        words.append(
            {
                "text": word,
                "left": int(data.get("left", [0])[index]),
                "top": int(data.get("top", [0])[index]),
                "height": int(data.get("height", [0])[index]),
            }
        )

    if len(words) < 6:
        return ""

    words.sort(key=lambda item: (item["top"], item["left"]))
    rows: list[list[dict]] = []
    for word in words:
        center_y = word["top"] + word["height"] / 2
        matched_row = None
        for row in rows:
            row_center = sum(item["top"] + item["height"] / 2 for item in row) / len(row)
            if abs(center_y - row_center) <= max(12, word["height"] * 0.8):
                matched_row = row
                break
        if matched_row is None:
            rows.append([word])
        else:
            matched_row.append(word)

    table_rows = []
    table_tokens = []
    for row in rows:
        row = sorted(row, key=lambda item: item["left"])
        if len(row) < 2:
            continue
        table_tokens.extend(item["text"] for item in row)
        table_rows.append(" | ".join(item["text"] for item in row))

    if len(table_rows) < 2:
        return ""
    if table_tokens:
        single_char_ratio = sum(1 for token in table_tokens if len(token) <= 1) / len(table_tokens)
        numeric_ratio = sum(1 for token in table_tokens if re.search(r"\d", token)) / len(table_tokens)
        if single_char_ratio > 0.48 and numeric_ratio < 0.35:
            return ""
    return "\n".join(table_rows[:16])


def _ocr_image(image) -> tuple[str, str]:
    try:
        import pytesseract
    except ModuleNotFoundError:
        return "", ""

    best_text = ""
    best_score = (-1, -1, -1)
    best_variant = image
    table_text = ""
    for variant in _ocr_variants(image):
        for config in OCR_CONFIGS:
            try:
                candidate = _clean_ocr_text(
                    pytesseract.image_to_string(variant, lang="kor+eng", config=config, timeout=8)
                )
            except Exception:
                continue
            score = _ocr_quality(candidate)
            if score > best_score:
                best_score = score
                best_text = candidate
                best_variant = variant

    try:
        table_text = _table_like_text_from_ocr_data(best_variant, pytesseract)
    except Exception:
        table_text = ""

    if table_text and table_text not in best_text:
        combined = f"{best_text}\n\n[표 OCR 후보]\n{table_text}".strip()
    else:
        combined = best_text
    return combined[:MAX_OCR_CHARS], table_text[:MAX_OCR_CHARS]


def _visual_kind(name: str, ocr_text: str, width: int = 0, height: int = 0) -> str:
    text = f"{name} {ocr_text}".lower()
    if re.search(r"코드|소스|함수|변수|string|int|select|poly|vertex|target|code|script", text):
        return "code_image"
    if re.search(r"그림|개념도|도식|diagram|flow|arrow|화살표", text):
        return "diagram_image"
    if re.search(r"표|table|구분|합계|총계", text):
        return "table_image"
    if re.search(r"그래프|차트|chart|graph|axis|legend|추이|증감|비율|%", text):
        return "chart_image"
    if re.search(r"저자|소개|프로필|profile|portrait|author", text):
        return "profile_image"
    if width > height * 2.2 or height > width * 2.2:
        return "diagram_image"
    return "image"


def _image_asset(
    *,
    name: str,
    image_bytes: bytes,
    source_label: str,
    page_number: int | None = None,
    bbox: list[float] | None = None,
    include_data_url: bool = True,
    document_text: str = "",
    openai_api_key: str | None = None,
) -> dict[str, Any] | None:
    try:
        from PIL import Image
    except ModuleNotFoundError:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size
        image_format = image.format or "PNG"
        mime_type = _mime_type(name, image_format)
        ocr_text, table_text = _ocr_image(image)
    except Exception:
        return None

    document_text = _clean_context_text(document_text)
    vision_data, vision_text, vision_error = _openai_vision_enrichment(
        image=image,
        image_bytes=image_bytes,
        mime_type=mime_type,
        name=name,
        source_label=source_label,
        width=width,
        height=height,
        ocr_text=ocr_text,
        table_text=table_text,
        document_text=document_text,
        openai_api_key=openai_api_key,
    )
    merged_text = _dedupe_join(
        [
            f"[OCR]\n{ocr_text}" if ocr_text else "",
            f"[표 OCR 후보]\n{table_text}" if table_text else "",
            f"[문서 주변 텍스트]\n{document_text}" if document_text else "",
            f"[GPT-4o Vision]\n{vision_text}" if vision_text else "",
        ]
    )
    kind = _visual_kind(name, _dedupe_join([ocr_text, table_text, document_text, vision_text]), width, height)
    vision_type = _clean_context_text(vision_data.get("visual_type", ""), limit=80)
    if vision_type == "table":
        kind = "table_image"
    elif vision_type == "chart":
        kind = "chart_image"
    elif vision_type == "diagram":
        kind = "diagram_image"
    elif vision_type == "code":
        kind = "code_image"
    elif vision_type == "profile":
        kind = "profile_image"
    elif vision_type == "screenshot":
        kind = "screenshot_image"
    elif vision_type == "photo":
        kind = "photo_image"
    elif vision_type == "decorative":
        kind = "decorative_image"
    parts = [
        f"시각자료 유형: {kind}",
        f"출처: {source_label}",
        f"파일명: {name}",
        f"크기: {width}x{height}px",
        f"형식: {image_format}",
    ]
    if ocr_text:
        parts.append(f"OCR 텍스트: {ocr_text}")
    else:
        parts.append("OCR 텍스트: 추출되지 않음")
    if table_text:
        parts.append(f"표 구조 후보: {table_text}")
    if document_text:
        parts.append(f"문서 주변 텍스트: {document_text}")
    if merged_text:
        parts.append(f"검색용 병합 텍스트: {merged_text}")
    if vision_text:
        parts.append(f"GPT-4o Vision 보강: {vision_text}")
    if vision_error:
        parts.append(f"GPT-4o Vision 오류: {vision_error}")

    asset = {
        "id": sha1(image_bytes[:4096] + name.encode("utf-8", errors="ignore")).hexdigest()[:16],
        "kind": kind,
        "name": name,
        "source_label": source_label,
        "page_number": page_number,
        "bbox": bbox,
        "width": width,
        "height": height,
        "mime_type": mime_type,
        "ocr_text": ocr_text,
        "table_text": table_text,
        "document_text": document_text,
        "vision_text": vision_text,
        "vision_data": vision_data,
        "vision_model": settings.openai_vision_model if vision_text else None,
        "vision_error": vision_error,
        "merged_text": merged_text,
        "text": " | ".join(parts),
    }
    if include_data_url:
        data_url = _data_url(image_bytes, mime_type)
        if data_url:
            asset["data_url"] = data_url
    return asset


def _filtered_image_asset(
    *,
    name: str,
    image_bytes: bytes,
    source_label: str,
    page_number: int | None = None,
    bbox: list[float] | None = None,
    include_data_url: bool = True,
    document_text: str = "",
    openai_api_key: str | None = None,
) -> dict[str, Any] | None:
    try:
        from PIL import Image
    except ModuleNotFoundError:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes))
        keep, reason = _image_quality(image)
    except Exception:
        return None

    hard_drop_reasons = {"too-small", "too-small-area", "line-like"}
    if not keep and reason in hard_drop_reasons and not _has_searchable_visual_text(document_text):
        return None

    asset = _image_asset(
        name=name,
        image_bytes=image_bytes,
        source_label=source_label,
        page_number=page_number,
        bbox=bbox,
        include_data_url=include_data_url,
        document_text=document_text,
        openai_api_key=openai_api_key,
    )
    if not asset:
        return None

    vision_type = ((asset.get("vision_data") or {}).get("visual_type") or "").strip().lower()
    vision_keeps = vision_type in {"table", "chart", "diagram", "code", "profile", "screenshot", "photo"}
    if not keep and not vision_keeps and not _has_searchable_visual_text(
        _dedupe_join([asset.get("ocr_text", ""), asset.get("document_text", ""), asset.get("vision_text", "")])
    ):
        return None
    asset["quality_reason"] = reason
    return asset


def summarize_uploaded_image(
    filename: str,
    content: bytes,
    *,
    source_label: str | None = None,
    openai_api_key: str | None = None,
) -> list[dict]:
    asset = _image_asset(
        name=filename or "uploaded-image.png",
        image_bytes=content,
        source_label=source_label or "Uploaded image",
        include_data_url=True,
        openai_api_key=openai_api_key,
    )
    return [asset] if asset else []


def _pdf_text_near_image(page, rect) -> str:
    pieces: list[str] = []
    try:
        page_rect = page.rect
        expanded = rect.__class__(rect.x0 - 90, rect.y0 - 80, rect.x1 + 90, rect.y1 + 140)
        expanded &= page_rect
        pieces.append(page.get_text("text", clip=expanded) or "")
    except Exception:
        pass

    try:
        blocks = page.get_text("blocks") or []
        candidates = []
        for block in blocks:
            if len(block) < 5:
                continue
            x0, y0, x1, y1, text = block[:5]
            text = _clean_context_text(text)
            if not text:
                continue
            horizontal_overlap = min(x1, rect.x1) - max(x0, rect.x0)
            vertical_gap = min(abs(y1 - rect.y0), abs(y0 - rect.y1))
            near_caption = horizontal_overlap > -40 and vertical_gap <= 170
            visual_text = VISUAL_KEYWORD_RE.search(text) or NUMERIC_TABLE_RE.search(text)
            if near_caption or visual_text:
                distance = max(0, vertical_gap) + max(0, -horizontal_overlap)
                candidates.append((distance, text))
        for _, text in sorted(candidates, key=lambda item: item[0])[:5]:
            pieces.append(text)
    except Exception:
        pass

    return _dedupe_join(pieces, limit=MAX_CONTEXT_CHARS)


def _xml_attr_refs(node, rel_targets: dict[str, str] | None = None) -> set[str]:
    refs: set[str] = set()
    rel_targets = rel_targets or {}
    for element in node.iter():
        for value in element.attrib.values():
            text = str(value or "").strip()
            if not text:
                continue
            lowered = text.replace("\\", "/").lower()
            refs.add(lowered)
            refs.add(posixpath.basename(lowered))
            if text in rel_targets:
                target = rel_targets[text].replace("\\", "/").lower()
                refs.add(target)
                refs.add(posixpath.basename(target))
    return refs


def _zip_relationship_targets(archive: zipfile.ZipFile) -> dict[str, dict[str, str]]:
    relationships: dict[str, dict[str, str]] = {}
    for name in archive.namelist():
        lower = name.lower()
        if not lower.endswith(".rels") or "/_rels/" not in lower:
            continue
        try:
            root = ElementTree.fromstring(archive.read(name))
        except Exception:
            continue

        owner_dir, rel_file = name.rsplit("/_rels/", 1)
        owner_name = rel_file[:-5] if rel_file.lower().endswith(".rels") else rel_file
        owner_path = posixpath.normpath(posixpath.join(owner_dir, owner_name)).lower()
        owner_relationships: dict[str, str] = {}
        for relationship in root:
            rel_id = relationship.attrib.get("Id")
            target = relationship.attrib.get("Target")
            if not rel_id or not target:
                continue
            if target.startswith("/"):
                normalized_target = posixpath.normpath(target.lstrip("/"))
            else:
                normalized_target = posixpath.normpath(posixpath.join(owner_dir, target))
            owner_relationships[rel_id] = normalized_target
        relationships[owner_path] = owner_relationships
    return relationships


def _xml_visual_blocks(xml_name: str, raw: bytes, relationships: dict[str, dict[str, str]]) -> list[dict]:
    try:
        root = ElementTree.fromstring(raw)
    except Exception:
        return []

    rel_targets = relationships.get(xml_name.lower(), {})
    blocks: list[dict] = []
    for node in root.iter():
        name = _local_name(node.tag)
        if name not in ZIP_XML_VISUAL_TAGS:
            continue
        text = _clean_context_text(" ".join(part for part in node.itertext() if part and part.strip()))
        refs = _xml_attr_refs(node, rel_targets)
        if not text and not refs:
            continue
        is_table = name in TABLE_TAGS or bool(NUMERIC_TABLE_RE.search(text or ""))
        blocks.append({"text": text, "refs": refs, "is_table": bool(is_table), "tag": name})
    return blocks


def _member_ref_keys(member: str) -> set[str]:
    normalized = member.replace("\\", "/").lower()
    basename = posixpath.basename(normalized)
    return {normalized, basename, basename.rsplit(".", 1)[0]}


def _text_visual_asset(source_label: str, text: str, index: int) -> dict[str, Any]:
    cleaned = _clean_context_text(text)
    kind = _visual_kind_from_text(cleaned)
    digest = sha1(f"{source_label}:{index}:{cleaned[:300]}".encode("utf-8", errors="ignore")).hexdigest()[:16]
    return {
        "id": digest,
        "kind": kind,
        "name": f"{source_label} visual-text-{index}",
        "source_label": source_label,
        "document_text": cleaned,
        "merged_text": cleaned,
        "text": " | ".join(
            [
                f"시각자료 유형: {kind}",
                f"출처: {source_label}",
                f"문서 문자 텍스트: {cleaned}",
                f"검색용 병합 텍스트: {cleaned}",
            ]
        ),
    }


def _zip_visual_contexts(archive: zipfile.ZipFile) -> dict[str, Any]:
    relationships = _zip_relationship_targets(archive)
    member_contexts: dict[str, str] = {}
    visual_contexts: list[str] = []
    table_assets: list[dict] = []
    document_texts: list[str] = []

    for xml_name in sorted(archive.namelist()):
        lower = xml_name.lower()
        if not lower.endswith(".xml"):
            continue
        if not any(part in lower for part in ("contents/", "section", "bodytext", "word/", "document", "header", "footer")):
            continue
        try:
            raw = archive.read(xml_name)
        except Exception:
            continue

        blocks = _xml_visual_blocks(xml_name, raw, relationships)
        text_blocks = [block["text"] for block in blocks if block.get("text")]
        if text_blocks:
            document_texts.append(_dedupe_join(text_blocks, limit=MAX_CONTEXT_CHARS))

        for index, block in enumerate(blocks):
            text = block.get("text", "")
            refs = block.get("refs", set())
            context = _dedupe_join(
                [
                    blocks[index - 2]["text"] if index - 2 >= 0 else "",
                    blocks[index - 1]["text"] if index - 1 >= 0 else "",
                    text,
                    blocks[index + 1]["text"] if index + 1 < len(blocks) else "",
                    blocks[index + 2]["text"] if index + 2 < len(blocks) else "",
                ],
                limit=MAX_CONTEXT_CHARS,
            )

            if text and (block.get("is_table") or VISUAL_KEYWORD_RE.search(text)):
                if context:
                    visual_contexts.append(context)
                if block.get("is_table"):
                    table_assets.append(_text_visual_asset(xml_name, context or text, len(table_assets) + 1))

            if not refs or not context:
                continue
            for ref in refs:
                member_contexts[ref] = _dedupe_join([member_contexts.get(ref, ""), context], limit=MAX_CONTEXT_CHARS)

    return {
        "member_contexts": member_contexts,
        "visual_contexts": visual_contexts,
        "table_assets": table_assets,
        "document_context": _dedupe_join(document_texts, limit=MAX_CONTEXT_CHARS),
    }


def _context_for_zip_member(contexts: dict[str, Any], member: str, index: int) -> str:
    member_contexts = contexts.get("member_contexts") or {}
    for key in _member_ref_keys(member):
        if member_contexts.get(key):
            return member_contexts[key]

    visual_contexts = contexts.get("visual_contexts") or []
    if 0 <= index < len(visual_contexts):
        return visual_contexts[index]
    return contexts.get("document_context", "")


def extract_pdf_visual_assets(
    content: bytes,
    filename: str = "document.pdf",
    limit: int = 30,
    *,
    openai_api_key: str | None = None,
) -> list[dict]:
    try:
        import fitz
    except ModuleNotFoundError:
        return []

    assets: list[dict] = []
    seen: set[str] = set()
    try:
        with fitz.open(stream=content, filetype="pdf") as document:
            for page_index, page in enumerate(document, start=1):
                for image_index, image_info in enumerate(page.get_images(full=True), start=1):
                    xref = image_info[0]
                    try:
                        extracted = document.extract_image(xref)
                    except Exception:
                        continue
                    image_bytes = extracted.get("image") or b""
                    digest = sha1(image_bytes).hexdigest()
                    if digest in seen:
                        continue
                    seen.add(digest)
                    extension = extracted.get("ext") or "png"
                    try:
                        rects = page.get_image_rects(xref)
                    except Exception:
                        rects = []
                    rect = rects[0] if rects else None
                    if rect:
                        document_text = _pdf_text_near_image(page, rect)
                        bbox = [rect.x0, rect.y0, rect.x1, rect.y1]
                    else:
                        document_text = _clean_context_text(page.get_text("text") or "")
                        bbox = None
                    asset = _filtered_image_asset(
                        name=f"{filename}-p{page_index}-image{image_index}.{extension}",
                        image_bytes=image_bytes,
                        source_label=f"Page {page_index}",
                        page_number=page_index,
                        bbox=bbox,
                        include_data_url=True,
                        document_text=document_text,
                        openai_api_key=openai_api_key,
                    )
                    if asset:
                        assets.append(asset)
                    if len(assets) >= limit:
                        return assets
    except Exception:
        return assets
    return assets


def extract_zipped_visual_assets(
    content: bytes,
    filename: str,
    limit: int = 30,
    *,
    openai_api_key: str | None = None,
) -> list[dict]:
    assets: list[dict] = []
    seen: set[str] = set()
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            contexts = _zip_visual_contexts(archive)
            names = sorted(archive.namelist())
            for member in names:
                lower = member.lower()
                if not any(lower.endswith(extension) for extension in SUPPORTED_IMAGE_EXTENSIONS):
                    continue
                if not re.search(r"(^|/)(word/media|contents|bindata|binarydata|media|images?)/", lower):
                    continue
                try:
                    image_bytes = archive.read(member)
                except Exception:
                    continue
                digest = sha1(image_bytes).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)
                document_text = _context_for_zip_member(contexts, member, len(assets))
                asset = _filtered_image_asset(
                    name=member.rsplit("/", 1)[-1] or f"{filename}-image-{len(assets) + 1}.png",
                    image_bytes=image_bytes,
                    source_label=f"{filename} / {member}",
                    include_data_url=True,
                    document_text=document_text,
                    openai_api_key=openai_api_key,
                )
                if asset:
                    assets.append(asset)
                if len(assets) >= limit:
                    break
            for table_asset in contexts.get("table_assets", []):
                if len(assets) >= limit:
                    break
                asset_id = table_asset.get("id")
                if asset_id and asset_id not in seen:
                    seen.add(asset_id)
                    assets.append(table_asset)
    except Exception:
        return assets
    return assets


def extract_hwp_visual_assets(
    content: bytes,
    filename: str = "document.hwp",
    *,
    document_text: str = "",
    openai_api_key: str | None = None,
    limit: int = 30,
) -> list[dict]:
    try:
        import olefile
    except ModuleNotFoundError:
        return []

    assets: list[dict] = []
    seen: set[str] = set()
    try:
        ole = olefile.OleFileIO(io.BytesIO(content))
    except Exception:
        return []

    try:
        for path in ole.listdir(streams=True, storages=False):
            if not path or str(path[0]).lower() != "bindata":
                continue
            stream_name = "/".join(path)
            try:
                image_bytes = ole.openstream(path).read()
            except Exception:
                continue
            extension = _image_extension_from_bytes(image_bytes, posixpath.splitext(stream_name)[1].lower().lstrip(".") or "png")
            if extension not in {ext.lstrip(".") for ext in SUPPORTED_IMAGE_EXTENSIONS}:
                continue
            digest = sha1(image_bytes).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            asset = _filtered_image_asset(
                name=f"{stream_name}.{extension}" if "." not in posixpath.basename(stream_name) else stream_name,
                image_bytes=image_bytes,
                source_label=f"{filename} / {stream_name}",
                include_data_url=True,
                document_text=document_text,
                openai_api_key=openai_api_key,
            )
            if asset:
                assets.append(asset)
            if len(assets) >= limit:
                break
    except Exception:
        return assets
    finally:
        try:
            ole.close()
        except Exception:
            pass
    return assets


def visual_assets_to_source_units(assets: list[dict]) -> list[dict]:
    units = []
    for index, asset in enumerate(assets or [], start=1):
        text = _clean_text(asset.get("text", ""))
        if not text:
            continue
        units.append(
            {
                "source_label": asset.get("source_label") or f"Visual {index}",
                "page_number": asset.get("page_number"),
                "section_index": asset.get("section_index"),
                "text": text,
                "visual_kind": asset.get("kind"),
                "visual_asset_id": asset.get("id"),
            }
        )
    return units
