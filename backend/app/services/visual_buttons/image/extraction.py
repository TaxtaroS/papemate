# 서비스: 업로드 이미지에서 OCR 및 메타 정보를 추출하여 멀티모달 증거를 만듭니다.
"""Extract image evidence for multimodal analysis.

Uploaded image files are always considered evidence. Embedded document images
are restored with quality filters so blank spacers, lines, and tiny decorations
do not pollute the visual lane.
"""

import base64
import io
import mimetypes
import re
import zipfile
from hashlib import sha1
from typing import Any


MAX_IMAGE_INPUT_BYTES = 1_500_000
MAX_OCR_CHARS = 2600
SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
OCR_CONFIGS = (
    "--oem 3 --psm 6",
    "--oem 3 --psm 11",
)


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


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
    if re.search(r"그림|개념도|도식|diagram|flow|arrow|화살표", text):
        return "diagram_image"
    if re.search(r"표|table|구분|합계|총계", text):
        return "table_image"
    if re.search(r"그래프|차트|chart|graph|axis|legend|추이|증감|비율|%", text):
        return "chart_image"
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

    kind = _visual_kind(name, ocr_text, width, height)
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

    if not keep:
        return None

    asset = _image_asset(
        name=name,
        image_bytes=image_bytes,
        source_label=source_label,
        page_number=page_number,
        bbox=bbox,
        include_data_url=include_data_url,
    )
    if asset:
        asset["quality_reason"] = reason
    return asset


def summarize_uploaded_image(
    filename: str,
    content: bytes,
    *,
    source_label: str | None = None,
) -> list[dict]:
    asset = _image_asset(
        name=filename or "uploaded-image.png",
        image_bytes=content,
        source_label=source_label or "Uploaded image",
        include_data_url=True,
    )
    return [asset] if asset else []


def extract_pdf_visual_assets(content: bytes, filename: str = "document.pdf", limit: int = 12) -> list[dict]:
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
                    asset = _filtered_image_asset(
                        name=f"{filename}-p{page_index}-image{image_index}.{extension}",
                        image_bytes=image_bytes,
                        source_label=f"Page {page_index}",
                        page_number=page_index,
                        include_data_url=True,
                    )
                    if asset:
                        assets.append(asset)
                    if len(assets) >= limit:
                        return assets
    except Exception:
        return assets
    return assets


def extract_zipped_visual_assets(content: bytes, filename: str, limit: int = 12) -> list[dict]:
    assets: list[dict] = []
    seen: set[str] = set()
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
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
                asset = _filtered_image_asset(
                    name=member.rsplit("/", 1)[-1] or f"{filename}-image-{len(assets) + 1}.png",
                    image_bytes=image_bytes,
                    source_label=f"{filename} / {member}",
                    include_data_url=True,
                )
                if asset:
                    assets.append(asset)
                if len(assets) >= limit:
                    break
    except Exception:
        return assets
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
