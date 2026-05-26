# 초보자 안내: FastAPI 백엔드 서버를 만들고 API 라우터와 정적 프론트 파일 서빙을 연결하는 시작 파일입니다.

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.database import ensure_indexes, ping_database
from app.routers.analysis import router as analysis_router
from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.visuals import router as visuals_router

app = FastAPI(
    title="PaperMate API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "")
    defaults = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    custom = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return custom or defaults


# CORS는 프론트엔드 주소에서 백엔드 API를 호출할 수 있게 허용하는 설정입니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기능별 API 라우터를 FastAPI 앱에 연결합니다.
# 각 라우터 파일 안에 /api/auth, /api/analysis 같은 기본 주소가 이미 적혀 있습니다.
app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(projects_router)
app.include_router(visuals_router)


@app.on_event("startup")
async def on_startup():
    # 서버가 켜질 때 MongoDB 검색 속도를 위한 인덱스를 준비합니다.
    # MongoDB가 꺼져 있어도 문서 분석 기능은 쓸 수 있도록 database.py에서 예외를 처리합니다.
    await ensure_indexes()


@app.get("/api/health")
async def health_check():
    db_status = await ping_database()
    return {"status": "ok", **db_status}


# 배포 환경에서는 Vite가 만든 frontend/dist 폴더의 정적 파일을 FastAPI가 직접 내려줍니다.
frontend_build_dir = Path(
    os.getenv(
        "FRONTEND_BUILD_DIR",
        Path(__file__).resolve().parent.parent / "frontend" / "dist",
    )
)

if frontend_build_dir.exists():
    assets_dir = frontend_build_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(full_path: str):
        # API 문서 주소처럼 백엔드가 직접 처리해야 하는 경로는 React 화면으로 넘기지 않습니다.
        if full_path in ["docs", "openapi.json", "redoc"]:
            return {"message": "Use /docs for API documentation"}

        requested_file = frontend_build_dir / full_path
        if full_path and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(frontend_build_dir / "index.html")
