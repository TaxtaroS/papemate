# 초보자 안내:
# 이 파일은 FastAPI 백엔드의 진입점입니다.
# 프론트엔드의 main.tsx가 React 앱을 시작하듯이, 여기서는 API 서버를 만들고
# 로그인/분석/프로젝트/시각화 라우터와 배포용 프론트 파일을 연결합니다.

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.database import ensure_indexes, ping_database
from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.visuals import router as visuals_router


PROJECT_ROOT = Path(__file__).resolve().parent.parent

# CORS는 "프론트 주소에서 백엔드 API를 호출해도 되는가"를 정하는 목록입니다.
# Vite 개발 서버(3000, 5173)와 FastAPI 단독 실행(8000)을 기본으로 허용합니다.
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

RESERVED_FRONTEND_PATHS = {"docs", "openapi.json", "redoc"}


def _normalize_origin(origin: str) -> str:
    """CORS 주소 끝의 슬래시를 제거해 브라우저 Origin 형식과 맞춥니다."""

    return origin.strip().rstrip("/")


def _cors_origins() -> list[str]:
    """환경변수 CORS_ORIGINS가 있으면 사용하고, 없으면 개발 기본값을 씁니다."""

    configured = os.getenv("CORS_ORIGINS", "")
    raw_origins = configured.split(",") if configured else DEFAULT_CORS_ORIGINS

    origins: list[str] = []
    for origin in raw_origins:
        normalized = _normalize_origin(origin)
        if normalized and normalized not in origins:
            origins.append(normalized)
    return origins


def _frontend_build_dir() -> Path:
    """배포 빌드 결과물(dist)의 위치를 반환합니다."""

    configured = os.getenv("FRONTEND_BUILD_DIR")
    if configured:
        return Path(configured)
    return PROJECT_ROOT / "frontend" / "dist"


def _register_routers(api: FastAPI) -> None:
    """기능별 API 라우터를 FastAPI 앱에 연결합니다."""

    api.include_router(auth_router)
    api.include_router(analysis_router)
    api.include_router(projects_router)
    api.include_router(visuals_router)


def _mount_frontend(api: FastAPI, build_dir: Path) -> None:
    """프론트엔드 빌드 파일이 있으면 FastAPI가 함께 서빙하도록 연결합니다."""

    if not build_dir.exists():
        return

    assets_dir = build_dir / "assets"
    if assets_dir.exists():
        api.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @api.get("/{full_path:path}", include_in_schema=False, response_model=None)
    async def serve_react_app(full_path: str):
        # React Router 주소로 새로고침해도 index.html을 돌려줘야 SPA가 살아납니다.
        if full_path in RESERVED_FRONTEND_PATHS:
            return {"message": "API documentation is disabled."}

        requested_file = build_dir / full_path
        if full_path and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(build_dir / "index.html")


app = FastAPI(
    title="PaperMate API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


# CORS는 프론트엔드 주소에서 백엔드 API를 호출할 수 있게 허용하는 설정입니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_register_routers(app)


@app.on_event("startup")
async def on_startup() -> None:
    # 서버가 켜질 때 MongoDB 검색 속도를 위한 인덱스를 준비합니다.
    # MongoDB가 꺼져 있어도 문서 분석 기능은 쓸 수 있도록 database.py에서 예외를 처리합니다.
    await ensure_indexes()


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    """프론트에서 백엔드와 DB 연결 상태를 확인할 때 쓰는 점검 API입니다."""

    db_status = await ping_database()
    return {"status": "ok", **db_status}


_mount_frontend(app, _frontend_build_dir())
