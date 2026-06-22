# 서비스: LLM 분석 실패 시 로컬 요약/키워드/수치 후보/근거 기반 fallback 응답을 생성합니다.
"""Fast local fallback analysis for PaperMate.

This module owns non-LLM answers. Document extraction stays in
document_processing.py, while this file builds quick summaries, keywords,
metrics, and source-grounded fallback responses.

초보자 안내:
- API 키가 없거나 LLM 호출이 실패해도 사용자는 답변을 받아야 합니다.
- 이 파일은 문서 본문만으로 핵심 요약, 키워드, 수치 후보, 관련 구간을 만들어 안전망 역할을 합니다.
- chart 추천 질문과 paper_compare 답변의 기본 근거도 여기서 만든 payload를 바탕으로 구성됩니다.
"""

from app.services.analysis.answer_builder import (
    _clean_text,
    _doc_brief,
    _extractive_summary,
    _frequent_terms,
    _metric_candidates,
    _top_sentences,
)
from app.services.analysis.chunk_ranker import rank_relevant_chunks
from app.services.analysis.query_analyzer import _intent_intro, _intent_label, _question_intent
from app.services.analysis.scoring_config import CHUNK_RANK_WEIGHTS
from app.services.analysis.topic_modeling import extract_topics
from app.services.translation import force_korean_analysis_text

KEYWORD_TRANSLATIONS = {
    "accuracy": "정확도",
    "cnn": "합성곱 신경망",
    "convolutional neural network": "합성곱 신경망",
    "deep learning model": "딥러닝 모델",
    "deep learning models": "딥러닝 모델",
    "logistic regression": "로지스틱 회귀",
    "machine learning": "머신러닝",
    "model category": "모델 분류",
    "sensitivity": "민감도",
    "specificity": "특이도",
    "time-series": "시계열",
}


def _english_heavy(text: str) -> bool:
    """영문 비중이 높아 한국어 사용자에게 그대로 보여주기 어려운 문장인지 확인합니다."""

    letters = [char for char in str(text or "") if char.isalpha()]
    if not letters:
        return False
    korean_count = sum(1 for char in letters if "가" <= char <= "힣")
    english_count = sum(1 for char in letters if ("a" <= char.lower() <= "z"))
    return english_count >= 20 and english_count > korean_count * 1.4


def _korean_user_text(text: str, *, source_label: str = "문서 근거") -> str:
    """로컬 fallback 답변에 들어갈 문장을 가능한 한 한국어로 정리합니다."""

    cleaned = _clean_text(text)
    if not cleaned:
        return ""
    translated = force_korean_analysis_text(cleaned)
    if translated and not _english_heavy(translated):
        return translated
    if _english_heavy(cleaned):
        second_pass = force_korean_analysis_text(cleaned[:900])
        if second_pass and not _english_heavy(second_pass):
            return second_pass
        return f"{source_label}: 영문 원문에서 확인된 핵심 내용을 기준으로 정리했습니다. 로컬 번역기가 처리하지 못한 전문 용어는 원문 키워드에 함께 표시했습니다."
    return translated or cleaned


def _keyword_text(keyword: object) -> str:
    raw = str(keyword or "").strip()
    if not raw:
        return ""
    normalized = raw.lower().strip(" :;,.()[]{}")
    return KEYWORD_TRANSLATIONS.get(normalized) or raw


def _focused_relevant_text(relevant_chunks: list[dict], fallback_text: str) -> str:
    """질문과 가까운 chunk만 모아 요약/키워드/수치 추출의 입력으로 사용합니다."""

    if not relevant_chunks:
        return fallback_text

    top_score = float(relevant_chunks[0].get("score") or 0)
    if top_score <= 0:
        focused_chunks = relevant_chunks[:1]
    else:
        min_score = top_score * CHUNK_RANK_WEIGHTS.focused_score_ratio
        focused_chunks = [
            chunk
            for chunk in relevant_chunks
            if float(chunk.get("score") or 0) >= min_score
        ] or relevant_chunks[:1]

    return "\n".join(chunk["text"] for chunk in focused_chunks if chunk.get("text")) or fallback_text


def _analysis_payload(
    *,
    summary: str,
    intent: str,
    keywords: list[str] | None = None,
    metrics: list[str] | None = None,
    topics: list[dict] | None = None,
    document_keywords: list[str] | None = None,
    document_metrics: list[str] | None = None,
    document_topics: list[dict] | None = None,
    documents: list[dict] | None = None,
    relevant_chunks: list[dict] | None = None,
) -> dict:
    """라우터 응답과 LLM 보강 단계에서 공통으로 쓰는 로컬 분석 데이터 묶음입니다."""

    return {
        "summary": summary,
        "intent": intent,
        "keywords": keywords or [],
        "metrics": metrics or [],
        "topics": topics or [],
        "document_keywords": document_keywords or [],
        "document_metrics": document_metrics or [],
        "document_topics": document_topics or [],
        "documents": documents or [],
        "relevant_chunks": relevant_chunks or [],
    }


def _fallback_response(question: str, payload: dict) -> dict:
    return {
        "answer": build_concise_fallback_answer(question, payload),
        **payload,
    }


def build_analysis_answer(question: str, extracted_docs: list[dict]) -> dict:
    """업로드 문서만으로 빠른 분석 결과를 만듭니다."""

    cleaned_docs = []
    for doc in extracted_docs:
        cleaned_text = _clean_text(doc.get("text", ""))
        if cleaned_text:
            cleaned_docs.append({**doc, "text": cleaned_text})

    combined_text = "\n".join(doc["text"] for doc in cleaned_docs if doc["text"])
    intent = _question_intent(question)

    if not combined_text.strip():
        summary = (
            "업로드 파일은 받았지만 추출 가능한 본문 텍스트가 거의 없습니다. "
            "이미지라면 OCR 설치가 필요할 수 있고, 구형 HWP는 HWPX 변환이 더 안정적입니다."
        )
        return _fallback_response(
            question,
            _analysis_payload(summary=summary, intent=intent),
        )

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        # 1단계: 전체 문서 기준의 후보를 동시에 뽑습니다.
        # 비교 질문에서는 여러 문서의 chunk가 함께 들어오므로 문서별 근거 후보도 같이 잡힙니다.
        future_chunks = executor.submit(rank_relevant_chunks, question, cleaned_docs, 6)
        future_doc_terms = executor.submit(_frequent_terms, combined_text)
        future_doc_metrics = executor.submit(_metric_candidates, combined_text)
        future_doc_topics = executor.submit(extract_topics, combined_text)

        relevant_chunks = future_chunks.result()
        relevant_text = _focused_relevant_text(relevant_chunks, combined_text)
        
        # 2단계: 질문과 관련 있는 텍스트만 좁혀 키워드/수치/주제를 다시 뽑습니다.
        if relevant_text == combined_text:
            future_rel_terms = future_doc_terms
            future_rel_metrics = future_doc_metrics
            future_rel_topics = future_doc_topics
        else:
            future_rel_terms = executor.submit(_frequent_terms, relevant_text)
            future_rel_metrics = executor.submit(_metric_candidates, relevant_text)
            future_rel_topics = executor.submit(extract_topics, relevant_text)
            
        future_summary = executor.submit(_extractive_summary, relevant_text, question, 4)

        terms = future_rel_terms.result()
        metrics = future_rel_metrics.result()
        topics = future_rel_topics.result()
        summary_points = future_summary.result()
        
        document_terms = future_doc_terms.result()
        document_metrics = future_doc_metrics.result()
        document_topics = future_doc_topics.result()

    summary = " ".join(summary_points) or combined_text[:600]

    payload = _analysis_payload(
        summary=summary,
        intent=intent,
        keywords=terms,
        metrics=metrics,
        topics=topics,
        document_keywords=document_terms,
        document_metrics=document_metrics,
        document_topics=document_topics,
        documents=[_doc_brief(doc) for doc in cleaned_docs],
        relevant_chunks=relevant_chunks,
    )
    return _fallback_response(question, payload)


def build_concise_fallback_answer(question: str, fallback_answer: dict) -> str:
    """프론트 채팅에 바로 보여줄 로컬 답변 문자열을 LLM 답변 순서에 맞춰 만듭니다."""

    intent = fallback_answer.get("intent") or _question_intent(question)
    relevant_chunks = fallback_answer.get("relevant_chunks") or []
    summary = _clean_text(fallback_answer.get("summary", ""))
    summary_text = _korean_user_text(summary[:1200], source_label="핵심 요약") if summary else "요약할 본문이 부족합니다."
    sections = [
        "## 🎯 핵심 요약",
        summary_text,
        "",
        "## 📚 주요 내용 상세 분석",
        "",
        "### 1. 질문 기준 핵심 해석",
        _intent_intro(question, intent),
        f"- **분석 기준:** {_intent_label(intent)}",
        "- **근거 범위:** 업로드 문서에서 확인되는 내용만 사용했습니다.",
    ]

    topics = fallback_answer.get("topics") or []
    keywords = fallback_answer.get("keywords") or []
    topic_items = []
    for topic in topics[:3]:
        if isinstance(topic, dict):
            label = topic.get("label") or topic.get("name") or topic.get("topic")
            terms = topic.get("terms") or topic.get("keywords") or []
            term_text = ", ".join(_keyword_text(term) for term in terms[:4] if _keyword_text(term))
            if label or term_text:
                topic_items.append((label or "문서 주제", term_text))

    if topic_items or keywords:
        sections.extend(["", "### 2. 주요 주제와 키워드"])
        if topic_items:
            for label, term_text in topic_items:
                suffix = f": {term_text}" if term_text else ""
                sections.append(f"- **{_korean_user_text(str(label), source_label='주제')}**{suffix}")
        else:
            keyword_items = [_keyword_text(keyword) for keyword in keywords[:8]]
            keyword_items = [keyword for keyword in keyword_items if keyword]
            sections.append(f"- **핵심 키워드:** {', '.join(keyword_items)}")

    if relevant_chunks:
        sections.extend(["", "### 3. 문서 근거"])
        for chunk in relevant_chunks[:3]:
            source_label = chunk.get("source_label") or f"Chunk {chunk.get('chunk_index', '?')}"
            focused = _top_sentences(chunk.get("text", ""), 1, question)
            preview = (focused[0] if focused else _clean_text(chunk.get("text", "")))[:360]
            evidence_text = _korean_user_text(preview, source_label="근거 구간")
            sections.append(f"- **{chunk.get('filename', '문서')} {source_label}:** {evidence_text}")

    metrics = fallback_answer.get("metrics") or []
    if metrics:
        sections.extend(["", "[수치 후보]"])
        sections.extend(f"- {_korean_user_text(metric, source_label='수치 근거')}" for metric in metrics[:8])

    if keywords and topic_items:
        keyword_items = [_keyword_text(keyword) for keyword in keywords[:10]]
        keyword_items = [keyword for keyword in keyword_items if keyword]
        sections.extend(["", "[핵심 키워드]", ", ".join(keyword_items)])

    if relevant_chunks:
        sections.extend(["", "[근거 구간]"])
        for chunk in relevant_chunks[:3]:
            source_label = chunk.get("source_label") or f"Chunk {chunk.get('chunk_index', '?')}"
            focused = _top_sentences(chunk.get("text", ""), 1, question)
            preview = (focused[0] if focused else _clean_text(chunk.get("text", "")))[:360]
            sections.append(f"- {chunk.get('filename', '문서')} {source_label}: {_korean_user_text(preview, source_label='근거 구간')}")

    return "\n".join(section for section in sections if str(section).strip())


def build_empty_context_answer(
    question: str,
    fallback_answer: dict,
    has_uploaded_files: bool,
    filenames: list[str],
) -> str:
    """업로드 파일은 있으나 본문 추출이 안 됐거나, 애초에 문서가 없을 때의 안내문입니다."""

    if has_uploaded_files:
        file_names = ", ".join(filenames)
        return (
            f"업로드하신 파일({file_names})에서 텍스트를 추출할 수 없습니다.\n\n"
            "[확인 요청]\n"
            "- 텍스트가 포함되지 않은 스캔본 이미지이거나, 아직 지원되지 않는 형식일 수 있습니다.\n"
            "- 텍스트 복사가 가능한 PDF, HWPX, TXT, CSV 등을 업로드해주세요."
        )

    return (
        f"{_intent_intro(question, fallback_answer.get('intent') or _question_intent(question))}\n\n"
        "현재 분석할 문서 본문이 없습니다.\n\n"
        "[필요한 자료]\n"
        "- 질문에 맞는 문서를 먼저 업로드해주세요.\n"
        "- 문서를 업로드하면 핵심 요약, 중요 문장 발췌, 수치 후보, 표/그래프 생성을 진행합니다."
    )
