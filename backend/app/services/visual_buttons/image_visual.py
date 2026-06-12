# 서비스: 업로드된 이미지 기반 시각화 후보를 추출하여 표시합니다.
# 초보자 안내: 문서 안의 이미지/차트/표 후보를 추출해 화면에 보여주는 파일입니다.

import base64
import io
import re
from hashlib import sha1

from app.core.config import settings
from app.services.openai_client import OPENAI_STRUCTURED_TIMEOUT_SECONDS, make_openai_client, openai_error_message

from .common import base_asset, clean_line


def _image_number(value: str) -> int | None:
    match = re.search(r"(?:image|img)(\d+)", str(value or ""), flags=re.IGNORECASE)
    return int(match.group(1)) if match else None


def _decode_data_url(data_url: str) -> tuple[str, bytes] | None:
    match = re.match(r"data:([^;]+);base64,(.+)", str(data_url or ""), flags=re.S)
    if not match:
        return None
    try:
        return match.group(1), base64.b64decode(match.group(2))
    except Exception:
        return None


def _to_data_url(image_bytes: bytes, mime_type: str = "image/png") -> str:
    return f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"


def _is_groupable_item(item: dict) -> bool:
    if item.get("ocrText") or item.get("tableText") or not item.get("dataUrl"):
        return False
    width = int(item.get("width") or 0)
    height = int(item.get("height") or 0)
    if width < 80 or height < 70 or width > 360 or height > 240:
        return False
    return bool(_image_number(item.get("source") or item.get("name")))


def _combine_group(group: list[dict]) -> dict | None:
    try:
        from PIL import Image
    except ModuleNotFoundError:
        return None

    images = []
    for item in group:
        decoded = _decode_data_url(item.get("dataUrl"))
        if not decoded:
            return None
        _, image_bytes = decoded
        try:
            images.append(Image.open(io.BytesIO(image_bytes)).convert("RGBA"))
        except Exception:
            return None

    gap = 18
    pad = 18
    width = sum(image.width for image in images) + gap * (len(images) - 1) + pad * 2
    height = max(image.height for image in images) + pad * 2
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    x = pad
    for image in images:
        y = pad + (height - pad * 2 - image.height) // 2
        canvas.alpha_composite(image, (x, y))
        x += image.width + gap

    output = io.BytesIO()
    canvas.convert("RGB").save(output, format="PNG")
    members = ", ".join(item["name"] for item in group)
    first_number = _image_number(group[0].get("source") or group[0].get("name")) or 0
    last_number = _image_number(group[-1].get("source") or group[-1].get("name")) or first_number
    digest = sha1(output.getvalue()[:4096] + members.encode("utf-8", errors="ignore")).hexdigest()[:16]
    return {
        **group[0],
        "id": f"group-{digest}",
        "kind": "diagram_image",
        "name": f"연결 이미지 묶음 image{first_number}-image{last_number}.png",
        "source": group[0]["filename"],
        "width": width,
        "height": height,
        "mimeType": "image/png",
        "dataUrl": _to_data_url(output.getvalue()),
        "previewText": f"연속된 작은 이미지 {len(group)}개를 하나의 후보로 묶었습니다. 포함: {members}",
    }


def _merge_related_image_items(items: list[dict]) -> list[dict]:
    merged: list[dict] = []
    index = 0
    while index < len(items):
        item = items[index]
        if not _is_groupable_item(item):
            merged.append(item)
            index += 1
            continue

        group = [item]
        previous_number = _image_number(item.get("source") or item.get("name"))
        cursor = index + 1
        while cursor < len(items) and len(group) < 4:
            candidate = items[cursor]
            candidate_number = _image_number(candidate.get("source") or candidate.get("name"))
            same_file = candidate.get("filename") == item.get("filename")
            near_number = previous_number is not None and candidate_number is not None and 0 < candidate_number - previous_number <= 2
            if not (same_file and near_number and _is_groupable_item(candidate)):
                break
            group.append(candidate)
            previous_number = candidate_number
            cursor += 1

        if len(group) >= 2:
            combined = _combine_group(group)
            merged.append(combined or item)
            index += len(group)
        else:
            merged.append(item)
            index += 1
    return merged


def _llm_image_summary(items: list[dict], api_key: str | None) -> tuple[str, bool, str | None]:
    resolved_key = (api_key or settings.openai_api_key or "").strip()
    if not resolved_key or not items:
        return "", False, None
    try:
        client = make_openai_client(resolved_key, OPENAI_STRUCTURED_TIMEOUT_SECONDS)
        content = [
            {
                "type": "text",
                "text": (
                    "업로드 문서에서 추출된 이미지 후보를 한국어로 짧게 점검해줘. "
                    "장식성 이미지, 화살표, 실제 도표/그림 후보를 구분하고, 사용자가 봐야 할 후보만 3줄 이내로 말해."
                ),
            }
        ]
        for item in items[:4]:
            if item.get("dataUrl"):
                content.append({"type": "image_url", "image_url": {"url": item["dataUrl"]}})
        if len(content) == 1:
            return "", False, None
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": content}],
            temperature=0.1,
            max_tokens=260,
        )
        message = (response.choices[0].message.content or "").strip()
        return message, bool(message), None
    except Exception as exc:
        return "", False, openai_error_message(exc)


def create_image_visual(extracted_docs: list[dict], analysis_text: str, openai_api_key: str | None = None) -> dict:
    asset = base_asset("image", "이미지 파일 추출", analysis_text)
    extracted_items = []

    for doc in extracted_docs or []:
        filename = doc.get("filename", "문서")
        for visual in doc.get("visual_assets", []) or []:
            item = {
                "id": visual.get("id") or f"{filename}-{len(extracted_items) + 1}",
                "filename": filename,
                "kind": visual.get("kind") or "image",
                "name": visual.get("name") or visual.get("source_label") or f"추출 항목 {len(extracted_items) + 1}",
                "source": visual.get("source_label") or filename,
                "width": visual.get("width"),
                "height": visual.get("height"),
                "mimeType": visual.get("mime_type"),
                "ocrText": visual.get("ocr_text") or "",
                "tableText": visual.get("table_text") or "",
                "previewText": clean_line(visual.get("text", "")),
                "dataUrl": visual.get("data_url"),
            }
            extracted_items.append(item)

    extracted_items = _merge_related_image_items(extracted_items)
    llm_summary, llm_used, llm_error = _llm_image_summary(extracted_items, openai_api_key)

    rows = [
        {
            "source": item["source"],
            "kind": item["kind"],
            "name": item["name"],
            "summary": item["tableText"] or item["ocrText"] or item["previewText"] or "이미지/차트 후보",
        }
        for item in extracted_items
    ]

    asset.update(
        {
            "type": "image",
            "text": (
                f"문서에서 이미지 후보 {len(extracted_items)}개를 추출했습니다."
                if extracted_items
                else "추출 가능한 이미지 후보를 찾지 못했습니다. 문서 내부 이미지가 너무 작거나 빈 이미지로 판단되면 제외됩니다."
            ),
            "desc": llm_summary or "업로드 이미지와 문서 내부 이미지 후보를 멀티모달 분석 대상으로 정리합니다. 빈 공간과 장식 이미지는 제외합니다.",
            "llm_used": llm_used,
            "provider": "openai" if llm_used else None,
            "llm_error": llm_error,
            "items": extracted_items,
            "rows": rows,
            "data": rows,
            "columns": [
                {"key": "source", "label": "출처"},
                {"key": "kind", "label": "유형"},
                {"key": "name", "label": "이름"},
                {"key": "summary", "label": "추출 내용"},
            ],
            "details": [
                {
                    "lbl": item["source"],
                    "val": item["tableText"] or item["ocrText"] or item["previewText"] or item["name"],
                }
                for item in extracted_items[:8]
            ],
        }
    )
    return asset
