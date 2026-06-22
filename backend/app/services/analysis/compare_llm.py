"""LLM-first comparison analysis with provider-specific calls."""

from __future__ import annotations

import logging

from app.core.config import settings
from app.services.analysis.experiment_detection import (
    has_experiment_results,
    remove_experiment_section,
)
from app.services.analysis.document_compare import (
    FIELD_LABELS,
    compare_result_to_dict,
    extract_compare_result,
)
from app.services.llm.gemini_provider import call_gemini
from app.services.openai_client import OPENAI_ANALYSIS_TIMEOUT_SECONDS, make_openai_client


logger = logging.getLogger(__name__)
MAX_SINGLE_PAPER_CHARS = 10000
MAX_SINGLE_SUMMARY_CHARS = 4500


def _compare_structure_with_experiment() -> str:
    return """반드시 아래 Markdown 제목과 순서로 작성하라.
각 섹션 제목 앞의 `##`와 번호를 그대로 출력하라.

## 1. 비교표
- 항목: 주제, 연구목적, 사용데이터, 분석방법, 모델/기법, 실험설계, 주요결과, 한계점
- 문서별 내용을 구체적으로 비교하라.

## 2. 공통점

## 3. 차이점

## 4. 실험 결과 비교
- 문서에 제시된 데이터셋, 모델, 평가 지표와 결과값을 비교표로 정리하라.
- Accuracy, F1, Precision, Recall, AUC, BLEU, ROUGE 등의 수치가 있으면 포함하라.
- 실제 평가 지표 수치가 하나 이상 확인될 때만 이 섹션을 작성하라.
- 모든 값이 "문서에서 확인되지 않음"이면 이 섹션을 출력하지 말고 최종 요약을 4번으로 작성하라.
- 빈 실험 결과 비교표를 만들지 마라.
- 문서에 없는 수치는 절대 만들지 마라.

## 5. 최종 요약"""


def _compare_structure_without_experiment() -> str:
    return """문서에 명확한 실험 결과나 성능 평가 수치가 존재하지 않는다.

반드시 아래 Markdown 제목과 순서로만 작성하라.
각 섹션 제목 앞의 `##`와 번호를 그대로 출력하라.

## 1. 비교표
- 항목: 주제, 연구목적, 사용데이터, 분석방법, 모델/기법, 주요결과, 한계점
- 문서별 내용을 구체적으로 비교하라.

## 2. 공통점

## 3. 차이점

## 4. 최종 요약

출력 금지:
- "실험 결과 비교"라는 제목
- 실험 결과가 없다는 안내 문장
- "생략", "없음", "확인되지 않음" 등 섹션 생략을 설명하는 문구
- 존재하지 않는 `## 5.` 항목"""


def build_compare_prompt_with_experiment(question: str, summaries: list[dict]) -> str:
    return _build_compare_prompt(
        question,
        summaries,
        _compare_structure_with_experiment(),
    )


def build_compare_prompt_without_experiment(question: str, summaries: list[dict]) -> str:
    return _build_compare_prompt(
        question,
        summaries,
        _compare_structure_without_experiment(),
    )


def build_compare_prompt(
    question: str,
    summaries: list[dict],
    *,
    include_experiment: bool | None = None,
) -> str:
    if include_experiment is None:
        include_experiment = any(
            bool(summary.get("has_experiment_results"))
            or has_experiment_results(str(summary.get("summary") or ""))
            for summary in summaries
        )
    if include_experiment:
        return build_compare_prompt_with_experiment(question, summaries)
    return build_compare_prompt_without_experiment(question, summaries)


def _build_compare_prompt(
    question: str,
    summaries: list[dict],
    structure: str,
) -> str:
    summary_blocks = []
    for index, summary in enumerate(summaries, start=1):
        filename = str(summary.get("filename") or f"문서 {index}")
        summary_text = str(summary.get("summary") or "")[:MAX_SINGLE_SUMMARY_CHARS]
        summary_blocks.append(
            f"[논문 {index}]\n파일명: {filename}\n\n비교용 요약:\n{summary_text}"
        )

    return f"""너는 논문 및 통계 문서 비교 분석 전문가다.

사용자 요청:
{question}

아래 내용은 각 논문을 독립적으로 분석한 비교용 요약이다.
모든 논문 요약을 빠짐없이 포함하여 비교 분석하라.

{chr(10).join(summary_blocks)}

반드시 한국어 Markdown으로 답변하라.

{structure}

짧고 의미 없는 문장으로 끝내지 말고 제목, 초록, 본문, 결론과 실험 부분을 종합하라.
문서에 없는 내용은 추측하지 마라."""


def build_single_paper_summary_prompt(document: dict, index: int) -> str:
    filename = str(document.get("filename") or f"문서 {index}")
    text = str(document.get("text") or document.get("content") or "")[:MAX_SINGLE_PAPER_CHARS]
    return f"""다음 논문을 다른 논문들과 비교하기 위한 용도로만 구조화하여 요약하라.

파일명: {filename}

본문:
{text}

반드시 한국어 Markdown으로 아래 항목을 모두 작성하라.

### 논문 제목
### 주제
### 연구목적
### 사용데이터
### 분석방법
### 모델/기법
### 실험설계
### 주요결과
### 한계점
### 실험 결과 수치 존재 여부
### 실험 결과 수치

주의:
- 이 논문 한 개의 내용만 사용하라.
- 본문에 없는 내용이나 수치를 만들지 마라.
- 확인할 수 없는 항목은 "문서에서 확인되지 않음"이라고 작성하라."""


def _local_single_paper_summary(document: dict) -> str:
    info = compare_result_to_dict(extract_compare_result(document))
    experiment_exists = has_experiment_results(
        str(document.get("text") or document.get("content") or "")
    )
    rows = [
        ("논문 제목", document.get("filename") or "문서"),
        *[(FIELD_LABELS[key], info[key]) for key in ("topic", "purpose", "data_source", "methodology")],
        ("모델/기법", "문서에서 확인되지 않음"),
        ("실험설계", "문서에서 확인되지 않음"),
        ("주요결과", info["findings"]),
        ("한계점", info["limitations"]),
        ("실험 결과 수치 존재 여부", "있음" if experiment_exists else "없음"),
        (
            "실험 결과 수치",
            "원문에 명시된 지표 수치가 있음" if experiment_exists else "문서에서 확인되지 않음",
        ),
    ]
    return "\n\n".join(f"### {label}\n{value}" for label, value in rows)


def _call_model(
    *,
    selected_provider: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    openai_client=None,
) -> str:
    if selected_provider == "gemini":
        return call_gemini(api_key, model, system_prompt, user_prompt).strip()

    client = openai_client or make_openai_client(api_key, OPENAI_ANALYSIS_TIMEOUT_SECONDS)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )
    return (response.choices[0].message.content or "").strip()


def summarize_single_paper(
    document: dict,
    index: int,
    *,
    selected_provider: str,
    api_key: str,
    model: str,
    openai_client=None,
) -> dict:
    filename = str(document.get("filename") or f"문서 {index}")
    try:
        summary = _call_model(
            selected_provider=selected_provider,
            api_key=api_key,
            model=model,
            system_prompt=(
                "너는 논문 한 편을 비교 분석용으로 구조화하는 전문가다. "
                "제공된 한 문서의 근거만 사용하고 한국어로 답하라."
            ),
            user_prompt=build_single_paper_summary_prompt(document, index),
            openai_client=openai_client,
        )
    except Exception:
        logger.exception("Single paper summary failed. filename=%s", filename)
        summary = ""

    return {
        "filename": filename,
        "summary": summary[:MAX_SINGLE_SUMMARY_CHARS] if summary else _local_single_paper_summary(document),
        "has_experiment_results": has_experiment_results(
            str(document.get("text") or document.get("content") or "")
        ),
    }


def build_llm_compare_analysis(
    question: str,
    documents: list[dict],
    *,
    provider: str,
    api_key: str,
) -> dict:
    selected_provider = "gemini" if provider in {"gemini", "google"} else "openai"
    if len(documents) < 2:
        return {
            "answer": "📄 논문 비교를 위해서는 2개 이상의 문서를 업로드하여 주세요.",
            "llm_used": False,
            "provider": selected_provider,
            "model": None,
        }

    model = settings.gemini_model if selected_provider == "gemini" else settings.openai_model
    try:
        openai_client = (
            None
            if selected_provider == "gemini"
            else make_openai_client(api_key, OPENAI_ANALYSIS_TIMEOUT_SECONDS)
        )
    except Exception:
        logger.exception("Compare analysis client initialization failed.")
        return {
            "answer": "",
            "llm_used": False,
            "provider": selected_provider,
            "model": None,
        }
    summaries = [
        summarize_single_paper(
            document,
            index,
            selected_provider=selected_provider,
            api_key=api_key,
            model=model,
            openai_client=openai_client,
        )
        for index, document in enumerate(documents, start=1)
    ]
    include_experiment = any(
        summary.get("has_experiment_results")
        for summary in summaries
    )
    prompt = build_compare_prompt(
        question,
        summaries,
        include_experiment=include_experiment,
    )
    logger.info(
        "compare analysis selected provider=%s documents=%s summaries=%s",
        selected_provider,
        len(documents),
        len(summaries),
    )
    logger.info("LLM compare analysis start provider=%s", selected_provider)

    try:
        answer = _call_model(
            selected_provider=selected_provider,
            api_key=api_key,
            model=model,
            system_prompt=(
                "너는 여러 논문의 구조화된 요약을 비교하는 전문가다. "
                "모든 논문을 포함하고, 요약에 없는 내용을 만들지 말고 한국어 Markdown으로 답하라."
            ),
            user_prompt=prompt,
            openai_client=openai_client,
        )
    except Exception:
        logger.exception("LLM compare analysis failed. fallback to local.")
        return {
            "answer": "",
            "llm_used": False,
            "provider": selected_provider,
            "model": None,
        }

    if not answer:
        logger.warning("LLM compare analysis returned empty answer. fallback to local.")
        return {
            "answer": "",
            "llm_used": False,
            "provider": selected_provider,
            "model": model,
        }

    answer = remove_experiment_section(
        answer,
        only_if_empty=include_experiment,
    )

    logger.info("LLM compare analysis success provider=%s", selected_provider)
    return {
        "answer": answer,
        "llm_used": True,
        "provider": selected_provider,
        "model": model,
        "summaries": summaries,
    }
