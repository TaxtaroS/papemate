import io
import os
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.document_conversion import render_text_preview_pdf


PREVIEW_CACHE: dict[tuple[str, int], bytes] = {}
PREVIEW_EXTENSIONS = {".hwp", ".hwpx"}


def _clean_preview_text(text: str) -> str:
    return " ".join(str(text or "").split())


def _extract_hwpx_preview_text(content: bytes) -> str:
    texts: list[str] = []
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            for name in archive.namelist():
                lower_name = name.lower()
                if not lower_name.endswith(".xml"):
                    continue
                if not any(part in lower_name for part in ("contents/", "section", "bodytext")):
                    continue
                try:
                    root = ElementTree.fromstring(archive.read(name))
                except ElementTree.ParseError:
                    continue
                for node in root.iter():
                    if node.text and node.text.strip():
                        texts.append(node.text.strip())
    except Exception:
        return ""
    return _clean_preview_text(" ".join(texts))


def _extract_hwp_preview_text(content: bytes) -> str:
    try:
        import olefile
    except ModuleNotFoundError:
        return ""

    try:
        ole = olefile.OleFileIO(io.BytesIO(content))
    except Exception:
        return ""

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
                header_value = int.from_bytes(raw[offset:offset + 4], "little")
                offset += 4
                tag_id = header_value & 0x3FF
                size = (header_value >> 20) & 0xFFF
                if size == 0xFFF:
                    if offset + 4 > len(raw):
                        break
                    size = int.from_bytes(raw[offset:offset + 4], "little")
                    offset += 4

                payload = raw[offset:offset + size]
                offset += size
                if tag_id == 67 and payload:
                    chunks.append(payload.decode("utf-16le", errors="ignore"))
        return _clean_preview_text(" ".join(chunks))
    except Exception:
        return ""
    finally:
        ole.close()


def _convert_with_office(filename: str, content: bytes) -> bytes | None:
    """Use an installed office renderer when available, keeping preview separate from analysis."""

    command = os.getenv("DOCUMENT_PREVIEW_OFFICE_COMMAND", "soffice").strip() or "soffice"
    suffix = Path(filename).suffix.lower() or ".document"
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = Path(tmpdir) / f"preview{suffix}"
            output_dir = Path(tmpdir) / "out"
            output_dir.mkdir(parents=True, exist_ok=True)
            input_path.write_bytes(content)

            subprocess.run(
                [
                    command,
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(output_dir),
                    str(input_path),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=settings.hwp_parser_timeout_seconds,
            )
            pdf_files = list(output_dir.glob("*.pdf"))
            if not pdf_files:
                return None
            return pdf_files[0].read_bytes()
    except Exception:
        return None


def _fallback_text_preview(filename: str, content: bytes) -> bytes:
    extension = Path(filename).suffix.lower()
    if extension == ".hwpx":
        text = _extract_hwpx_preview_text(content)
        source_format = "HWPX preview"
    else:
        text = _extract_hwp_preview_text(content)
        source_format = "HWP preview"

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="원본 미리보기 렌더러가 없고 문서 본문 텍스트도 추출하지 못했습니다.",
        )
    return render_text_preview_pdf(filename, text, source_format=source_format)


def create_document_preview_pdf(filename: str, content: bytes) -> bytes:
    extension = Path(filename).suffix.lower()
    if extension not in PREVIEW_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HWP/HWPX 파일만 PDF 미리보기를 생성할 수 있습니다.",
        )

    cache_key = (filename, hash(content))
    cached_pdf = PREVIEW_CACHE.get(cache_key)
    if cached_pdf:
        return cached_pdf

    pdf_bytes = _convert_with_office(filename, content) or _fallback_text_preview(filename, content)
    if len(PREVIEW_CACHE) > 20:
        PREVIEW_CACHE.clear()
    PREVIEW_CACHE[cache_key] = pdf_bytes
    return pdf_bytes
