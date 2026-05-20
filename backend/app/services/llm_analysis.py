import os


# 이 파일이 실제 "AI 모델 호출"을 담당합니다.
# 현재 직접 로컬 LLM을 돌리는 구조가 아니라, OpenAI Python SDK로 OpenAI API에 요청합니다.
# 환경변수 OPENAI_API_KEY가 있어야 작동하고, 없으면 None을 반환해서 기본 분석으로 대체됩니다.
# 기본 모델은 OPENAI_MODEL 환경변수가 없을 때 "gpt-4.1-mini"를 사용하도록 되어 있습니다.

MAX_CONTEXT_CHARS = 18000


# LLM에 너무 긴 문서를 한 번에 보내면 비용/토큰 문제가 생깁니다.
# 그래서 전체 문서 컨텍스트와 각 문서 본문을 일정 길이로 잘라 보냅니다.
def _clip(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[문서가 길어 일부만 분석에 사용되었습니다.]"


# 여러 업로드 문서를 LLM이 읽기 좋은 하나의 텍스트 블록으로 합칩니다.
# document_analysis.py가 추출한 filename/format/text를 여기서 프롬프트 재료로 만듭니다.
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


# OpenAI API를 호출해 논문/문서 분석 답변을 생성합니다.
# 반환값:
# - 성공: {"answer": "...", "llm_used": True, "model": "..."}
# - 실패/키 없음: None
def analyze_with_llm(question: str, extracted_docs: list[dict]) -> dict | None:
    # OPENAI_API_KEY는 운영체제 환경변수입니다.
    # PowerShell 예: $env:OPENAI_API_KEY="sk-..."
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        # openai 패키지의 OpenAI 클라이언트를 동적으로 import합니다.
        # requirements.txt의 openai==2.37.0이 이 기능을 제공합니다.
        from openai import OpenAI
    except ModuleNotFoundError:
        return None

    # 기본값은 gpt-4.1-mini입니다.
    # 다른 모델을 쓰고 싶으면 OPENAI_MODEL 환경변수로 바꿀 수 있습니다.
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    client = OpenAI(api_key=api_key)
    document_context = _build_document_context(extracted_docs)

    # system_prompt는 AI의 역할과 안전한 답변 규칙을 정합니다.
    # 특히 업로드 문서에 없는 내용은 추측하지 말라고 지시합니다.
    system_prompt = (
        "너는 논문과 연구자료를 분석하는 한국어 리서치 어시스턴트다. "
        "업로드된 문서 텍스트만 근거로 답하고, 없는 내용은 추정하지 말고 '문서에서 확인되지 않음'이라고 말한다. "
        "핵심내용, 실험결과, 문서 간 차이점, 중요내용을 구조화해서 작성한다."
    )

    # user_prompt에는 실제 사용자 질문과 추출된 문서 텍스트가 들어갑니다.
    # 이 프롬프트가 OpenAI 모델에 전달되는 주요 입력입니다.
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
        # OpenAI Responses API 호출 지점입니다.
        # temperature=0.2는 창의성보다 일관성과 근거 중심 답변을 우선하게 하는 설정입니다.
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
        # API 키 오류, 네트워크 오류, 모델 오류가 나면 프론트에 에러를 터뜨리지 않고
        # None을 반환해 document_analysis.py의 기본 분석 결과를 사용하게 합니다.
        return None

    if not answer:
        return None

    return {
        "answer": answer,
        "llm_used": True,
        "model": model,
    }
