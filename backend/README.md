# PaperMate Backend

FastAPI로 만든 PaperMate 백엔드입니다. 로그인, 프로젝트 저장, 문서 분석, 시각화 자료, 공유방 데이터를 처리합니다.

## 실행 방법

백엔드 폴더로 이동합니다.

```bat
cd backend
```

가상환경을 만들고 켭니다.

```bat
python -m venv venv
venv\Scripts\activate
```

필요한 패키지를 설치합니다.

```bat
pip install -r requirements.txt
```

환경변수 파일을 준비합니다.

```bat
copy .env.example .env
```

MongoDB를 켭니다.

```bat
docker start project-mongo-1
```

서버를 실행합니다.

```bat
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

서버 확인 주소입니다.

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/ready
```

## Docker 실행

프로젝트 루트에서 실행합니다.

```bat
docker compose up --build
```

운영 모드로 실행할 때는 프로젝트 루트에서 아래 명령을 사용합니다.

```bat
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

컨테이너 구성은 아래와 같습니다.

```text
frontend  nginx로 React 빌드 파일 서빙, /api 요청을 backend로 프록시
backend   FastAPI + Uvicorn
mongo     MongoDB 7
```

접속 주소입니다.

```text
프론트엔드: http://127.0.0.1:3000
백엔드 상태: http://127.0.0.1:8000/api/health
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
