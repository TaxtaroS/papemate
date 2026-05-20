import io
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


# 공백과 HTML 엔티티를 정리해 분석하기 쉬운 한 줄 텍스트로 만듭니다.
def _clean_text(text: str) -> str:
    text = unescape(text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# 문장을 대략적으로 나눕니다.
# 완전한 자연어 처리 라이브러리는 아니고, 한국어/영어 문장 구분자를 기준으로 단순 분리합니다.
def _sentences(text: str) -> list[str]:
    pieces = re.split(r"(?<=[.!?。！？])\s+|(?<=[다요음함임됨])\.\s*|\n+", text)
    return [_clean_text(piece) for piece in pieces if len(_clean_text(piece)) > 18]


# 기본 분석에서 중요한 문장 후보를 고르기 위한 점수 함수입니다.
# 정확도, 실험, 데이터셋, 비교 같은 연구 문서 키워드가 있으면 점수를 더 줍니다.
def _keyword_score(sentence: str) -> int:
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
    return sum(2 for keyword in keywords if keyword in lowered) + min(len(sentence) // 80, 3)


# 문장 후보를 점수순으로 정렬해 상위 문장만 뽑습니다.
def _top_sentences(text: str, limit: int = 5) -> list[str]:
    ranked = sorted(_sentences(text), key=_keyword_score, reverse=True)
    return ranked[:limit]


# 자주 등장하는 단어를 뽑아 키워드 목록을 만듭니다.
# 조사/일반 단어는 stopwords로 제외합니다.
def _frequent_terms(text: str, limit: int = 10) -> list[str]:
    words = re.findall(r"[A-Za-z가-힣0-9]{2,}", text.lower())
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
    }
    counter = Counter(word for word in words if word not in stopwords)
    return [word for word, _ in counter.most_common(limit)]


# PDF 분석은 PyMuPDF의 fitz.open(stream=..., filetype="pdf")를 사용합니다.
# 각 페이지의 텍스트를 page.get_text("text")로 꺼내 이어 붙입니다.
def extract_pdf(content: bytes) -> str:
    try:
        import fitz
    except ModuleNotFoundError:
        return "PDF 분석을 위해 PyMuPDF 패키지가 필요합니다. requirements.txt 설치 후 다시 시도해주세요."

    with fitz.open(stream=content, filetype="pdf") as document:
        return "\n".join(page.get_text("text") for page in document)


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
    return _iter_zip_xml_text(content, ("header.xml", "section0.xml", "section1.xml", "section2.xml", "section3.xml"))


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
    highlights = _top_sentences(combined_text, 6)
    terms = _frequent_terms(combined_text)

    if not combined_text.strip():
        summary = "분석할 텍스트를 찾지 못했습니다. PDF, HWPX, TXT, DOCX 문서를 업로드해주세요."
    else:
        summary = " ".join(highlights[:3]) or combined_text[:500]

    comparison = []
    for doc in extracted_docs:
        top = _top_sentences(doc["text"], 2)
        comparison.append(
            {
                "filename": doc["filename"],
                "format": doc["format"],
                "key_points": top or [doc["text"][:180] if doc["text"] else "추출된 텍스트가 없습니다."],
            }
        )

    answer_lines = [
        "업로드한 자료를 기준으로 분석했습니다.",
        "",
        "[핵심 내용]",
        summary,
        "",
        "[중요 키워드]",
        ", ".join(terms) if terms else "키워드를 추출할 텍스트가 부족합니다.",
        "",
        "[실험 결과/차이점 후보]",
    ]

    for item in comparison:
        answer_lines.append(f"- {item['filename']} ({item['format']}): {' / '.join(item['key_points'])}")

    if question:
        answer_lines.extend(["", "[질문 반영]", f"'{question}' 관점으로 위 문장을 우선 추출했습니다."])

    return {
        "answer": "\n".join(answer_lines),
        "summary": summary,
        "keywords": terms,
        "documents": comparison,
    }
