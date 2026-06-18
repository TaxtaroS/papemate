# 초보자 안내: 문서 파일 업로드와 분석 요청을 처리하는 API 라우터입니다.

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.uploads import read_upload_content, validate_upload_count
from ..services.analysis_pipeline import run_analysis_pipeline
from ..services.document_processing import extract_file_document
from models.schemas import AnalysisResponse


# /api/analysis 아래의 분석 API를 모아두는 FastAPI Router입니다.
router = APIRouter(prefix="/api/analysis", tags=["analysis"])

DOCUMENT_SESSION_CACHE: dict[str, list[dict]] = {}
logger = logging.getLogger(__name__)


def _normalize_name(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _is_truthy(value: str) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


def _filter_selected_docs(docs: list[dict], selected_source_name: str, compare_mode: bool) -> list[dict]:
    if compare_mode or not selected_source_name:
        return docs

    selected = _normalize_name(selected_source_name)
    matched = [
        doc for doc in docs
        if _normalize_name(doc.get("filename", "")) == selected
    ]
    if not matched:
        logger.warning(
            "Selected source document was not found; refusing to fall back to first document. selected=%r available=%r",
            selected_source_name,
            [doc.get("filename", "") for doc in docs],
        )
    return matched


def _merge_cached_docs(existing_docs: list[dict], new_docs: list[dict]) -> list[dict]:
    merged = list(existing_docs or [])
    for doc in new_docs or []:
        filename = _normalize_name(doc.get("filename", ""))
        if not filename:
            merged.append(doc)
            continue
        replaced = False
        for index, existing in enumerate(merged):
            if _normalize_name(existing.get("filename", "")) == filename:
                merged[index] = doc
                replaced = True
                break
        if not replaced:
            merged.append(doc)
    return merged


# 프론트엔드 Analysis.js의 analysisAPI.chat(question, files)가 호출하는 엔드포인트입니다.
# 요청 형식은 multipart/form-data입니다.
# - question: 사용자가 채팅창에 입력한 질문
# - files: 업로드한 PDF/HWPX/HWP/DOCX/이미지/TXT 파일 목록
@router.post("/chat", response_model=AnalysisResponse)
async def analyze_chat(
    question: str = Form(""),
    conversation_id: str = Form(""),
    llm_provider: str = Form("auto"),
    openai_api_key: str = Form(""),
    google_api_key: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    analysis_text: str = Form(""),
    selected_source_name: str = Form(""),
    compare_mode: str = Form("false"),
):
    analysis_text = analysis_text.strip()
    session_key = conversation_id.strip()
    should_compare = _is_truthy(compare_mode)
    if files:
        validate_upload_count(files)
        extracted_docs = []
    elif session_key and session_key in DOCUMENT_SESSION_CACHE:
        extracted_docs = _filter_selected_docs(
            DOCUMENT_SESSION_CACHE[session_key],
            selected_source_name,
            should_compare,
        )
    elif analysis_text:
        extracted_docs = []
    else:
        extracted_docs = []

    for upload in files:
        # UploadFile은 FastAPI가 제공하는 업로드 파일 객체입니다.
        # await upload.read()로 파일 내용을 bytes 형태로 읽습니다.
        content = await read_upload_content(upload)

        # 파일 확장자에 따라 PDF/HWPX/DOCX/이미지/TXT 추출기가 선택됩니다.
        # 결과 text는 이후 기본 분석과 LLM 분석의 공통 입력이 됩니다.
        try:
            extracted_doc = extract_file_document(upload.filename or "unknown", content)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"{upload.filename or '파일'} 분석 중 오류가 발생했습니다: {exc}") from exc

        extracted_docs.append(extracted_doc)

    # fallback_answer는 OpenAI 키가 없어도 항상 만들 수 있는 기본 분석입니다.
    # 키워드와 중요 문장 후보를 Python 로직으로 추출합니다.
    if files and session_key and extracted_docs:
        DOCUMENT_SESSION_CACHE[session_key] = _merge_cached_docs(
            DOCUMENT_SESSION_CACHE.get(session_key, []),
            extracted_docs,
        )
        extracted_docs = _filter_selected_docs(extracted_docs, selected_source_name, should_compare)

    return run_analysis_pipeline(
        question=question,
        extracted_docs=extracted_docs,
        uploaded_filenames=[upload.filename or "파일" for upload in files],
        llm_provider=llm_provider,
        openai_api_key=openai_api_key.strip() or None,
        google_api_key=google_api_key.strip() or None,
        analysis_text=analysis_text,
    )

@router.post("/title")
async def generate_title(
    question: str = Form(""),
    llm_provider: str = Form("auto"),
    openai_api_key: str = Form(""),
    google_api_key: str = Form(""),
    analysis_text: str = Form("")
):
    selected_provider = (llm_provider or "auto").strip().lower()
    if selected_provider not in {"auto", "gemini", "google", "openai"}:
        selected_provider = "auto"
    
    from ..services.llm.title_generator import generate_chat_title
    
    title = generate_chat_title(
        question,
        provider=selected_provider,
        openai_api_key=openai_api_key.strip() or None,
        google_api_key=google_api_key.strip() or None,
        analysis_text=analysis_text.strip()
    )
    
    return {"title": title}
