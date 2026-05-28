# 초보자 안내: OpenAI 또는 Gemini 같은 외부 AI API를 호출해 더 자연스러운 분석 답변을 만드는 서비스입니다.

from app.core.config import settings
from app.services.document_analysis import rank_relevant_chunks



MAX_CONTEXT_CHARS = 18000


def _clip(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[문서가 길어 일부만 분석에 사용되었습니다.]"


def _build_ranked_document_context(question: str, extracted_docs: list[dict]) -> str:
    ranked_chunks = rank_relevant_chunks(question, extracted_docs, 8)
    if ranked_chunks:
        blocks = []
        for index, chunk in enumerate(ranked_chunks, start=1):
            blocks.append(
                "\n".join(
                    [
                        f"[관련 구간 {index}]",
                        f"파일명: {chunk.get('filename', 'unknown')}",
                        f"형식: {chunk.get('format', 'unknown')}",
                        f"구간: {chunk.get('chunk_index')}",
                        f"관련도: {chunk.get('score')}",
                        "본문:",
                        _clip(chunk.get("text", ""), 3000),
                    ]
                )
            )
        return _clip("\n\n".join(blocks))

    blocks = []
    for index, doc in enumerate(extracted_docs, start=1):
        blocks.append(
            "\n".join(
                [
                    f"[문서 {index}]",
                    f"파일명: {doc.get('filename', 'unknown')}",
                    f"형식: {doc.get('format', 'unknown')}",
                    "본문:",
                    _clip(doc.get("text", ""), 6000),
                ]
            )
        )
    return _clip("\n\n".join(blocks))


def _build_prompts(question: str, extracted_docs: list[dict]) -> tuple[str, str]:
    document_context = _build_ranked_document_context(question, extracted_docs)
    system_prompt = (
        "너는 논문과 연구자료를 분석하는 한국어 리서치 어시스턴트다. "
        "업로드된 문서 텍스트만 근거로 답하고, 없는 내용은 추정하지 말고 '문서에서 확인되지 않음'이라고 말한다. "
        "핵심내용, 실험결과, 문서 간 차이점, 중요내용을 구조화해서 작성한다."
    )

    user_prompt = f"""
사용자 질문:
{question or "핵심 내용, 실험 결과, 차이점, 중요 내용을 분석해줘."}

업로드 문서:
{document_context}

아래 형식으로 답변해줘.

1. 핵심 내용 요약
2. 실험 결과 및 수치
3. 문서 간 차이점
4. 중요 내용/인용 후보
5. 추가로 확인해야 할 점
"""
    return system_prompt, user_prompt


def _llm_error(message: str, provider: str, model: str | None = None) -> dict:
    return {
        "answer": "",
        "llm_used": False,
        "provider": provider,
        "model": model,
        "llm_error": message,
    }


def _analyze_with_openai(question: str, extracted_docs: list[dict], api_key: str) -> dict:
    try:
        from openai import OpenAI
    except ModuleNotFoundError:
        return _llm_error("openai 패키지가 설치되어 있지 않습니다.", "openai")

    model = settings.openai_model
    client = OpenAI(api_key=api_key)
    system_prompt, user_prompt = _build_prompts(question, extracted_docs)

    try:
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        answer = response.output_text.strip()
    except Exception as exc:
        return _llm_error(f"OpenAI 호출 실패: {exc}", "openai", model)

    if not answer:
        return _llm_error("OpenAI가 빈 답변을 반환했습니다.", "openai", model)

    return {
        "answer": answer,
        "llm_used": True,
        "model": model,
        "provider": "openai",
    }


def _analyze_with_google(question: str, extracted_docs: list[dict], api_key: str) -> dict:
    try:
        from google import genai
    except ModuleNotFoundError:
        return _llm_error("google-genai 패키지가 설치되어 있지 않습니다.", "google")

    model = settings.gemini_model
    system_prompt, user_prompt = _build_prompts(question, extracted_docs)
    prompt = f"{system_prompt}\n\n{user_prompt}"

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        answer = (getattr(response, "text", "") or "").strip()
    except Exception as exc:
        return _llm_error(f"Gemini 호출 실패: {exc}", "google", model)

    if not answer:
        return _llm_error("Gemini가 빈 답변을 반환했습니다.", "google", model)

    return {
        "answer": answer,
        "llm_used": True,
        "model": model,
        "provider": "google",
    }


def analyze_with_llm(
    question: str,
    extracted_docs: list[dict],
    provider: str = "openai",
    openai_api_key: str | None = None,
    google_api_key: str | None = None,
) -> dict:
    normalized_provider = (provider or "openai").lower()

    if normalized_provider == "google":
        api_key = google_api_key or settings.google_api_key or settings.gemini_api_key
        if not api_key:
            return _llm_error("Google/Gemini API 키가 없어 기본 문서 추출로 응답했습니다.", "google")
        return _analyze_with_google(question, extracted_docs, api_key)

    api_key = openai_api_key or settings.openai_api_key
    if not api_key:
        return _llm_error("OpenAI API 키가 없어 기본 문서 추출로 응답했습니다.", "openai")
    return _analyze_with_openai(question, extracted_docs, api_key)
