"""Detect whether documents contain explicit experiment metric results."""

from __future__ import annotations

import re


EXPERIMENT_KEYWORDS = (
    "실험",
    "성능",
    "평가",
    "정확도",
    "재현율",
    "정밀도",
    "accuracy",
    "precision",
    "recall",
    "f1",
    "benchmark",
    "bleu",
    "rouge",
    "mae",
    "rmse",
    "auc",
    "latency",
)
METRIC_PATTERN = re.compile(
    r"(?:accuracy|precision|recall|f1(?:[-_\s]?score)?|auc|bleu|rouge|mae|rmse|"
    r"latency|정확도|정밀도|재현율|오차율|지연\s*시간)"
    r"\s*(?:은|는|이|가|을|를)?[\s:：=|]{0,12}"
    r"[+-]?\d+(?:\.\d+)?\s*(?:%|ms|s|초)?",
    re.IGNORECASE,
)
PERFORMANCE_PERCENT_PATTERN = re.compile(
    r"(?:성능|평가\s*결과)\s*(?:은|는|이|가)?\s*[:=]?\s*"
    r"[+-]?\d+(?:\.\d+)?\s*%",
    re.IGNORECASE,
)
EMPTY_RESULT_PHRASES = (
    "문서에서 확인되지 않음",
    "확인되지 않음",
    "정보가 없음",
    "정보 없음",
    "제공되지 않음",
    "측정되지 않음",
    "보고되지 않음",
    "해당 없음",
    "없음",
)
EXPERIMENT_SECTION_PATTERN = re.compile(
    r"(?ims)^\s*(?:#{1,6}\s*)?(?:4[.)]\s*)?"
    r"실험\s*결과\s*비교(?:표)?\s*:?\s*$"
    r".*?"
    r"(?=^\s*(?:#{1,6}\s*)?(?:5[.)]\s*)?"
    r"(?:최종\s*요약|종합\s*요약|결론)\s*:?\s*$|\Z)"
)


def has_experiment_results(text: str) -> bool:
    normalized = str(text or "").strip()
    if not normalized:
        return False

    lowered = normalized.lower()
    has_keyword = any(keyword.lower() in lowered for keyword in EXPERIMENT_KEYWORDS)
    has_metric = bool(
        METRIC_PATTERN.search(normalized)
        or PERFORMANCE_PERCENT_PATTERN.search(normalized)
    )
    return has_keyword and has_metric


def _has_reported_metric_value(section: str) -> bool:
    for line in str(section or "").splitlines():
        checkable_line = line
        for phrase in EMPTY_RESULT_PHRASES:
            checkable_line = checkable_line.replace(phrase, "")
        if (
            METRIC_PATTERN.search(checkable_line)
            or PERFORMANCE_PERCENT_PATTERN.search(checkable_line)
        ):
            return True
    return False


def remove_experiment_section(answer: str, *, only_if_empty: bool = False) -> str:
    text = str(answer or "")
    match = EXPERIMENT_SECTION_PATTERN.search(text)
    if not match:
        return _renumber_final_summary(text.strip())
    if only_if_empty and _has_reported_metric_value(match.group(0)):
        return text.strip()

    cleaned = EXPERIMENT_SECTION_PATTERN.sub("", text, count=1).strip()
    return _renumber_final_summary(cleaned)


def _renumber_final_summary(text: str) -> str:
    return re.sub(
        r"(?im)^(\s*(?:#{1,6}\s*)?)5([.)]\s*(?:최종\s*요약|종합\s*요약|결론))",
        r"\g<1>4\2",
        text,
        count=1,
    )
