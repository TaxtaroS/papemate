# 초보자 안내: PDF, DOCX, HWPX, 이미지 등에서 텍스트를 뽑고 기본 분석 결과를 만드는 서비스입니다.

import io
import math
import re
import struct
import zipfile
from collections import Counter
from html import unescape
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree

# 이 파일은 AI가 직접 동작하는 곳이 아니라, AI에 넣을 텍스트를 준비하는 전처리 서비스입니다.
# 파일 형식별로 본문 텍스트를 추출하고, OpenAI 키가 없을 때 쓸 기본 분석 결과도 만듭니다.
# 사용 라이브러리:
# - PyMuPDF(fitz): PDF 텍스트 추출
# - zipfile + ElementTree: DOCX/HWPX 내부 XML 텍스트 추출
# - olefile + struct + zlib: 구형 HWP 바이너리 본문 추출 시도
# - Pillow(PIL): 이미지 크기/형식 확인
# - pytesseract: 이미지 속 글자 OCR. 단, PC에 Tesseract 실행 파일도 별도 설치되어야 합니다.

TEXT_EXTENSIONS = {".txt", ".md", ".csv"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
CHUNK_SIZE = 900
CHUNK_OVERLAP = 160

# WikiDocs의 한국어 QA 예제는 사용자 사전을 추가한 형태소 분석으로
# 사람 이름/전문용어가 잘게 쪼개지는 문제를 줄이는 아이디어를 소개합니다.
# 우리 프로젝트에서는 설치가 까다로운 형태소 분석기를 필수로 두지 않고,
# 설치되어 있으면 사용하고 없으면 정규식 기반 토큰화로 안전하게 동작하게 합니다.
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
    "합니다",
    "되었",
    "하였",
    "했다",
    "된다",
    "하다",
    "였다",
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


# 공백과 HTML 엔티티를 정리해 분석하기 쉬운 한 줄 텍스트로 만듭니다.
def _clean_text(text: str) -> str:
    text = unescape(text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# 문장을 대략적으로 나눕니다.
# 완전한 자연어 처리 라이브러리는 아니고, 한국어/영어 문장 구분자를 기준으로 단순 분리합니다.
def _sentences(text: str) -> list[str]:
    pieces = re.split(r"(?<=[.!?。！？])\s+|(?<=[다요음함임됨])\.\s*|\n+|(?<=다)\s+", text)
    sentences = []
    seen = set()
    for piece in pieces:
        cleaned = _clean_text(piece)
        if len(cleaned) < 18 or cleaned in seen:
            continue
        seen.add(cleaned)
        sentences.append(cleaned)
    return sentences


def _strip_korean_suffix(word: str) -> str:
    """조사/어미가 붙은 한국어 단어를 키워드 비교용으로 가볍게 정규화합니다."""

    for suffix in KOREAN_SUFFIXES:
        if word.endswith(suffix) and len(word) > len(suffix) + 1:
            return word[: -len(suffix)]
    return word


def _regex_terms(text: str) -> list[str]:
    """외부 형태소 분석기가 없을 때 쓰는 기본 토큰화입니다."""

    terms = []
    for word in re.findall(r"[A-Za-z가-힣0-9]{2,}", text.lower()):
        normalized = _strip_korean_suffix(word)
        if len(normalized) >= 2:
            terms.append(normalized)
    return terms


def _tokenize_terms(text: str) -> list[str]:
    """선택형 한국어 토큰화입니다.

    customized_konlpy가 설치되어 있으면 사용자 사전을 넣어 전문용어를 보호하고,
    설치되어 있지 않으면 정규식 기반 토큰화로 그대로 진행합니다.
    """

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


# 기본 분석에서 중요한 문장 후보를 고르기 위한 점수 함수입니다.
# 정확도, 실험, 데이터셋, 비교 같은 연구 문서 키워드가 있으면 점수를 더 줍니다.
def _keyword_score(sentence: str, query_terms: set[str] | None = None, term_weights: Counter | None = None) -> float:
    keywords = [
        "accuracy",
        "precision",
        "recall",
        "f1",
        "experiment",
        "dataset",
        "benchmark",
        "result",
        "method",
        "limitation",
        "정확도",
        "성능",
        "실험",
        "결과",
        "데이터셋",
        "방법",
        "비교",
        "한계",
        "중요",
        "제안",
    ]
    lowered = sentence.lower()
    score = sum(2.2 for keyword in keywords if keyword in lowered) + min(len(sentence) / 90, 3)
    score += len(re.findall(r"\d+(?:\.\d+)?\s?%|\d+\.\d+", sentence)) * 2.5
    if query_terms:
        score += sum(2.8 for term in query_terms if term and term in lowered)
    if term_weights:
        sentence_terms = set(_tokenize_terms(lowered))
        score += sum(min(term_weights.get(term, 0), 4) * 0.38 for term in sentence_terms)
    return score


# 문장 후보를 점수순으로 정렬해 상위 문장만 뽑습니다.
def _top_sentences(text: str, limit: int = 5, question: str = "") -> list[str]:
    sentences = _sentences(text)
    if not sentences:
        return []

    query_terms = set(_frequent_terms(question, 8)) if question else set()
    term_weights = Counter(_tokenize_terms(text))
    ranked = sorted(
        enumerate(sentences),
        key=lambda item: (
            _keyword_score(item[1], query_terms, term_weights)
            + max(0, 2.2 - item[0] * 0.08),  # 초반 문장에 약간 가중치
            -item[0],
        ),
        reverse=True,
    )
    selected = sorted(ranked[:limit], key=lambda item: item[0])
    return [sentence for _, sentence in selected]


# 자주 등장하는 단어를 뽑아 키워드 목록을 만듭니다.
# 조사/일반 단어는 stopwords로 제외합니다.
def _frequent_terms(text: str, limit: int = 10) -> list[str]:
    words = _tokenize_terms(text)
    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "are",
        "was",
        "were",
        "논문",
        "연구",
        "대한",
        "있는",
        "한다",
        "에서",
        "으로",
        "그리고",
        "하지만",
        "또한",
        "통해",
        "위해",
        "경우",
        "사용",
        "대한",
        "관련",
        "되었습니다",
        "했습니다",
        "됩니다",
        "합니다",
        "되었",
        "하였",
        "향상되었",
        "나타났",
        "보였다",
        "나왔다",
        "있었다",
        "없는",
        "있다",
    }
    counter = Counter(word for word in words if word not in stopwords and len(word) >= 2)
    return [word for word, _ in counter.most_common(limit)]


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """긴 문서를 RAG처럼 겹치는 청크로 나눕니다.

    LangChain의 RecursiveCharacterTextSplitter 개념을 가볍게 구현한 버전입니다.
    문장 경계를 우선 사용하고, 너무 긴 문장은 길이 기준으로 한 번 더 자릅니다.
    """

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
    token_sets = [set(_tokenize_terms(chunk)) for chunk in chunks]
    total = len(token_sets)
    document_frequency = Counter(token for tokens in token_sets for token in tokens)
    return {
        token: math.log((total + 1) / (count + 1)) + 1
        for token, count in document_frequency.items()
    }


def rank_relevant_chunks(question: str, extracted_docs: list[dict], limit: int = 6) -> list[dict]:
    """질문과 가까운 문서 조각을 TF-IDF식 점수로 고릅니다.

    벡터DB 없이도 긴 문서에서 질문과 관련 있는 부분을 먼저 보여주기 위한 로컬 검색입니다.
    """

    candidates: list[dict] = []
    for doc in extracted_docs:
        for index, chunk in enumerate(_chunk_text(doc.get("text", "")), start=1):
            candidates.append(
                {
                    "filename": doc.get("filename", "unknown"),
                    "format": doc.get("format", "unknown"),
                    "chunk_index": index,
                    "text": chunk,
                }
            )

    if not candidates:
        return []

    query_terms = set(_tokenize_terms(question or " ".join(_frequent_terms(" ".join(item["text"] for item in candidates), 8))))
    idf = _idf_weights([item["text"] for item in candidates])

    ranked = []
    for item in candidates:
        term_counts = Counter(_tokenize_terms(item["text"]))
        if not term_counts:
            continue

        score = 0.0
        for term in query_terms:
            if not term:
                continue
            tf = term_counts.get(term, 0)
            if tf:
                score += (1 + math.log(tf)) * idf.get(term, 1)

        # 질문어가 적거나 일치가 거의 없을 때도 연구 핵심 문장 청크가 올라오게 보정합니다.
        score += sum(min(idf.get(term, 1), 3) for term in _frequent_terms(item["text"], 4)) * 0.15
        score += len(_metric_candidates(item["text"], 2)) * 1.4

        ranked.append({**item, "score": round(score, 4)})

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:limit]


# 정확도/성능 수치처럼 논문 비교에 자주 필요한 값을 규칙 기반으로 뽑습니다.
# LLM이 없어도 "어떤 수치가 문서에 있었는지"를 답변에 포함하기 위한 보조 함수입니다.
def _metric_candidates(text: str, limit: int = 8) -> list[str]:
    metric_pattern = re.compile(
        r"(?i)\b(accuracy|precision|recall|f1(?:-score)?|auc|map|bleu|rouge|정확도|정밀도|재현율|성능|오차율|속도)\b"
        r"[^\n]{0,90}?(?:\d+(?:\.\d+)?\s?%|\d+\.\d+)"
    )
    percent_pattern = re.compile(r"[^\n]{0,70}\d+(?:\.\d+)?\s?%[^\n]{0,70}")

    candidates = [_clean_text(match.group(0)) for match in metric_pattern.finditer(text)]
    if len(candidates) < limit:
        candidates.extend(_clean_text(match.group(0)) for match in percent_pattern.finditer(text))

    unique_candidates = []
    seen = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        unique_candidates.append(candidate)
        if len(unique_candidates) >= limit:
            break
    return unique_candidates


def _extractive_summary(text: str, question: str = "", limit: int = 4) -> list[str]:
    summary = _top_sentences(text, limit, question)
    if summary:
        return summary
    cleaned = _clean_text(text)
    return [cleaned[:360]] if cleaned else []


def _question_intent(question: str) -> str:
    lowered = (question or "").lower()
    if any(word in lowered for word in ["중요", "핵심", "요약", "summary", "main"]):
        return "summary"
    if any(word in lowered for word in ["실험", "결과", "정확도", "성능", "score", "accuracy", "f1"]):
        return "metrics"
    if any(word in lowered for word in ["비교", "차이", "다른", "compare", "difference"]):
        return "compare"
    if any(word in lowered for word in ["문장", "발췌", "인용", "quote", "extract"]):
        return "extract"
    return "general"


def _doc_brief(doc: dict) -> dict:
    text = doc.get("text", "")
    return {
        "filename": doc.get("filename", "unknown"),
        "format": doc.get("format", "unknown"),
        "key_points": _top_sentences(text, 4) or [text[:260] if text else "추출된 텍스트가 없습니다."],
        "keywords": _frequent_terms(text, 6),
        "metrics": _metric_candidates(text, 5),
    }


# PDF 분석은 PyMuPDF의 fitz.open(stream=..., filetype="pdf")를 사용합니다.
# 각 페이지의 텍스트를 page.get_text("text")로 꺼내 이어 붙입니다.
def extract_pdf(content: bytes) -> str:
    try:
        import fitz
    except ModuleNotFoundError:
        return "PDF 분석을 위해 PyMuPDF 패키지가 필요합니다. requirements.txt 설치 후 다시 시도해주세요."

    with fitz.open(stream=content, filetype="pdf") as document:
        texts: list[str] = []
        for page in document:
            page_text = page.get_text("text")
            if isinstance(page_text, str):
                texts.append(page_text)
            elif page_text is not None:
                texts.append(str(page_text))
        return "\n".join(texts)


# TXT/CSV/MD 파일은 인코딩을 순서대로 시도합니다.
# 한국어 Windows 파일은 cp949/euc-kr일 수 있어 함께 처리합니다.
def extract_text(content: bytes) -> str:
    for encoding in ("utf-8", "cp949", "euc-kr"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="ignore")


# DOCX와 HWPX는 실제로 ZIP 안에 XML 문서들이 들어 있는 구조입니다.
# zipfile로 압축을 열고 ElementTree로 XML 노드의 text를 긁어옵니다.
def _iter_zip_xml_text(content: bytes, wanted_suffixes: Iterable[str]) -> str:
    texts: list[str] = []
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        for name in archive.namelist():
            lower_name = name.lower()
            if not lower_name.endswith(".xml"):
                continue
            if wanted_suffixes and not any(lower_name.endswith(suffix) for suffix in wanted_suffixes):
                continue
            try:
                root = ElementTree.fromstring(archive.read(name))
            except ElementTree.ParseError:
                continue
            for node in root.iter():
                if node.text and node.text.strip():
                    texts.append(node.text.strip())
    return _clean_text(" ".join(texts))


# DOCX의 본문은 보통 word/document.xml에 들어 있습니다.
def extract_docx(content: bytes) -> str:
    return _iter_zip_xml_text(content, ("word/document.xml",))


# HWPX는 OWPML이라는 XML 기반 압축 포맷입니다.
# 한글 문서의 본문 XML은 Contents/section*.xml 계열에 들어 있는 경우가 많습니다.
def extract_hwpx_owpml(content: bytes) -> str:
    texts: list[str] = []
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        for name in archive.namelist():
            lower_name = name.lower()
            if not lower_name.endswith(".xml"):
                continue

            # OWPML/HWPX 본문은 보통 contents/section*.xml에 있지만,
            # 문서에 따라 header.xml, settings.xml 등에도 분석에 도움 되는 텍스트가 있습니다.
            is_body_xml = (
                "section" in lower_name
                or lower_name.endswith("header.xml")
                or lower_name.endswith("settings.xml")
                or lower_name.endswith("content.hpf")
            )
            if not is_body_xml:
                continue

            try:
                root = ElementTree.fromstring(archive.read(name))
            except ElementTree.ParseError:
                continue

            for node in root.iter():
                if node.text and node.text.strip():
                    texts.append(node.text.strip())

    extracted = _clean_text(" ".join(texts))
    return extracted or "HWPX/OWPML 내부에서 추출 가능한 본문 텍스트를 찾지 못했습니다."


# .hwp 구형 바이너리 문서는 HWPX보다 훨씬 까다롭습니다.
# olefile로 OLE 컨테이너를 열고, BodyText/Section* 스트림의 HWPTAG_PARA_TEXT(67)를 읽습니다.
# 모든 HWP가 안정적으로 추출되지는 않으므로 실패하면 HWPX 변환 안내를 반환합니다.
def extract_hwp(content: bytes) -> str:
    try:
        import olefile
    except ModuleNotFoundError:
        return "HWP 바이너리 문서는 olefile 패키지 또는 HWPX 변환이 필요합니다."

    try:
        ole = olefile.OleFileIO(io.BytesIO(content))
    except Exception:
        return "HWP 파일 구조를 열 수 없습니다. HWPX로 변환 후 다시 업로드해주세요."

    try:
        header = ole.openstream("FileHeader").read()
        is_compressed = bool(header[36] & 1) if len(header) > 36 else False
        section_names = sorted(
            "/".join(path)
            for path in ole.listdir()
            if len(path) == 2 and path[0] == "BodyText" and path[1].startswith("Section")
        )

        chunks: list[str] = []
        for section_name in section_names:
            raw = ole.openstream(section_name).read()
            if is_compressed:
                import zlib

                raw = zlib.decompress(raw, -15)

            offset = 0
            while offset + 4 <= len(raw):
                header_value = struct.unpack_from("<I", raw, offset)[0]
                offset += 4
                tag_id = header_value & 0x3FF
                size = (header_value >> 20) & 0xFFF
                if size == 0xFFF:
                    if offset + 4 > len(raw):
                        break
                    size = struct.unpack_from("<I", raw, offset)[0]
                    offset += 4

                payload = raw[offset:offset + size]
                offset += size

                # HWPTAG_PARA_TEXT = 67이며, 본문 payload는 UTF-16LE 문자열입니다.
                if tag_id == 67 and payload:
                    chunks.append(payload.decode("utf-16le", errors="ignore"))

        text = _clean_text(" ".join(chunks))
        return text or "HWP 본문 텍스트를 찾지 못했습니다. HWPX로 변환하면 더 안정적으로 분석할 수 있습니다."
    except Exception:
        return "HWP 본문 추출 중 오류가 발생했습니다. HWPX로 변환 후 다시 업로드해주세요."
    finally:
        ole.close()


# 이미지는 현재 "이미지 자체를 이해하는 비전 모델"을 쓰는 것이 아닙니다.
# Pillow로 이미지 메타정보를 읽고, pytesseract로 이미지 안의 글자 OCR을 시도합니다.
# OCR까지 하려면 Python 패키지뿐 아니라 Tesseract 프로그램이 OS에 설치되어 있어야 합니다.
def inspect_image(content: bytes) -> str:
    try:
        from PIL import Image
    except ModuleNotFoundError:
        return "이미지 분석을 위해 Pillow 패키지가 필요합니다. requirements.txt 설치 후 다시 시도해주세요."

    image = Image.open(io.BytesIO(content))
    description = f"이미지 파일입니다. 크기: {image.width}x{image.height}px, 형식: {image.format}."

    try:
      import pytesseract
    except ModuleNotFoundError:
      return f"{description} 이미지 속 텍스트까지 발췌하려면 OCR 엔진(pytesseract/Tesseract)이 필요합니다."

    try:
        ocr_text = _clean_text(pytesseract.image_to_string(image, lang="kor+eng"))
    except Exception:
        return f"{description} OCR 실행 파일(Tesseract)이 설치되어 있지 않아 이미지 속 문자는 아직 읽을 수 없습니다."

    if not ocr_text:
        return f"{description} OCR로 읽힌 텍스트가 없습니다."
    return f"{description} OCR 추출 텍스트: {ocr_text}"


# 확장자를 보고 어떤 추출기를 사용할지 결정하는 입구 함수입니다.
def extract_file_text(filename: str, content: bytes) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    if extension == ".pdf":
        return extract_pdf(content), "PDF"
    if extension == ".hwpx":
        return extract_hwpx_owpml(content), "HWPX/OWPML"
    if extension == ".docx":
        return extract_docx(content), "DOCX"
    if extension in TEXT_EXTENSIONS:
        return extract_text(content), "TEXT"
    if extension in IMAGE_EXTENSIONS:
        return inspect_image(content), "IMAGE"
    if extension == ".hwp":
        return extract_hwp(content), "HWP"
    return "지원하지 않는 파일 형식입니다.", "UNKNOWN"


# OpenAI API가 없거나 실패했을 때도 답변을 만들기 위한 기본 분석 함수입니다.
# 진짜 LLM이 아니라, 위에서 추출한 텍스트에서 중요 문장/키워드를 규칙 기반으로 뽑습니다.
def build_analysis_answer(question: str, extracted_docs: list[dict]) -> dict:
    combined_text = "\n".join(doc["text"] for doc in extracted_docs if doc["text"])
    intent = _question_intent(question)
    relevant_chunks = rank_relevant_chunks(question, extracted_docs, 6)
    relevant_text = "\n".join(chunk["text"] for chunk in relevant_chunks) or combined_text
    highlights = _top_sentences(relevant_text, 10, question)
    summary_points = _extractive_summary(relevant_text, question, 4)
    terms = _frequent_terms(combined_text)
    metrics = _metric_candidates(combined_text)

    if not combined_text.strip():
        summary = (
            "업로드 파일은 받았지만 추출 가능한 본문 텍스트가 거의 없습니다. "
            "이미지라면 OCR 설치가 필요할 수 있고, 구형 HWP는 HWPX 변환이 더 안정적입니다."
        )
    else:
        summary = " ".join(summary_points) or combined_text[:600]

    comparison = [_doc_brief(doc) for doc in extracted_docs]
    keyword_sets = {item["filename"]: set(item["keywords"]) for item in comparison}

    answer_lines = [
        "OpenAI 없이 로컬 기본 분석으로 처리했습니다.",
        f"질문 의도: {intent}",
        "",
        "[핵심 내용 요약]",
    ]

    if summary_points:
        answer_lines.extend(f"{index}. {point}" for index, point in enumerate(summary_points, start=1))
    else:
        answer_lines.append(summary)

    answer_lines.extend([
        "",
        "[중요 문장 발췌]",
    ])

    if highlights:
        answer_lines.extend(f"- {sentence}" for sentence in highlights[:8])
    else:
        answer_lines.append("- 발췌할 문장을 찾지 못했습니다.")

    answer_lines.extend([
        "",
        "[중요 키워드]",
        ", ".join(terms) if terms else "키워드를 추출할 텍스트가 부족합니다.",
        "",
        "[실험 결과/수치 후보]",
    ])

    if metrics:
        answer_lines.extend(f"- {metric}" for metric in metrics)
    else:
        answer_lines.append("- 정확도, F1, AUC, % 등으로 표시된 실험 수치 후보를 찾지 못했습니다.")

    if relevant_chunks:
        answer_lines.extend([
            "",
            "[질문 관련 문서 구간]",
        ])
        for chunk in relevant_chunks[:4]:
            preview = _clean_text(chunk["text"])[:260]
            answer_lines.append(
                f"- {chunk['filename']} #{chunk['chunk_index']} "
                f"(관련도 {chunk['score']}): {preview}"
            )

    answer_lines.extend([
        "",
        "[문서별 핵심 발췌]",
    ])

    for item in comparison:
        answer_lines.append(f"- {item['filename']} ({item['format']})")
        answer_lines.extend(f"  · {point}" for point in item["key_points"][:4])
        if item["metrics"]:
            answer_lines.append(f"  · 수치 후보: {' / '.join(item['metrics'])}")
        if item["keywords"]:
            answer_lines.append(f"  · 키워드: {', '.join(item['keywords'][:6])}")

    if len(comparison) >= 2:
        answer_lines.extend(["", "[문서 간 차이점 후보]"])
        for item in comparison:
            other_terms = set().union(
                *(terms for filename, terms in keyword_sets.items() if filename != item["filename"])
            )
            unique_terms = [term for term in item["keywords"] if term not in other_terms]
            answer_lines.append(
                f"- {item['filename']}: {', '.join(unique_terms[:5]) if unique_terms else '다른 문서와 겹치는 키워드가 많습니다.'}"
            )

    if question:
        matched = _top_sentences(combined_text, 4, question)
        answer_lines.extend(["", "[질문 반영 답변]"])
        if matched:
            answer_lines.append(f"'{question}' 관점에서 가장 가까운 근거 문장은 아래와 같습니다.")
            answer_lines.extend(f"- {sentence}" for sentence in matched)
        else:
            answer_lines.append(f"'{question}'와 직접 연결되는 문장을 찾지 못해 전체 요약을 우선 제공했습니다.")

    return {
        "answer": "\n".join(answer_lines),
        "summary": summary,
        "keywords": terms,
        "metrics": metrics,
        "documents": comparison,
        "relevant_chunks": relevant_chunks,
    }
