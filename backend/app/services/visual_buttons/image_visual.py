# 초보자 안내: 분석 내용을 카드형 이미지 설명 데이터로 바꾸는 파일입니다.

from .common import base_asset, frequent_keywords, meaningful_lines


def create_image_visual(extracted_docs: list[dict], analysis_text: str) -> dict:
    asset = base_asset("image", "분석 요약 이미지", analysis_text)
    lines = meaningful_lines(analysis_text, 4)
    keywords = frequent_keywords(analysis_text, 6)

    asset.update(
        {
            "text": "분석 내용을 발표용 요약 이미지 카드 형태로 구성했습니다.",
            "keywords": keywords or ["핵심", "비교", "결과"],
            "branches": lines[:4],
            "details": [{"lbl": f"요약 {index + 1}", "val": line} for index, line in enumerate(lines[:4])],
        }
    )
    return asset
