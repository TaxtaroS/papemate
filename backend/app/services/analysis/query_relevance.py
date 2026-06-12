# 서비스: 질문과 후보 텍스트 사이의 로컬 관련성 점수를 계산합니다.
"""Shared query relevance scoring for local document analysis."""

from collections.abc import Iterable

from app.services.analysis.query_analyzer import _compact_for_match, _sentence_query_overlap
from app.services.analysis.scoring_config import QUERY_RELEVANCE_WEIGHTS


def query_relevance_score(
    text: str,
    query_terms: set[str],
    *,
    rank_terms: Iterable[str] | None = None,
    semantic_score: float | None = None,
) -> tuple[float, int, float]:
    matched_count, coverage = _sentence_query_overlap(text, query_terms)
    score = (
        matched_count * QUERY_RELEVANCE_WEIGHTS.overlap
        + coverage * QUERY_RELEVANCE_WEIGHTS.coverage
    )

    if rank_terms:
        compact_text = _compact_for_match(text)
        score += sum(QUERY_RELEVANCE_WEIGHTS.compact_term for term in rank_terms if term in compact_text)

    if semantic_score is not None:
        score += semantic_score * QUERY_RELEVANCE_WEIGHTS.semantic

    return score, matched_count, coverage
