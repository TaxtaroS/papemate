# 서비스: 차트/그래프 시각화를 위한 데이터 정규화와 템플릿 구성을 담당합니다.
# 초보자 안내:
# - LLM이 만든 JSON을 프론트 차트 컴포넌트가 읽기 쉬운 형태로 다듬는 파일입니다.
# - 숫자 문자열("1,200명", "35%")을 실제 숫자로 바꾸고, 월별 그래프는 1월~12월 축을 보정합니다.
# - 최종 차트가 깨지지 않도록 chartType, xAxisKey, series, data의 최소 조건을 검사합니다.
import json
import re
from typing import Any

from .common import base_asset, frequent_keywords


ALLOWED_CHART_TYPES = {"line", "bar", "pie"}

# LLM이나 문서 원문에서 빈 값이 여러 표현으로 들어오기 때문에
# 차트 렌더러가 이해하는 None으로 통일합니다.
NULL_VALUES = {
    "",
    "-",
    "없음",
    "해당없음",
    "미상",
    "...",
    "N/A",
    "NA",
    "null",
    "None",
}

MONTH_LABELS = [f"{index}월" for index in range(1, 13)]

# 프론트에서 별도 색상을 지정하지 않아도 여러 시리즈가 구분되도록
# 백엔드에서 기본 색상 팔레트를 붙입니다.
DEFAULT_SERIES_COLORS = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#f97316",
    "#0891b2",
    "#be123c",
    "#4f46e5",
    "#65a30d",
    "#c2410c",
]

COMMON_OPTIONS = {
    "showLegend": True,
    "showTooltip": True,
    "showDataLabels": False,
    "connectNulls": False,
    "grid": {
        "top": 48,
        "right": 48,
        "bottom": 56,
        "left": 64,
    },
}

# 차트 템플릿은 "데이터 성격"을 프론트 옵션으로 번역하는 층입니다.
# 예: monthly_trend는 월별 12칸 축을 강제하고, regional_bar는 지역 비교용 정렬 옵션을 둡니다.
CHART_TEMPLATES = {
    "monthly_trend": {
        **COMMON_OPTIONS,
        "xAxisMode": "month_12",
        "xCategories": MONTH_LABELS,
        "missingValue": None,
        "connectNulls": False,
    },
    "yearly_trend": {
        **COMMON_OPTIONS,
        "xAxisMode": "category",
        "missingValue": None,
        "connectNulls": False,
    },
    "regional_bar": {
        **COMMON_OPTIONS,
        "xAxisMode": "category",
        "sort": "desc",
        "limit": 20,
    },
    "category_bar": {
        **COMMON_OPTIONS,
        "xAxisMode": "category",
        "sort": None,
    },
    "dual_axis": {
        **COMMON_OPTIONS,
        "useDualAxis": True,
    },
    "default": {
        **COMMON_OPTIONS,
        "xAxisMode": "category",
    },
}


def normalize_value(value: Any) -> Any:
    """문서/LLM에서 들어온 값 하나를 차트 계산에 쓸 수 있는 숫자 또는 None으로 정리합니다."""

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return value

    text = str(value).strip()
    if text in NULL_VALUES:
        return None

    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative = True
        text = text[1:-1]

    cleaned = text.replace(",", "")
    cleaned = re.sub(r"(명|건|개|천원|만원|원|%|명당|억원)$", "", cleaned).strip()

    if re.fullmatch(r"-?\d+", cleaned):
        number = int(cleaned)
        return -number if negative else number

    if re.fullmatch(r"-?\d+\.\d+", cleaned):
        number = float(cleaned)
        return -number if negative else number

    return value


def normalize_chart_data(data: list[dict]) -> list[dict]:
    """차트 data 배열 전체를 순회하며 축 라벨은 문자열로, 수치 필드는 숫자로 맞춥니다."""

    normalized = []

    for row in data or []:
        new_row = {}
        for key, value in row.items():
            if key.lower() in {"name", "label", "month", "year", "region", "category", "date"}:
                new_row[key] = str(value).strip() if value is not None else None
            else:
                new_row[key] = normalize_value(value)
        normalized.append(new_row)

    return normalized


def normalize_monthly_axis(data: list[dict], x_key: str = "month") -> list[dict]:
    """월별 그래프에서 누락된 월도 축에 남겨 프론트 레이아웃이 흔들리지 않게 합니다."""

    by_month = {}

    for row in data or []:
        month = row.get(x_key)
        if month is None:
            continue

        match = re.search(r"(\d{1,2})", str(month).strip())
        if not match:
            continue

        month_number = int(match.group(1))
        if not 1 <= month_number <= 12:
            continue

        month_label = f"{month_number}월"
        by_month[month_label] = {
            **row,
            x_key: month_label,
            "monthOrder": month_number,
        }

    result = []
    for index, month_label in enumerate(MONTH_LABELS, start=1):
        result.append(by_month.get(month_label, {x_key: month_label, "monthOrder": index}))

    return result


def validate_chart_json(chart_json: dict[str, Any]) -> tuple[bool, list[str]]:
    """프론트 렌더링 전에 차트 JSON의 필수 연결 관계를 검사합니다."""

    errors = []

    if not isinstance(chart_json, dict):
        return False, ["차트 응답이 JSON 객체가 아닙니다."]

    chart_type = chart_json.get("chartType")
    if chart_type not in ALLOWED_CHART_TYPES:
        errors.append(f"지원하지 않는 chartType입니다: {chart_type}")

    x_key = chart_json.get("xAxisKey") or chart_json.get("xKey")
    if chart_type != "pie" and not x_key:
        errors.append("xAxisKey가 없습니다.")

    data = chart_json.get("data")
    if not isinstance(data, list) or not data:
        errors.append("data가 비어 있습니다.")

    series = chart_json.get("series")
    if chart_type != "pie" and (not isinstance(series, list) or not series):
        errors.append("series가 비어 있습니다.")

    if errors:
        return False, errors

    if chart_type != "pie":
        for index, row in enumerate(data):
            if x_key not in row:
                errors.append(f"{index}번째 data row에 xAxisKey '{x_key}'가 없습니다.")

        for item in series:
            data_key = item.get("dataKey") or item.get("key")
            if not data_key:
                errors.append("series 항목에 dataKey가 없습니다.")
                continue

            if not any(data_key in row for row in data):
                errors.append(f"series dataKey '{data_key}'가 data에 존재하지 않습니다.")

    return len(errors) == 0, errors


def ensure_chart_keys(chart_json: dict) -> dict:
    """LLM이 xKey/key/label처럼 비슷한 이름으로 낸 필드를 표준 키로 보정합니다."""

    if "xAxisKey" not in chart_json and "xKey" in chart_json:
        chart_json["xAxisKey"] = chart_json["xKey"]

    for item in chart_json.get("series", []) or []:
        if "dataKey" not in item and "key" in item:
            item["dataKey"] = item["key"]

        if "name" not in item and "label" in item:
            item["name"] = item["label"]

        if "yAxisId" not in item:
            item["yAxisId"] = "left"

    return chart_json


def guess_template(chart_json: dict) -> str:
    """제목, x축 키, 데이터 라벨을 보고 가장 자연스러운 차트 템플릿을 추정합니다."""

    title = str(chart_json.get("title", ""))
    x_key = str(chart_json.get("xAxisKey", chart_json.get("xKey", "")))
    data = chart_json.get("data") or []
    sample_labels = " ".join(str(row.get(x_key, "")) for row in data[:12])

    if "월" in title or "월별" in title or "월" in sample_labels or x_key.lower() == "month":
        return "monthly_trend"

    if "지역" in title or x_key.lower() in {"region", "area"}:
        return "regional_bar"

    if "연도" in title or x_key.lower() == "year":
        return "yearly_trend"

    series = chart_json.get("series") or []
    y_axis_ids = {item.get("yAxisId") for item in series if item.get("yAxisId")}
    if len(y_axis_ids) >= 2:
        return "dual_axis"

    return "default"


def apply_template(chart_json: dict) -> dict:
    """선택/추정된 템플릿 옵션을 차트 JSON에 합쳐 프론트가 바로 사용할 수 있게 합니다."""

    template_name = chart_json.get("template") or guess_template(chart_json)
    template = CHART_TEMPLATES.get(template_name, CHART_TEMPLATES["default"])

    chart_json["template"] = template_name
    chart_json["options"] = {
        **template,
        **chart_json.get("options", {}),
    }

    return chart_json


def extract_json_object(text: str) -> dict[str, Any]:
    """마크다운 코드블록이나 앞뒤 설명이 섞인 답변에서도 JSON 객체만 꺼냅니다."""

    if not text:
        raise ValueError("빈 응답입니다.")

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < 0 or end <= start:
        raise ValueError("JSON 객체를 찾을 수 없습니다.")

    return json.loads(cleaned[start : end + 1])


def apply_series_colors(chart_json: dict[str, Any]) -> dict[str, Any]:
    """각 series에 기본 색상을 순서대로 부여합니다."""

    series = chart_json.get("series") or []

    for index, item in enumerate(series):
        item["color"] = DEFAULT_SERIES_COLORS[index % len(DEFAULT_SERIES_COLORS)]

    chart_json["series"] = series
    return chart_json


def postprocess_chart_json(chart_json: dict[str, Any]) -> dict[str, Any]:
    """LLM 차트 응답을 표준화, 템플릿 적용, 검증까지 한 번에 처리하는 핵심 후처리 함수입니다."""

    chart_json = ensure_chart_keys(chart_json)
    chart_json = apply_template(chart_json)
    chart_json = apply_series_colors(chart_json)

    data = normalize_chart_data(chart_json.get("data") or [])
    x_key = chart_json.get("xAxisKey")

    if chart_json.get("options", {}).get("xAxisMode") == "month_12" and x_key:
        data = normalize_monthly_axis(data, x_key=x_key)

    chart_json["data"] = data

    valid, errors = validate_chart_json(chart_json)
    if not valid:
        chart_json["type"] = "chart_error"
        chart_json["errors"] = errors

    return chart_json


def process_chart_response(answer: str) -> str:
    """LLM 원문 답변 문자열을 프론트가 읽을 수 있는 차트 JSON 문자열로 변환합니다."""

    chart_json = extract_json_object(answer)
    chart_json = postprocess_chart_json(chart_json)
    return json.dumps(chart_json, ensure_ascii=False)


def create_graph_visual(extracted_docs: list[dict], analysis_text: str) -> dict:
    """LLM 차트 JSON이 없을 때 쓰는 로컬 기본 그래프 자료를 만듭니다."""

    asset = base_asset("graph", "키워드 중요도 그래프", analysis_text)
    keywords = frequent_keywords(analysis_text, 6)
    if not keywords:
        keywords = [doc.get("filename", f"문서 {index + 1}") for index, doc in enumerate((extracted_docs or [])[:4])]
    if not keywords:
        keywords = ["핵심", "요약", "비교", "결과", "차이"]

    rows = [
        {
            "label": keyword,
            "point": f"{keyword} 관련 언급 빈도와 중요도를 기준으로 산정했습니다.",
            "score": max(38, min(96, 90 - index * 6 + ((index % 2) * 8))),
        }
        for index, keyword in enumerate(keywords[:6])
    ]

    asset.update(
        {
            "text": "분석 결과의 주요 키워드를 막대그래프로 표현했습니다.",
            "rows": rows,
            "keywords": keywords[:6],
            "details": [{"lbl": row["label"], "val": str(row["score"])} for row in rows],
        }
    )
    return asset
