# 서비스: 추출된 문서 텍스트를 chunk 단위로 랭킹하여 관련 구간을 선택합니다.
# 초보자 안내:
# - 긴 논문/보고서를 한 번에 LLM에 다 넣기 어렵기 때문에 작은 구간(chunk)으로 나눕니다.
# - 질문과 가장 관련 있는 구간을 먼저 골라 LLM과 로컬 fallback 답변에 넘깁니다.
# - paper_compare 성격의 질문에서는 여러 문서의 후보 chunk가 함께 경쟁하므로 비교 근거 품질에 직접 영향을 줍니다.
"""Hybrid local chunk ranking for extracted document text."""

import math
from collections import Counter

from app.services.analysis.answer_builder import (
    _clean_text,
    _frequent_terms,
    _metric_candidates,
    _sentences,
)
from app.services.analysis.query_analyzer import (
    _compact_for_match,
    _expanded_query_terms,
    _tokenize_terms,
)
from app.services.analysis.query_relevance import query_relevance_score
from app.services.analysis.scoring_config import CHUNK_RANK_WEIGHTS, QUERY_RELEVANCE_WEIGHTS
from app.services.embeddings.reranker import semantic_sentence_scores


# Chunk window size for ranking. This is independent from answer_builder.MAX_SENTENCE_CHARS.
# 너무 작으면 문맥이 끊기고, 너무 크면 질문과 무관한 문장이 같이 섞입니다.
CHUNK_SIZE = 900
CHUNK_OVERLAP = 160


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """문서 본문을 문장 단위로 이어 붙여 검색 가능한 chunk 목록으로 나눕니다."""

    cleaned = _clean_text(text)
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: list[str] = []
    current = ""
    for sentence in _sentences(cleaned) or [cleaned]:
        if len(sentence) > chunk_size:
            step = max(chunk_size - overlap, 1)
            chunks.extend(sentence[index:index + chunk_size] for index in range(0, len(sentence), step))
            current = ""
            continue

        next_text = f"{current} {sentence}".strip()
        if len(next_text) <= chunk_size:
            current = next_text
            continue

        if current:
            chunks.append(current)
            current = f"{current[-overlap:]} {sentence}".strip() if overlap else sentence
        else:
            current = sentence

    if current:
        chunks.append(current)

    return [chunk for chunk in chunks if chunk.strip()]


def _idf_weights(chunks: list[str]) -> dict[str, float]:
    """여러 chunk에 흔한 단어보다 특정 chunk에만 강한 단어를 더 높게 보기 위한 IDF 가중치입니다."""

    token_sets = [set(_tokenize_terms(chunk)) for chunk in chunks]
    total = len(token_sets)
    document_frequency = Counter(token for tokens in token_sets for token in tokens)
    return {
        token: math.log((total + 1) / (count + 1)) + 1
        for token, count in document_frequency.items()
    }


def _query_terms_for_rank(question: str) -> list[str]:
    return list(_expanded_query_terms(question))


def rank_relevant_chunks(question: str, extracted_docs: list[dict], limit: int = 6) -> list[dict]:
    """질문과 가장 관련 있는 문서 구간을 뽑아 점수순으로 반환합니다."""

    candidates: list[dict] = []
    for doc in extracted_docs:
        source_units = doc.get("source_units") or [
            {
                "source_label": doc.get("source_label") or doc.get("format", "document"),
                "page_number": doc.get("page_number"),
                "section_index": doc.get("section_index"),
                "text": doc.get("text", ""),
            }
        ]
        chunk_index = 1
        for unit in source_units:
            for chunk in _chunk_text(unit.get("text", "")):
                if not _sentences(chunk):
                    continue
                candidates.append(
                    {
                        "filename": doc.get("filename", "unknown"),
                        "format": doc.get("format", "unknown"),
                        "chunk_index": chunk_index,
                        "source_label": unit.get("source_label") or doc.get("format", "document"),
                        "page_number": unit.get("page_number"),
                        "section_index": unit.get("section_index"),
                        "text": chunk,
                    }
                )
                chunk_index += 1

    if not candidates:
        return []

    query_terms = _expanded_query_terms(question) if question else set(
        _tokenize_terms(" ".join(_frequent_terms(" ".join(item["text"] for item in candidates), 8)))
    )
    rank_terms = _query_terms_for_rank(question)
    idf = _idf_weights([item["text"] for item in candidates])
    # 1. 모든 후보 chunk에 대해 빠른 로컬 점수를 계산합니다.
    # 비교 질문에서는 "비교/차이/공통점" 확장어가 query_terms에 들어가 문서 간 대비 구간이 올라옵니다.
    base_ranked = []
    for index, item in enumerate(candidates):
        term_counts = Counter(_tokenize_terms(item["text"]))
        if not term_counts:
            base_ranked.append({**item, "base_score": 0.0, "original_index": index})
            continue

        score = 0.0
        for term in query_terms:
            if not term:
                continue
            tf = term_counts.get(term, 0)
            if tf:
                score += (1 + math.log(tf)) * idf.get(term, 1)

        score += (
            sum(
                min(idf.get(term, 1), CHUNK_RANK_WEIGHTS.frequent_term_cap)
                for term in _frequent_terms(item["text"], 4)
            )
            * CHUNK_RANK_WEIGHTS.frequent_term
        )
        score += len(_metric_candidates(item["text"], 2)) * CHUNK_RANK_WEIGHTS.metric
        compact_text = _compact_for_match(item["text"])
        
        relevance_score, _, _ = query_relevance_score(
            item["text"],
            query_terms,
            rank_terms=rank_terms,
            semantic_score=0.0,  # Computed later
        )
        score += relevance_score
        if "원본그림" in compact_text or "수식입니다" in item["text"]:
            score += CHUNK_RANK_WEIGHTS.noise_penalty

        base_ranked.append({**item, "base_score": score, "original_index": index})

    # 2. 전체 chunk에 임베딩 점수를 매기면 느리므로, 로컬 점수 상위 후보만 semantic reranking합니다.
    base_ranked.sort(key=lambda item: item["base_score"], reverse=True)
    
    # 문서가 길수록 후보를 조금 늘리되, 응답 속도를 위해 최대 15개까지만 봅니다.
    dynamic_top_k = min(15, max(5, int(len(base_ranked) * 0.15)))
    top_candidates = base_ranked[:dynamic_top_k]
    
    if question and top_candidates:
        top_semantic_scores = semantic_sentence_scores(
            question,
            [item["text"][:700] for item in top_candidates],
        )
    else:
        top_semantic_scores = None

    # 3. 질문 문장과 의미적으로 가까운 후보에 추가 점수를 줍니다.
    for i, item in enumerate(top_candidates):
        semantic_score = top_semantic_scores[i] if top_semantic_scores else 0.0
        item["semantic_score"] = round(semantic_score, 4)
        item["score"] = round(item["base_score"] + (semantic_score * QUERY_RELEVANCE_WEIGHTS.semantic), 4)

    # 4. 최종 점수순으로 정렬한 뒤 임시 계산 필드는 제거합니다.
    top_candidates.sort(key=lambda item: (item["score"], item.get("semantic_score", 0.0)), reverse=True)
    
    # Clean up temporary keys
    for item in top_candidates:
        item.pop("base_score", None)
        item.pop("original_index", None)
        
    return top_candidates[:limit]
