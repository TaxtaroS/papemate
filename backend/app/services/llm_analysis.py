import os


MAX_CONTEXT_CHARS = 18000


def _clip(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[문서가 길어 일부만 분석에 사용되었습니다.]"


def _build_document_context(extracted_docs: list[dict]) -> str:
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


def analyze_with_llm(
    question: str,
    extracted_docs: list[dict],
    api_key_override: str | None = None,
) -> dict | None:
    api_key = api_key_override or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except ModuleNotFoundError:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    client = OpenAI(api_key=api_key)
    document_context = _build_document_context(extracted_docs)

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
    except Exception:
        return None

    if not answer:
        return None

    return {
        "answer": answer,
        "llm_used": True,
        "model": model,
    }
