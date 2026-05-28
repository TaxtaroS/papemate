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


def _build_prompts(question: str, extracted_docs: list[dict], analysis_text: str = "") -> tuple[str, str]:
    document_context = _build_ranked_document_context(question, extracted_docs)
    if not document_context and analysis_text:
        document_context = f"[이전 분석 요약 내용]\n{analysis_text}"
        
    system_prompt = (
        "당신은 논문, 비즈니스 문서, 보고서 등 다양한 문서의 분석 및 협업을 돕는 최고 수준의 AI 연구 어시스턴트 'PaperMate'입니다.\n\n"
        "[기본 원칙]\n"
        "1. 철저한 근거 기반: 사용자가 제공한 문서(Context)나 이전 분석 요약 내용 내에서만 답변하십시오. 외부 지식이나 환각(Hallucination)을 섞지 마십시오.\n"
        "2. 명확한 출처: 사실이나 수치를 인용할 때는 항상 문장 끝에 [파일명]을 기재하십시오.\n"
        "3. 전문적인 톤앤매너: 객관적이고 전문적이지만, 누구나 이해하기 쉬운 설명 방식을 채택하십시오.\n"
        "4. 가독성 극대화: 긴 답변은 마크다운(Markdown), 굵은 글씨, 불릿 포인트를 활용하여 구조화하십시오.\n\n"
        "[기능적 지시사항]\n"
        "- 요약 요청 시: 업로드된 문서의 성격(학술 논문, 비즈니스 보고서, 회의록, 기사 등)을 파악하여 가장 적합한 3~4개의 핵심 항목으로 구조화하여 요약하십시오.\n"
        "  각 항목 앞에는 내용에 어울리는 직관적인 이모지를 붙이십시오.\n"
        "- 다중 문서 비교 요청 시: 문서 간의 공통점과 차이점을 대조하여 명확히 비교하십시오.\n"
        "- 표(Table) 시각화 데이터 요청 시: 고정된 형식(예: 단순 '제목/내용' 요약)에 얽매이지 말고, 데이터의 성격(성능 비교, 시계열, 개념 분류 등)을 파악하여 가장 직관적으로 읽힐 수 있는 최적의 표 구조(Column)를 스스로 기획하십시오.\n"
        "  반드시 부연 설명 없이 JSON 배열(Array of Objects) 형식으로만 응답해야 하며, Key 이름은 영문이나 한글로 명확히 지정하십시오.\n"
        "  (예: 성능 비교일 경우 [{\"모델\": \"A\", \"정확도\": \"95%\", \"속도\": \"빠름\"}], 개념 정리일 경우 [{\"개념명\": \"X\", \"작동 원리\": \"...\"}])\n\n"
        "응답의 제일 마지막 줄에는 항상 '===SUGGESTED_QUESTIONS===' 이라는 구분선을 넣고, "
        "그 아래에 사용자가 이어서 질문하면 좋을 만한 추천 질문을 2~3개 작성하십시오.\n\n"
        "[추천 질문 작성 시 엄격한 규칙]\n"
        "- 🚨 1순위 규칙: **당신(AI)이 스스로 생각했을 때 제공된 문서(Context)만으로 100% 완벽하게 답변할 수 있는 질문**만 생성하십시오.\n"
        "- 🚨 2순위 규칙: 만약 사용자의 질문에 대해 '문서에서 찾을 수 없다'고 답변했다면, 그 찾을 수 없는 내용과 관련된 꼬리물기 질문은 **절대** 생성하지 마십시오. 대신 문서 내에서 확실히 답할 수 있는 완전히 다른 주제의 흥미로운 질문을 제안하십시오.\n"
        "- 문서에 없는 내용, 단순한 추측, 외부 지식이 필요한 질문은 무조건 배제하십시오.\n"
        "- 추천 질문 예시: '제공된 문서에 등장하는 A 모델과 B 모델의 성능 차이를 표로 비교해 줄래?', "
        "'이 문서에서 제안하는 3가지 해결 방안은 무엇인가요?'"
    )

    if question and question.strip():
        user_prompt = f"""
업로드 문서 내용:
{document_context}

사용자 요청:
{question}

위 사용자 요청에 맞게 문서 내용을 바탕으로 답변을 작성해줘. 사용자가 표, 그래프 데이터, 요약 등 특정 형식을 요구했다면 그 형식에 맞춰서 제공해줘.
"""
    else:
        user_prompt = f"""
업로드 문서 내용:
{document_context}

문서의 전반적인 내용을 아래 형식에 맞춰서 꼼꼼하게 분석해줘.

1. 핵심 내용 요약
2. 실험 결과 및 수치
3. 문서 간 차이점 (여러 문서일 경우)
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


def _parse_suggested_questions(answer: str) -> tuple[str, list[str]]:
    parts = answer.split("===SUGGESTED_QUESTIONS===")
    main_answer = parts[0].strip()
    questions = []
    if len(parts) > 1:
        raw_qs = parts[1].strip().split("\n")
        for q in raw_qs:
            cleaned = q.strip().lstrip("-").lstrip("*").lstrip("0123456789. ").strip()
            if cleaned:
                questions.append(cleaned)
    return main_answer, questions


def _analyze_with_openai(question: str, extracted_docs: list[dict], api_key: str, analysis_text: str = "") -> dict:
    try:
        from openai import OpenAI
    except ModuleNotFoundError:
        return _llm_error("openai 패키지가 설치되어 있지 않습니다.", "openai")

    model = settings.openai_model
    client = OpenAI(api_key=api_key)
    system_prompt, user_prompt = _build_prompts(question, extracted_docs, analysis_text)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as exc:
        return _llm_error(f"OpenAI 호출 실패: {exc}", "openai", model)

    if not answer:
        return _llm_error("OpenAI가 빈 답변을 반환했습니다.", "openai", model)

    main_answer, questions = _parse_suggested_questions(answer)

    return {
        "answer": main_answer,
        "suggested_questions": questions,
        "llm_used": True,
        "model": model,
        "provider": "openai",
    }


def _analyze_with_google(question: str, extracted_docs: list[dict], api_key: str, analysis_text: str = "") -> dict:
    try:
        from google import genai
    except ModuleNotFoundError:
        return _llm_error("google-genai 패키지가 설치되어 있지 않습니다.", "google")

    model = settings.gemini_model
    system_prompt, user_prompt = _build_prompts(question, extracted_docs, analysis_text)
    prompt = f"{system_prompt}\n\n{user_prompt}"

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        answer = (getattr(response, "text", "") or "").strip()
    except Exception as exc:
        return _llm_error(f"Gemini 호출 실패: {exc}", "google", model)

    if not answer:
        return _llm_error("Gemini가 빈 답변을 반환했습니다.", "google", model)

    main_answer, questions = _parse_suggested_questions(answer)

    return {
        "answer": main_answer,
        "suggested_questions": questions,
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
    analysis_text: str = "",
) -> dict:
    normalized_provider = (provider or "openai").lower()

    if normalized_provider == "google":
        api_key = google_api_key or settings.google_api_key or settings.gemini_api_key
        if not api_key:
            return _llm_error("Google/Gemini API 키가 없어 기본 문서 추출로 응답했습니다.", "google")
        return _analyze_with_google(question, extracted_docs, api_key, analysis_text)

    api_key = openai_api_key or settings.openai_api_key
    if not api_key:
        return _llm_error("OpenAI API 키가 없어 기본 문서 추출로 응답했습니다.", "openai")
    return _analyze_with_openai(question, extracted_docs, api_key, analysis_text)
