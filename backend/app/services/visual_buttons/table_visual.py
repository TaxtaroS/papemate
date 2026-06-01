# 초보자 안내: 분석 내용을 행과 열이 있는 표 데이터로 바꾸는 파일입니다.

from .common import base_asset, meaningful_lines


def create_table_visual(extracted_docs: list[dict], analysis_text: str) -> dict:
    asset = base_asset("table", "문서 핵심 비교 표", analysis_text)
    lines = meaningful_lines(analysis_text, 6)
    rows = []
    docs = extracted_docs or [{"filename": "분석 결과", "format": "TEXT"}]
    row_count = max(4, min(6, len(docs) + max(0, len(lines) - 1)))

    for index in range(row_count):
        doc = docs[index % len(docs)]
        rows.append(
            {
                "label": doc.get("filename", f"문서 {index + 1}"),
                "point": lines[index] if index < len(lines) else (lines[0] if lines else "핵심 내용 후보"),
                "score": max(40, min(96, 88 - index * 7 + ((index % 2) * 9))),
            }
        )

    asset.update(
        {
            "text": "업로드 문서별 핵심 내용과 수치 후보를 표 형태로 정리했습니다.",
            "rows": rows[:6],
            "details": [{"lbl": row["label"], "val": row["point"]} for row in rows[:6]],
        }
    )
    return asset
