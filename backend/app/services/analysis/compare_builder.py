"""Build user-facing comparison answers for two uploaded documents."""

from __future__ import annotations

import re

from app.services.analysis.document_compare import (
    FIELD_LABELS,
    compare_result_to_dict,
    extract_compare_result,
)
from app.services.analysis.experiment_detection import has_experiment_results
from app.services.paper_compare.experiment_chart import build_experiment_metric_chart
from app.services.paper_compare.result_aligner import build_experiment_comparison


def build_document_compare_answer(question: str, extracted_docs: list[dict]) -> dict | None:
    compare_docs = [doc for doc in extracted_docs or [] if str(doc.get("text", "")).strip()]
    if len(compare_docs) < 2:
        return None

    document_items = [
        {
            "doc": doc,
            "name": _display_name(doc, f"문서 {index}"),
            "info": compare_result_to_dict(extract_compare_result(doc)),
        }
        for index, doc in enumerate(compare_docs, start=1)
    ]
    combined_text = "\n".join(
        str(doc.get("text") or doc.get("content") or "")
        for doc in compare_docs
    )
    include_experiment = has_experiment_results(combined_text)

    comparison_table = [
        {
            "항목": FIELD_LABELS[key],
            **{
                item["name"]: item["info"][key]
                for item in document_items
            },
        }
        for key in ("topic", "purpose", "data_source", "methodology", "findings", "limitations")
    ]
    experiment_comparison = build_experiment_comparison(compare_docs) if include_experiment else None
    experiment_chart = build_experiment_metric_chart(experiment_comparison) if experiment_comparison else None
    experiment_lines = _experiment_section(experiment_comparison, 4)
    time_series_comparison = _build_cpi_comparison(compare_docs)
    time_series_lines = _time_series_section(time_series_comparison)
    final_summary_number = 5 if experiment_comparison else 4

    answer = "\n".join(
        [
            f"요청하신 {len(document_items)}개 문서를 기준 항목별로 비교했습니다.",
            "",
            "## 1. 비교표",
            *time_series_lines,
            "| 항목 | " + " | ".join(item["name"] for item in document_items) + " |",
            "|---|" + "|".join("---" for _ in document_items) + "|",
            *[
                "| "
                + " | ".join(
                    [_escape_cell(row["항목"])]
                    + [_escape_cell(row.get(item["name"], "")) for item in document_items]
                )
                + " |"
                for row in comparison_table
            ],
            "",
            "## 2. 공통점",
            *[f"- {point}" for point in _common_points_many(document_items)],
            "",
            "## 3. 차이점",
            *[f"- {point}" for point in _differences_many(document_items)],
            *experiment_lines,
            "",
            f"## {final_summary_number}. 최종 요약",
            *[
                f"- {item['name']}는 {item['info']['topic']} 관점의 문서로 정리됩니다."
                for item in document_items
            ],
        ]
    )

    return {
        "answer": answer,
        "comparison_table": comparison_table,
        "time_series_comparison_table": time_series_comparison,
        "experiment_comparison_table": experiment_comparison.get("rows", []) if experiment_comparison else [],
        "experiment_chart": experiment_chart,
        "compare": {
            "document_a": document_items[0]["info"],
            "document_b": document_items[1]["info"],
            "documents": [
                {"filename": item["name"], **item["info"]}
                for item in document_items
            ],
        },
        "suggested_questions": [
            "두 문서의 차이점을 더 자세히 설명해줘",
            "두 문서 중 발표에 더 적합한 문서를 골라줘",
            "비교 결과를 표로 더 간단하게 정리해줘",
        ],
    }


def _display_name(doc: dict, fallback: str) -> str:
    filename = str(doc.get("filename") or doc.get("source_name") or "").strip()
    return filename or fallback


def _escape_cell(value: str) -> str:
    return str(value or "").replace("|", "\\|").replace("\n", " ").strip()


def _common_points(info_a: dict[str, str], info_b: dict[str, str]) -> list[str]:
    points = []
    if _has_value(info_a["methodology"]) and _has_value(info_b["methodology"]):
        points.append("두 문서 모두 특정 자료를 바탕으로 분석 결과를 도출합니다.")
    if _has_value(info_a["data_source"]) and _has_value(info_b["data_source"]):
        points.append("두 문서 모두 사용 데이터와 근거 자료가 비교의 핵심입니다.")
    if _has_value(info_a["findings"]) and _has_value(info_b["findings"]):
        points.append("두 문서 모두 주요 결과 또는 결론을 제시합니다.")
    while len(points) < 3:
        points.append("두 문서 모두 업로드된 본문 내용 안에서 확인 가능한 항목을 기준으로 비교할 수 있습니다.")
    return points[:3]


def _differences(info_a: dict[str, str], info_b: dict[str, str], name_a: str, name_b: str) -> list[str]:
    return [
        f"주제는 {name_a}가 '{info_a['topic']}', {name_b}가 '{info_b['topic']}'로 정리됩니다.",
        f"연구 목적은 {name_a}가 '{info_a['purpose']}', {name_b}가 '{info_b['purpose']}'로 다릅니다.",
        f"분석 방법은 {name_a}가 '{info_a['methodology']}', {name_b}가 '{info_b['methodology']}'로 비교됩니다.",
    ]


def _common_points_many(document_items: list[dict]) -> list[str]:
    points = []
    if all(_has_value(item["info"]["methodology"]) for item in document_items):
        points.append("모든 문서가 특정 분석 방법이나 연구 절차를 제시합니다.")
    if all(_has_value(item["info"]["data_source"]) for item in document_items):
        points.append("모든 문서에서 사용 데이터 또는 근거 자료를 확인할 수 있습니다.")
    if all(_has_value(item["info"]["findings"]) for item in document_items):
        points.append("모든 문서가 주요 결과 또는 결론을 제시합니다.")
    while len(points) < 3:
        points.append("모든 문서를 동일한 비교 항목으로 나란히 검토할 수 있습니다.")
    return points[:3]


def _differences_many(document_items: list[dict]) -> list[str]:
    lines = []
    for item in document_items:
        info = item["info"]
        lines.append(
            f"{item['name']}: 주제는 '{info['topic']}', 연구 목적은 '{info['purpose']}', "
            f"분석 방법은 '{info['methodology']}'로 정리됩니다."
        )
    return lines


def _has_value(value: str) -> bool:
    return bool(value and "명확히 찾지 못했습니다" not in value)


def _experiment_section(experiment_comparison: dict | None, section_number: int) -> list[str]:
    rows = (experiment_comparison or {}).get("rows") or []
    if not rows:
        return []

    columns = ["논문", "데이터셋", "모델"]
    metric_columns = [
        column
        for column in rows[0].keys()
        if column not in {"논문", "데이터셋", "모델", "특징"}
    ]
    columns.extend(metric_columns)
    columns.append("특징")

    return [
        "",
        f"## {section_number}. 실험 결과 비교",
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
        *[
            "| " + " | ".join(_escape_cell(row.get(column, "")) for column in columns) + " |"
            for row in rows
        ],
    ]


def _build_cpi_comparison(docs: list[dict]) -> list[dict]:
    rows = []
    for doc in docs:
        filename = str(doc.get("filename") or "")
        text = str(doc.get("text") or "")
        if "소비자물가" not in f"{filename} {text}":
            continue

        rows.append(
            {
                "항목": _month_label(filename, text),
                "소비자물가지수": _extract_indicator(text, ("소비자물가지수", "소비자 물가 지수")),
                "전월대비": _extract_indicator(text, ("전월대비", "전월 대비"), suffix="%"),
                "전년동월대비": _extract_indicator(text, ("전년동월대비", "전년 동월 대비"), suffix="%"),
            }
        )

    return rows if len(rows) >= 2 else []


def _month_label(filename: str, text: str) -> str:
    source = f"{filename} {text}"
    match = re.search(r"(20\d{2})\D{0,4}(\d{1,2})\s*월", source)
    if match:
        return f"{match.group(1)}년 {int(match.group(2))}월"
    match = re.search(r"(\d{1,2})\s*월", source)
    if match:
        return f"{int(match.group(1))}월"
    return filename or "문서"


def _extract_indicator(text: str, labels: tuple[str, ...], suffix: str = "") -> str:
    compact = re.sub(r"\s+", " ", str(text or ""))
    for label in labels:
        pattern = rf"{re.escape(label)}[^0-9+\-.%]{{0,40}}([+-]?\d+(?:\.\d+)?)\s*{re.escape(suffix)}?"
        match = re.search(pattern, compact)
        if match:
            value = match.group(1)
            return f"{value}{suffix}" if suffix and not value.endswith(suffix) else value
    return "문서에서 확인 필요"


def _time_series_section(rows: list[dict]) -> list[str]:
    if not rows:
        return []

    columns = ["항목", "소비자물가지수", "전월대비", "전년동월대비"]
    return [
        "",
        "### 월별 소비자물가 비교표",
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
        *[
            "| " + " | ".join(_escape_cell(row.get(column, "")) for column in columns) + " |"
            for row in rows
        ],
    ]
