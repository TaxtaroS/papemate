# 초보자 안내: OpenAI 또는 Gemini 같은 외부 AI API를 호출해 더 자연스러운 분석 답변을 만드는 서비스입니다.

import os

from ..core.config import settings



MAX_CONTEXT_CHARS = 400000


def _clip(text: str, limit: int = MAX_CONTEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[문서가 길어 일부만 분석에 사용되었습니다.]"


def _build_relevant_chunk_context(relevant_chunks: list[dict] | None = None) -> str:
    chunks = relevant_chunks or []
    if not chunks:
        return ""

    lines = ["[질문 관련 근거 구간]"]
    for index, chunk in enumerate(chunks[:6], start=1):
        filename = chunk.get("filename", "unknown")
        source_label = chunk.get("source_label") or f"Chunk {chunk.get('chunk_index', index)}"
        score = chunk.get("score", "")
        text = _clip(str(chunk.get("text", "")), 1200)
        lines.append(f"{index}. {filename} / {source_label} / score={score}\n{text}")
    return "\n\n".join(lines)


def _build_ranked_document_context(
    question: str,
    extracted_docs: list[dict],
    relevant_chunks: list[dict] | None = None,
) -> str:
    blocks = []
    for index, doc in enumerate(extracted_docs, start=1):
        blocks.append(
            "\n".join(
                [
                    f"[문서 {index}]",
                    f"파일명: {doc.get('filename', 'unknown')}",
                    f"형식: {doc.get('format', 'unknown')}",
                    "본문:",
                    _clip(doc.get("text", ""), MAX_CONTEXT_CHARS),
                ]
            )
        )
    return _clip("\n\n".join(blocks))


def _is_visual_request(question: str) -> bool:
    visual_keywords = (
        "표",
        "테이블",
        "그래프",
        "차트",
        "시각화",
        "막대",
        "선형",
        "선 그래프",
        "꺾은선",
        "원형",
        "파이",
        "비교표",
        "json",
        "visual",
        "chart",
        "table",
        "graph",
    )
    lowered = (question or "").lower()
    if any(keyword in (question or "") for keyword in ("표", "테이블", "그래프", "차트", "시각화", "막대", "선 그래프", "꺾은선", "원형")):
        return True
    return any(keyword in lowered for keyword in visual_keywords)


def _build_prompts(
    question: str,
    extracted_docs: list[dict],
    analysis_text: str = "",
    relevant_chunks: list[dict] | None = None,
) -> tuple[str, str]:
    document_context = _build_ranked_document_context(question, extracted_docs, relevant_chunks)

    core_prompt = (
        "You are 'PaperMate', a top-tier AI research assistant designed to help users analyze and visualize various documents, including academic papers, business reports, and proposals.\n\n"
        "[Core Principles]\n"
        "1. Strict Grounding: You MUST base your answers SOLELY on the provided document (Context). Zero hallucination. Do not use external knowledge.\n"
        "2. Citation: Always append the precise source at the end of sentences when citing facts or numbers. For PDFs, cite only the provided source label like [File Name - Page X]. Never treat bracketed reference numbers such as [26] in a REFERENCES section as page numbers. For HWP/HWPX/DOCX, cite the provided section label. NEVER cite the [Previous Conversation History] as a source.\n"
        "3. Output Language: ALL user-facing responses, including chart labels and suggested questions, MUST be in Korean.\n"
        "4. Step-by-Step Reasoning (Chain of Thought): Before writing your final answer, deeply analyze the user's request and the document context step-by-step. Break down complex problems, extract all necessary facts first, and then synthesize them into a logical and highly accurate final response.\n\n"
    )

    text_mode_prompt = (
        "-----------------------------------\n"
        "[Task: 📝 Standard Text Summary & Q&A]\n"
        "- 🚨 Rule 1 [Scope Control - CRITICAL]: First, identify the exact SCOPE of the user's prompt. If the user asks for a specific section (e.g., '서론만', '결과만') or asks to elaborate on a specific point, you MUST act as a 'Laser Extractor'. Completely IGNORE the rest of the document. NEVER provide a full-document summary in this case.\n"
        "- 🔍 Rule 2 [Deep Dive]: If the user says '이 부분을 더 요약해줘' or '더 자세히 설명해줘', provide a highly detailed, focused analysis of ONLY that specific topic. Do not just skim.\n"
        "- 📝 Rule 3 [MANDATORY SUMMARY FORMAT]: When the user asks for a general summary, or when no specific scope is given, use the markdown structure below. Translate placeholders to Korean.\n"
        "(⚠️ CRITICAL FOR MINI: If the user asks about a specific topic, DO NOT use this template. Write a free-form, highly detailed answer answering ONLY their specific question.)\n\n"
        "## 🎯 핵심 요약\n"
        "(문서의 전체적인 핵심 내용을 1~2문단으로 명확하고 밀도 있게 요약. 두루뭉술한 표현 금지.)\n\n"
        "## 📚 주요 내용 상세 분석\n"
        "### 1. <주제명>\n"
        "* **<세부 지표/개념 1>:** (단순 요약이 아닌, 문서에 등장하는 구체적인 수치, 고유명사, 법령, 사실관계를 팩트 위주로 상세히 기재)\n"
        "* **<세부 지표/개념 2>:** (구체적인 팩트와 데이터 기재)\n"
        "* **주요 특징 및 세부사항:** (문서에서 강조하는 세부 통계, 기관명, 예시 등 구체적인 하위 데이터를 반드시 포함할 것)\n\n"
        "### 2. <주제명>\n"
        "* **<세부 지표/개념 1>:** ...\n"
        "(문서의 정보량을 최대한 보존할 수 있도록 H3 `###` 섹션을 풍부하게 생성하세요. '다수 포함되어 있다' 같은 모호한 표현을 절대 쓰지 말고, 정확히 어떤 내용인지 팩트 위주로 길고 상세하게 작성하세요.)\n"
        "- 🚨 Rule 4 [Anti-Laziness & Full-Document Coverage - CRITICAL]: You are prohibited from writing short, lazy summaries. If the document is short, extract every single detail without inventing filler text. However, for long documents (e.g., 40+ pages), you MUST comprehensively read all the way to the conclusion and appendix. Do not just summarize the abstract. For long documents, you MUST write an extremely detailed, exhaustive response (at least 1500-2000 words) extracting specific facts, numbers, and proper nouns from the middle and end as well.\n"
        "- 🚨 Rule 5 [Mandatory Suggested Questions - Visualizations]: At the very end of your text response, you MUST append the exact separator '===SUGGESTED_QUESTIONS==='.\n"
        "After the separator, you MUST generate 3-4 highly recommended questions for the user to ask you to draw tables or charts.\n"
        "Identify data-rich sections in the document suitable for visualization (e.g., trends, comparisons). Score them from 0 to 100 based on their importance, and sort them from highest to lowest.\n"
        "CRITICAL: NEVER recommend a visualization for a single point in time (e.g., '2026년 4월'). Always recommend trends or comparisons over multiple periods/categories (e.g., '월별 추이', '연도별 비교').\n"
        "Format each recommendation EXACTLY like this (in Korean): '[추천 시각화: 95점] 2024년 분기별 매출 추이 꺾은선 그래프 그려줘'\n"
        "Do not include any other text after the separator except these formatted questions.\n"
    )

    visual_mode_prompt = (
        "-----------------------------------\n"
        "[Task: 📊 Data Visualization (Table/Chart)]\n"
        "- Auto-Routing: Independently decide the optimal visual format (table, bar, line, pie).\n"
        "- [Separation Rule]: When data has different categories (e.g., years, regions, models), represent them as separate chart series or table columns. Do NOT flatten them into one continuous line.\n"
        "- [Graph Priority]: If the user asks for a chart, return type='chart'. Do not downgrade to a table.\n"
        "- [Grounded Data]: Every value MUST be directly extractable from the uploaded context. Use null if missing.\n"
        "- [Data Extraction]: For charts, extract multiple data points to show a trend or comparison. Do not generate a chart with only a single X-axis data point. If there is only one data point available, you MUST use chartType='bar' instead of 'line'.\n"
        "- 🚨 [NUMERICAL DATA RULE]: ALL numerical values in the 'data' array MUST be raw numbers (e.g., 1000, 3.14). DO NOT use strings with commas or units (e.g., '1,000', '1천명' are FORBIDDEN). If you extract '1,000명', convert it to 1000.\n"
        "- 🚨 [STRICT JSON RULE]: You MUST return ONLY a single, raw JSON object. NO markdown code blocks (e.g., ```json), NO explanatory text, NO 'SUGGESTED_QUESTIONS'.\n"
        "- [Design Rule]: Simply use the example colors provided in the schema. DO NOT try to generate a new color palette.\n\n"
        "  [Strict JSON Format]\n"
        "  {\n"
        "    \"reasoning_summary\": \"시각화 추출 근거를 한국어로 1문장만 작성하세요.\",\n"
        "    \"type\": \"chart\",\n"
        "    \"theme\": {\n"
        "      \"headerBackground\": \"#1e293b\",\n"
        "      \"headerTextColor\": \"#ffffff\",\n"
        "      \"cellBackground\": \"#f8fafc\",\n"
        "      \"cellTextColor\": \"#334155\",\n"
        "      \"borderColor\": \"#cbd5e1\"\n"
        "    },\n"
        "    \"chartType\": \"line\",\n"
        "    \"xAxisKey\": \"name\",\n"
        "    \"columns\": [\n"
        "      {\"key\": \"model\", \"label\": \"AI 모델\"},\n"
        "      {\"key\": \"score\", \"label\": \"정확도\"}\n"
        "    ],\n"
        "    \"series\": [\n"
        "      {\"dataKey\": \"score\", \"color\": \"#0ea5a4\", \"name\": \"정확도 점수\"},\n"
        "      {\"dataKey\": \"speed\", \"color\": \"#f59e0b\", \"name\": \"처리 속도\"}\n"
        "    ],\n"
        "    \"data\": [\n"
        "      {\"name\": \"GPT-4\", \"model\": \"GPT-4\", \"score\": 95, \"speed\": 800000}\n"
        "    ]\n"
        "  }\n"
        "- 'type' MUST be one of: chart, table.\n"
        "- 'chartType' MUST be one of: bar, line, pie (only required if type is chart).\n"
        "- 'columns' is REQUIRED for tables.\n"
        "- 'series' is REQUIRED for ALL charts (including pie charts). You must specify the 'dataKey' mapping to the numerical value.\n"
    )

    if _is_visual_request(question):
        system_prompt = core_prompt + visual_mode_prompt
    else:
        system_prompt = core_prompt + text_mode_prompt

    history_block = f"[Previous Conversation History]\n{analysis_text}\n\n" if analysis_text else ""
    doc_block = f"[Uploaded Document Context]\n{document_context}\n\n" if document_context else ""

    if question and question.strip():
        user_prompt = f"""
[User Request]
{question}

{doc_block}{history_block}
---
🚨 AI REMINDER: 
Please execute the [User Request] exactly: "{question}". 
If the request is about a specific section, DO NOT summarize the whole document. Focus ONLY on the requested part.
Note: If the request asks to modify a visual asset, prioritize the [Previous Conversation History].
Use the uploaded document context as the primary source. Use previous conversation history only to understand continuity, never as a citation source.
"""
    else:
        user_prompt = f"""
{doc_block}{history_block}Please conduct a thorough and insightful analysis of the [Uploaded Document Context] based on its nature. Follow the formatting and structural guidelines provided in your system instructions.
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


def _chunk_text(text: str, chunk_size: int = 30000) -> list[str]:
    # HWP files often have excessive whitespace, which slows down the LLM
    text = " ".join(text.split())
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

def _extract_chunk_with_openai(chunk: str, api_key: str, model: str, question: str = "", is_visual: bool = False) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=90.0, max_retries=1)
        
        if is_visual:
            prompt = (
                "You are a strict data extraction assistant.\n"
                f"The user wants to generate a visualization based on the following request: '{question}'\n"
                "Extract ONLY the specific numerical data, tables, and exact facts from the text chunk below that are relevant to this request.\n"
                "Do NOT write long sentences. List the raw data clearly. If there is NO relevant data in this chunk, output nothing.\n"
                f"\n[Text Chunk]\n{chunk}"
            )
        else:
            prompt = (
                "You are a fast data extractor.\n"
                "Extract the most critical facts, numbers, and key concepts from the following text chunk.\n"
                "Summarize them concisely into a few bullet points. Do not write long paragraphs.\n"
                f"\n[Text Chunk]\n{chunk}"
            )

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        print(f"Chunk extraction failed: {exc}")
        return ""

def _analyze_with_openai(
    question: str,
    extracted_docs: list[dict],
    api_key: str,
    analysis_text: str = "",
    relevant_chunks: list[dict] | None = None,
) -> dict:
    try:
        from openai import OpenAI
        import concurrent.futures
    except ModuleNotFoundError:
        return _llm_error("openai 패키지가 설치되어 있지 않습니다.", "openai")

    model = settings.openai_model
    client = OpenAI(api_key=api_key, timeout=300.0, max_retries=0)
    system_prompt, user_prompt = _build_prompts(question, extracted_docs, analysis_text, relevant_chunks)

    # --- MAP-REDUCE LOGIC FOR GPT-4O-MINI ---
    question_lower = (question or "").strip().lower()
    is_general_summary = not question_lower or any(kw in question_lower for kw in ("요약", "분석", "정리", "핵심"))
    is_visual_req = _is_visual_request(question)
    raw_document_text = "\n\n".join(doc.get("text", "") for doc in extracted_docs)
    is_long_doc = len(raw_document_text) > 15000 and "mini" in model.lower()
    
    if is_long_doc and (is_general_summary or is_visual_req):
        chunks = _chunk_text(raw_document_text, 30000)
        extracted_pieces = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # We must preserve the order of chunks to maintain logical flow
            future_to_index = {executor.submit(_extract_chunk_with_openai, chunk, api_key, model, question, is_visual_req): i for i, chunk in enumerate(chunks)}
            results = [None] * len(chunks)
            for future in concurrent.futures.as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    result = future.result()
                    results[idx] = result
                except Exception:
                    results[idx] = ""
            
        extracted_pieces = [r for r in results if r]
        stitched_extraction = "\n\n---\n\n".join(extracted_pieces)
        doc_block = f"[Uploaded Document Context (Extracted Facts)]\n{stitched_extraction}\n\n"
        history_block = f"[Previous Conversation History]\n{analysis_text}\n\n" if analysis_text else ""
        
        if is_visual_req:
            user_prompt = f"{doc_block}{history_block}The user requested a visualization: '{question}'. Please output ONLY the strict JSON format as specified in your system instructions based on the extracted data above."
        else:
            user_prompt = f"{doc_block}{history_block}Please conduct a thorough and insightful analysis based on the extracted facts above. Follow the formatting and structural guidelines provided in your system instructions. Make it extremely detailed and section-by-section."

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


def _analyze_with_google(
    question: str,
    extracted_docs: list[dict],
    api_key: str,
    analysis_text: str = "",
    relevant_chunks: list[dict] | None = None,
) -> dict:
    try:
        from google import genai
    except ModuleNotFoundError:
        return _llm_error("google-genai 패키지가 설치되어 있지 않습니다.", "google")

    model = settings.gemini_model
    system_prompt, user_prompt = _build_prompts(question, extracted_docs, analysis_text, relevant_chunks)
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
    relevant_chunks: list[dict] | None = None,
) -> dict:
    normalized_provider = (provider or "openai").lower()

    if normalized_provider == "google":
        api_key = google_api_key or settings.google_api_key or settings.gemini_api_key
        if not api_key:
            return _llm_error("Google/Gemini API 키가 없어 기본 문서 추출로 응답했습니다.", "google")
        return _analyze_with_google(question, extracted_docs, api_key, analysis_text, relevant_chunks)

    api_key = openai_api_key or settings.openai_api_key
    if not api_key:
        return _llm_error("OpenAI API 키가 없어 기본 문서 추출로 응답했습니다.", "openai")
    return _analyze_with_openai(question, extracted_docs, api_key, analysis_text, relevant_chunks)


def generate_chat_title(
    question: str,
    provider: str = "openai",
    openai_api_key: str | None = None,
    google_api_key: str | None = None,
    analysis_text: str = ""
) -> str:
    """사용자의 첫 질문을 바탕으로 3~5단어의 짧은 제목을 생성합니다."""
    prompt = f"다음 질문(또는 분석 요청)을 바탕으로 대화방의 제목을 3~5단어 내외의 짧은 명사형으로 작성해.\n\n질문: {question}\n\n오직 제목만 출력할 것."
    
    normalized_provider = (provider or "openai").lower()

    if normalized_provider == "google":
        api_key = google_api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return question[:20]
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            response = client.models.generate_content(model=model, contents=prompt)
            return (getattr(response, "text", "") or "").strip().replace('"', '').replace("'", "")
        except Exception:
            return question[:20]

    api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return question[:20]
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=300.0, max_retries=0)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=20
        )
        return response.choices[0].message.content.strip().replace('"', '').replace("'", "")
    except Exception:
        return question[:20]
