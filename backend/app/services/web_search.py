"""Explicit web-search support for document comparison requests."""

import html
import re
from urllib.parse import quote_plus, unquote, urlparse, parse_qs

import httpx


WEB_SEARCH_TIMEOUT_SECONDS = 8
WEB_SEARCH_MAX_RESULTS = 4
WEB_SEARCH_TRIGGER = re.compile(
    r"(웹\s*검색|인터넷|온라인|최신|검색해서|검색해\s*줘|외부\s*자료|웹\s*자료|뉴스|사이트|기사|비교해\s*줘|비교)",
    re.IGNORECASE,
)


def wants_web_search(question: str) -> bool:
    text = str(question or "")
    if not WEB_SEARCH_TRIGGER.search(text):
        return False
    return bool(re.search(r"(웹|인터넷|온라인|최신|검색|외부|뉴스|사이트|기사)", text, re.IGNORECASE))


def _strip_tags(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_ddg_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.path == "/l/":
        uddg = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(uddg) or value
    return value


def web_search(question: str, limit: int = WEB_SEARCH_MAX_RESULTS) -> list[dict]:
    query = quote_plus(str(question or "").strip())
    if not query:
        return []

    url = f"https://duckduckgo.com/html/?q={query}"
    try:
        response = httpx.get(
            url,
            timeout=WEB_SEARCH_TIMEOUT_SECONDS,
            headers={"User-Agent": "PaperMate/1.0 document comparison"},
            follow_redirects=True,
        )
        response.raise_for_status()
    except Exception:
        return []

    results = []
    blocks = re.findall(
        r'<a[^>]+class="result__a"[^>]+href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>.*?'
        r'<a[^>]+class="result__snippet"[^>]*>(?P<snippet>.*?)</a>',
        response.text,
        flags=re.S,
    )
    for raw_url, raw_title, raw_snippet in blocks:
        item = {
            "title": _strip_tags(raw_title),
            "url": _normalize_ddg_url(html.unescape(raw_url)),
            "snippet": _strip_tags(raw_snippet),
        }
        if item["title"] and item["url"] and item not in results:
            results.append(item)
        if len(results) >= limit:
            break
    return results


def search_results_to_docs(results: list[dict]) -> list[dict]:
    docs = []
    for index, result in enumerate(results or [], start=1):
        title = result.get("title") or "웹 검색 결과"
        url = result.get("url") or ""
        snippet = result.get("snippet") or ""
        text = f"제목: {title}\nURL: {url}\n요약: {snippet}".strip()
        if not snippet:
            continue
        docs.append(
            {
                "filename": f"웹 검색 결과 {index}",
                "format": "web_search",
                "source_label": f"웹 {index}",
                "url": url,
                "text": text,
            }
        )
    return docs
