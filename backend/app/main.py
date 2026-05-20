from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import ensure_indexes
from .routers.analysis import router as analysis_router
from .routers.auth import router as auth_router


# FastAPI 애플리케이션의 진입점입니다.
# 프론트엔드 React 앱은 services/api.js의 axios 요청을 통해 이 서버와 통신합니다.
app = FastAPI(title="PaperMate API")

# CORS는 브라우저가 다른 포트의 API를 호출할 수 있게 허용하는 설정입니다.
# React 개발 서버는 보통 localhost:3000 또는 3001에서 뜨고,
# FastAPI는 보통 localhost:8000에서 뜨기 때문에 이 설정이 필요합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 각 기능별 라우터를 FastAPI 앱에 등록합니다.
# auth_router: 로그인/회원가입
# analysis_router: 문서 업로드 및 AI 분석
app.include_router(auth_router)
app.include_router(analysis_router)


# 서버 시작 시 MongoDB 인덱스를 준비합니다.
# 로그인/회원가입에서 username 중복 검사 같은 동작이 안정적으로 작동하게 합니다.
@app.on_event("startup")
async def on_startup():
    await ensure_indexes()


# 서버가 살아 있는지 확인하는 간단한 상태 체크 API입니다.
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
