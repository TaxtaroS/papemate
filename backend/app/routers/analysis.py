from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.document_analysis import build_analysis_answer, extract_file_text
from ..services.llm_analysis import analyze_with_llm


# /api/analysis 아래의 분석 API를 모아두는 FastAPI Router입니다.
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


# 프론트엔드 Analysis.js의 analysisAPI.chat(question, files)가 호출하는 엔드포인트입니다.
# 요청 형식은 multipart/form-data입니다.
# - question: 사용자가 채팅창에 입력한 질문
# - files: 업로드한 PDF/HWPX/HWP/DOCX/이미지/TXT 파일 목록
@router.post("/chat")
async def analyze_chat(
    question: str = Form(""),
    files: list[UploadFile] = File(default=[]),
):
    if not files:
        raise HTTPException(status_code=400, detail="분석할 파일을 업로드해주세요.")

    extracted_docs = []
    for upload in files:
        # UploadFile은 FastAPI가 제공하는 업로드 파일 객체입니다.
        # await upload.read()로 파일 내용을 bytes 형태로 읽습니다.
        content = await upload.read()

        # 파일 확장자에 따라 PDF/HWPX/DOCX/이미지/TXT 추출기가 선택됩니다.
        # 결과 text는 이후 기본 분석과 LLM 분석의 공통 입력이 됩니다.
        text, file_format = extract_file_text(upload.filename or "unknown", content)
        extracted_docs.append(
            {
                "filename": upload.filename or "unknown",
                "format": file_format,
                "text": text,
            }
        )

    # fallback_answer는 OpenAI 키가 없어도 항상 만들 수 있는 기본 분석입니다.
    # 키워드와 중요 문장 후보를 Python 로직으로 추출합니다.
    fallback_answer = build_analysis_answer(question, extracted_docs)

    # analyze_with_llm은 OPENAI_API_KEY가 있을 때만 OpenAI API를 호출합니다.
    # 키가 없거나 호출 실패 시 None을 반환하고, fallback_answer만 프론트에 보냅니다.
    llm_answer = analyze_with_llm(question, extracted_docs)
    if not llm_answer:
        return {
            **fallback_answer,
            "llm_used": False,
            "model": None,
        }

    # LLM 답변이 성공하면 fallback의 documents/keywords 같은 구조 정보와
    # LLM의 자연어 answer/model 정보를 합쳐서 반환합니다.
    return {
        **fallback_answer,
        **llm_answer,
    }
