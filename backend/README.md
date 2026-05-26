# PaperMate Backend

FastAPI로 만든 PaperMate API 서버입니다.

## CMD 실행 순서

```bat
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 주요 API

- `GET /api/health`: 서버와 MongoDB 연결 상태를 확인합니다.
- `POST /api/auth/signup`: 회원가입을 처리합니다.
- `POST /api/auth/login`: 로그인을 처리하고 JWT 토큰을 발급합니다.
- `POST /api/analysis/chat`: 업로드한 문서와 질문을 받아 분석 결과를 반환합니다.
- `POST /api/visuals/{type}`: 분석 결과를 표, 그래프, 마인드맵 등으로 변환합니다.
- `GET /api/projects`: 로그인한 사용자의 프로젝트 목록을 불러옵니다.

## 참고

MongoDB가 꺼져 있어도 문서 분석 라우터는 서버 시작 단계에서 바로 죽지 않도록 처리되어 있습니다. 다만 로그인, 프로젝트 저장처럼 DB가 필요한 기능은 MongoDB가 실행 중이어야 정상 동작합니다.

프론트엔드는 Vite로 빌드되며, 배포 빌드 결과는 `frontend/dist` 폴더에 만들어집니다.
