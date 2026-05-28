# 초보자 안내: 분석 결과를 표, 그래프, 마인드맵, 이미지 설명 형태로 바꾸는 API 라우터입니다.

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.document_analysis import build_analysis_answer, extract_file_text
from app.services.visual_buttons import VISUAL_CREATORS
from models.schemas import VisualResponse


router = APIRouter(prefix="/api/visuals", tags=["visuals"])


@router.post("/{visual_type}", response_model=VisualResponse)
async def create_visual(
    visual_type: str,
    analysis_text: str = Form(""),
    files: list[UploadFile] = File(default=[]),
):
    """분석 페이지의 표/그래프/이미지/마인드맵 버튼이 호출하는 생성 API입니다."""
    creator = VISUAL_CREATORS.get(visual_type)
    if not creator:
        raise HTTPException(status_code=404, detail="지원하지 않는 시각화 유형입니다.")

    extracted_docs = []
    for upload in files:
        content = await upload.read()
        try:
            text, file_format = extract_file_text(upload.filename or "unknown", content)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"{upload.filename or '파일'} 분석 중 오류가 발생했습니다: {exc}") from exc

        extracted_docs.append(
            {
                "filename": upload.filename or "unknown",
                "format": file_format,
                "text": text,
            }
        )

    source_text = analysis_text.strip()
    if not source_text and extracted_docs:
        source_text = build_analysis_answer("시각화 자료로 정리해줘", extracted_docs)["answer"]
    if not source_text:
        source_text = "업로드 문서 또는 분석 답변이 없어 기본 시각화 예시를 생성합니다."

    # 1. 파이썬 임시 로직으로 기본 틀 생성
    base_visual = creator(extracted_docs, source_text)

    # 2. OpenAI를 연동하여 실제 문서 데이터 추출
    if extracted_docs or source_text:
        from app.services.llm_analysis import analyze_with_llm
        import json
        
        prompt = f"""
다음 내용을 분석하여 '{visual_type}' 형태의 시각화에 적합한 핵심 데이터 5~8개를 추출하고, 반드시 아래 JSON 형식으로만 응답해줘.
내용: {source_text[:3000]}
응답형식: {{"rows": [{{"label": "항목이름(짧은단어)", "point": "핵심수치나 세부내용", "score": 80}}]}}
점수(score)는 중요도에 따라 0에서 100 사이의 숫자로 매겨줘. Markdown 코드블록 없이 순수 JSON 텍스트만 출력할 것.
"""
        llm_result = analyze_with_llm(prompt, extracted_docs)
        if llm_result.get("llm_used"):
            try:
                raw_answer = llm_result["answer"].strip()
                if raw_answer.startswith("```"):
                    raw_answer = raw_answer.split("```")[1]
                    if raw_answer.startswith("json"):
                        raw_answer = raw_answer[4:].strip()
                
                parsed = json.loads(raw_answer)
                if "rows" in parsed and isinstance(parsed["rows"], list):
                    base_visual["rows"] = parsed["rows"]
                    base_visual["details"] = [{"lbl": r.get("label", ""), "val": r.get("point", "")} for r in parsed["rows"]]
                    base_visual["text"] = f"OpenAI가 문서를 분석하여 실제 데이터 기반으로 {visual_type} 자료를 생성했습니다."
            except Exception:
                pass # 파싱 실패 시 기본 틀 유지

    return {"visual": base_visual}
