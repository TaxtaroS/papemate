# PaperMate Backend

FastAPI로 만든 PaperMate 백엔드입니다. Docker 실행은 프로젝트 루트에서 합니다.

## Docker 실행

Docker Desktop을 켠 뒤 프로젝트 루트에서 실행합니다.

```bat
copy backend\.env.example backend\.env
docker compose up --build
```

브라우저는 아래 주소로 접속합니다.

```text
http://127.0.0.1:3000
```

백엔드 상태 확인 주소입니다.

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/ready
```

## 컨테이너 구성

```text
frontend  nginx로 React 빌드 파일 서빙, /api 요청을 backend로 프록시
backend   FastAPI + Uvicorn
mongo     MongoDB 7
```

## 백엔드만 직접 실행

Docker 없이 백엔드만 따로 확인할 때 사용합니다.

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## 트리 구조

```text
backend/
  main.py                  FastAPI 앱 시작 파일
  requirements.txt         Python 패키지 목록
  .env.example             환경변수 예시 파일
  Dockerfile               백엔드 Docker 이미지 설정

  app/
    core/
      config.py            환경변수와 서버 설정
      database.py          MongoDB 연결과 인덱스
      deps.py              로그인 사용자 확인
      security.py          비밀번호 해시와 JWT 토큰
      uploads.py           업로드 파일 개수/용량 검사

    routers/
      auth.py              회원가입, 로그인, 계정 관리
      projects.py          프로젝트 저장, 조회, 삭제
      analysis.py          문서 분석 Q&A
      visuals.py           표, 그래프, 이미지, 마인드맵 생성
      visual_assets.py     시각화 보관함 저장
      shared_rooms.py      공유방 저장
      discussion_comments.py 공유방 댓글 저장
      project_threads.py   분석 대화 기록 저장
      project_files.py     파일 메타데이터 저장

    services/
      document_analysis.py 문서 텍스트 추출과 기본 분석
      llm_analysis.py      OpenAI/Gemini 호출 연결부
      visual_buttons/      시각화 버튼별 생성 로직

  models/
    schemas.py             API 요청/응답 데이터 모양
```
