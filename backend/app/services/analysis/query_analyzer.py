# 서비스: 질문 의도 분석, 용어 확장, 검색어 토큰화를 처리합니다.
"""Query intent and token helpers for local document analysis."""

import re


def is_compare_request(question: str) -> bool:
    """두 문서/논문 비교 요청인지 빠르게 판별합니다."""

    keywords = [
        "비교",
        "차이",
        "공통점",
        "다른점",
        "비교분석",
        "compare",
    ]
    q = (question or "").lower()
    return any(keyword.lower() in q for keyword in keywords)


DOMAIN_TERMS = {
    "RAG",
    "LLM",
    "BERT",
    "GPT",
    "OWPML",
    "HWPX",
    "HWP",
    "FastAPI",
    "MongoDB",
    "정확도",
    "정밀도",
    "재현율",
    "데이터셋",
    "벤치마크",
    "마인드맵",
    "시각화",
}

# 사용자의 질문을 summary/analysis/compare/metrics 같은 처리 모드로 분류하기 위한 한국어 단서입니다.
# 특히 compare는 paper_compare 성격의 질문("A와 B 차이", "공통점", "비교")을 잡아
# 프롬프트와 근거 추출이 문서 간 차이 중심으로 움직이게 합니다.
INTENT_CUE_TERMS = {
    "summary": {
        "핵심",
        "요약",
        "주제",
        "결론",
        "목적",
        "개요",
        "정리",
    },
    "analysis": {
        "분석",
        "설명",
        "의미",
        "필요성",
        "특징",
        "해석",
        "자세히",
    },
    "importance": {
        "중요",
        "중요도",
        "핵심",
        "우선순위",
        "강조",
        "비중",
        "영향",
    },
    "metrics": {
        "실험",
        "결과",
        "성능",
        "정확도",
        "정밀도",
        "재현율",
        "비율",
        "수치",
        "평가",
        "검증",
        "동향",
        "추이",
        "변화",
        "증가",
        "감소",
        "이동",
        "이동량",
    },
    "compare": {
        "비교",
        "차이",
        "공통점",
        "차별점",
        "반면",
        "그러나",
        "반대로",
        "유사",
    },
    "extract": {
        "문장",
        "발췌",
        "인용",
        "근거",
        "부분",
        "구절",
        "원문",
    },
}

INTENT_TEXT_CUE_TERMS = {
    "summary": {"summary", "main"},
    "analysis": {"analysis", "explain", "detail"},
    "importance": {"important", "importance", "priority"},
    "metrics": {"score", "accuracy", "f1"},
    "compare": {"다른", "compare", "difference"},
    "extract": {"quote", "extract"},
}

# 질문에 등장한 한 단어만으로 관련 문장을 찾으면 누락이 많습니다.
# 예를 들어 "비교"는 "차이", "공통점", "반면"까지 같이 찾도록 확장합니다.
QUERY_EXPANSIONS = {
    "중요도": {"중요", "핵심", "우선순위", "비중", "영향", "강조", "의미", "필요성"},
    "중요": {"중요도", "핵심", "우선순위", "의미", "필요성"},
    "요약": {"핵심", "개요", "정리", "결론", "목적"},
    "분석": {"핵심", "근거", "결과", "특징", "의미"},
    "설명": {"분석", "의미", "근거", "특징"},
    "결과": {"실험", "성능", "수치", "평가", "검증"},
    "성능": {"정확도", "정밀도", "재현율", "f1", "평가", "결과"},
    "동향": {"추이", "변화", "증가", "감소", "흐름", "수치"},
    "추이": {"동향", "변화", "증가", "감소", "흐름", "수치"},
    "이동": {"이동량", "전입", "전출", "지역", "동향", "추이"},
    "이동량": {"이동", "전입", "전출", "지역", "동향", "추이"},
    "비교": {"차이", "공통점", "차별점", "반면", "유사"},
    "차이": {"비교", "차별점", "반면", "다른"},
    "발췌": {"문장", "근거", "구절", "인용", "원문"},
}

KOREAN_SUFFIXES = (
    "에서는",
    "에게서",
    "으로서",
    "으로써",
    "입니다",
    "합니다",
    "였다",
    "했다",
    "에서",
    "으로",
    "에게",
    "보다",
    "처럼",
    "까지",
    "부터",
    "이며",
    "이고",
    "지만",
    "는데",
    "거나",
    "하고",
    "라는",
    "이란",
    "되었습니다",
    "했습니다",
    "됩니다",
    "되었",
    "하였",
    "된다",
    "하다",
    "보였다",
    "나왔다",
    "있었다",
    "은",
    "는",
    "이",
    "가",
    "을",
    "를",
    "에",
    "의",
    "도",
    "와",
    "과",
    "로",
)


def _strip_korean_suffix(word: str) -> str:
    """간단한 조사/어미를 제거해 '비교는', '비교에서'를 같은 검색어로 맞춥니다."""

    for suffix in KOREAN_SUFFIXES:
        if word.endswith(suffix) and len(word) > len(suffix) + 1:
            return word[: -len(suffix)]
    return word


def _regex_terms(text: str) -> list[str]:
    """외부 형태소 분석기가 없을 때 쓰는 기본 토큰화입니다."""

    terms = []
    for word in re.findall(r"[A-Za-z가-힣0-9]{2,}", text.lower()):
        normalized = _strip_korean_suffix(word)
        if normalized.isdigit() or re.fullmatch(r"\d+(?:월|년|분기|일)", normalized):
            continue
        if len(normalized) >= 2:
            terms.append(normalized)
    return terms


def _tokenize_terms(text: str) -> list[str]:
    """ckonlpy가 있으면 도메인 단어를 보강한 형태소 분석을 쓰고, 없으면 regex로 fallback합니다."""

    try:
        from ckonlpy.tag import Twitter
    except ModuleNotFoundError:
        return _regex_terms(text)

    try:
        tokenizer = Twitter()
        for term in DOMAIN_TERMS:
            tokenizer.add_dictionary(term, "Noun")
        return [_strip_korean_suffix(token.lower()) for token in tokenizer.morphs(text) if len(token.strip()) >= 2]
    except Exception:
        return _regex_terms(text)


def _question_intent(question: str) -> str:
    """질문 문장에 포함된 단서를 보고 가장 강한 요청 모드를 반환합니다."""

    lowered = (question or "").lower()
    for intent in ("extract", "compare", "metrics", "importance", "analysis", "summary"):
        cue_terms = INTENT_CUE_TERMS.get(intent, set()) | INTENT_TEXT_CUE_TERMS.get(intent, set())
        if any(term.lower() in lowered for term in cue_terms):
            return intent
    return "general"


def _intent_label(intent: str) -> str:
    return {
        "summary": "핵심 내용과 중요도",
        "analysis": "상세 분석과 해석",
        "importance": "중요도와 우선순위",
        "metrics": "동향과 수치 근거",
        "compare": "비교와 차이점",
        "extract": "중요 문장 발췌",
        "general": "문서 분석",
    }.get(intent, "문서 분석")


def _intent_intro(question: str, intent: str) -> str:
    label = _intent_label(intent)
    if question:
        return f"질문하신 내용은 {label}에 관한 것으로 보입니다. 문서에서 근거가 되는 부분을 먼저 뽑아볼게요."
    return "업로드한 문서를 기준으로 핵심 내용을 먼저 정리해볼게요."


def _expanded_query_terms(question: str) -> set[str]:
    """관련 문서 구간 검색에 쓸 확장 검색어 세트를 만듭니다."""

    terms = set(_tokenize_terms(question or ""))
    for term in list(terms):
        terms.update(QUERY_EXPANSIONS.get(term, set()))
    intent = _question_intent(question)
    terms.update(INTENT_CUE_TERMS.get(intent, set()))
    return {term for term in terms if len(term) >= 2}


def _compact_for_match(text: str) -> str:
    return re.sub(r"\s+", "", text or "").lower()


def _sentence_query_overlap(sentence: str, query_terms: set[str]) -> tuple[int, float]:
    """문장 하나가 질문/비교 의도와 얼마나 겹치는지 점수화합니다."""

    if not query_terms:
        return 0, 0.0
    compact_sentence = _compact_for_match(sentence)
    sentence_terms = set(_tokenize_terms(sentence))
    matched = {
        term
        for term in query_terms
        if term in sentence_terms or term in compact_sentence
    }
    return len(matched), len(matched) / max(len(query_terms), 1)


def _question_wants_negative(question: str) -> bool:
    """단점/한계/문제점처럼 부정 근거를 찾는 질문인지 판별합니다."""

    return bool(re.search(r"(아닌|제외|낮은|낮다|부족|한계|문제|어려운|불가능|단점)", question or ""))
