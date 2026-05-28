# PaperMate Backend

PaperMate의 FastAPI 백엔드 서버입니다.  
React/Vite 프론트엔드가 직접 처리하기 어려운 로그인, MongoDB 저장, 파일 분석, LLM 호출, 시각화 생성 API를 담당합니다.

## 역할

```text
React/Vite frontend
  -> FastAPI backend
    -> MongoDB
    -> document parser
    -> OpenAI/Gemini
```

FastAPI가 맡는 일:

- 로그인, 회원가입, JWT 토큰 발급
- MongoDB 사용자/프로젝트 저장
- PDF, DOCX, HWPX/OWPML, HWP, 이미지, TXT 파일 분석
- OpenAI/Gemini API 호출
- LLM 키가 없을 때 로컬 기본 문서 추출 분석
- 표, 그래프, 이미지 설명, 마인드맵 시각화 데이터 생성
- 배포 빌드 시 `frontend/dist` 정적 파일 서빙

## 실행 순서

Windows PowerShell 기준:

```powershell
cd C:\Users\pokfamadm\Desktop\project\project_v1\backend
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

브라우저/프론트에서 확인:

```text
http://127.0.0.1:8000/api/health
```

정상 예시:

```json
{
  "status": "ok",
  "database": "papermate",
  "connected": true
}
```

## 환경 변수

`.env` 또는 실행 환경에서 설정합니다.  
실제 API 키는 브라우저에 넣지 않고 백엔드의 `backend/.env`에 저장합니다.

처음 설정할 때:

```powershell
cd C:\Users\pokfamadm\Desktop\project\project_v1\backend
Copy-Item .env.example .env
notepad .env
```

`.env`에 실제 키를 넣은 뒤 FastAPI 서버를 재시작해야 반영됩니다.  
`backend/.env`는 `.gitignore`에 들어가 있으므로 GitHub에 올리지 않습니다.

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB 연결 주소 |
| `MONGO_DB_NAME` | `papermate` | 사용할 DB 이름 |
| `JWT_SECRET_KEY` | `change-this-secret-in-production` | JWT 서명 키 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 로그인 토큰 만료 시간 |
| `CORS_ORIGINS` | 개발 기본값 | 허용할 프론트 주소 목록 |
| `OPENAI_API_KEY` | 없음 | OpenAI 기본 키 |
| `OPENAI_MODEL` | `gpt-4.1-mini` | OpenAI 모델 |
| `GOOGLE_API_KEY` 또는 `GEMINI_API_KEY` | 없음 | Gemini 키 |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini 모델 |
| `FRONTEND_BUILD_DIR` | `../frontend/dist` | 배포용 프론트 빌드 경로 |

## 폴더 구조

현재 실행 경로는 `app` 패키지를 기준으로 정리했습니다.

```text
backend/
  main.py
  requirements.txt
  DATABASE_SCHEMA.md
  app/
    core/
      database.py       # MongoDB 연결, 인덱스, 상태 확인
      deps.py           # 로그인 사용자 확인 의존성
      security.py       # bcrypt, JWT
    routers/
      auth.py           # 회원가입, 로그인, 프로필, 비밀번호, 탈퇴
      projects.py       # 프로젝트 저장, 조회, 삭제, 초대코드 조회
      analysis.py       # 파일 업로드 + 문서 분석 Q&A
      visuals.py        # 표/그래프/이미지/마인드맵 생성
    services/
      document_analysis.py  # 문서 파싱, 로컬 기본 분석
      llm_analysis.py       # OpenAI/Gemini 호출
      visual_buttons/       # 시각화 생성기
  models/
    schemas.py          # Pydantic 요청/응답 모델
```

예전에 있던 `backend/services` 폴더는 `backend/app/services`와 중복되어 삭제했습니다.  
새 서비스 코드는 반드시 `backend/app/services` 아래에 추가합니다.

## 주요 API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 서버와 MongoDB 연결 상태 확인 |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인, JWT 토큰 발급 |
| `PATCH` | `/api/auth/profile` | 닉네임 수정 |
| `PATCH` | `/api/auth/password` | 비밀번호 변경 |
| `DELETE` | `/api/auth/account` | 계정 삭제 |
| `GET` | `/api/projects` | 로그인 사용자의 프로젝트 목록 조회 |
| `PUT` | `/api/projects/sync` | 프론트 프로젝트 목록 전체 동기화 |
| `POST` | `/api/projects` | 프로젝트 하나 저장/upsert |
| `GET` | `/api/projects/invite/{invite_code}` | 초대코드로 프로젝트 조회 |
| `DELETE` | `/api/projects/{project_id}` | 프로젝트 삭제 |
| `POST` | `/api/analysis/chat` | 파일 업로드 + 분석 Q&A |
| `POST` | `/api/visuals/{type}` | 시각화 자료 생성 |

## 문서 분석 흐름

`POST /api/analysis/chat` 요청 흐름:

```text
UploadFile
  -> extract_file_text()
  -> build_analysis_answer()
  -> analyze_with_llm()
  -> AnalysisResponse
```

지원 형식:

| 형식 | 처리 방식 |
| --- | --- |
| PDF | PyMuPDF로 텍스트 추출 |
| DOCX | ZIP 내부 `word/document.xml` 추출 |
| HWPX/OWPML | ZIP 내부 XML 본문 추출 |
| HWP | OLE BodyText 스트림 추출 시도 |
| 이미지 | Pillow 메타정보 + pytesseract OCR 시도 |
| TXT/MD/CSV | UTF-8, CP949, EUC-KR 순서로 디코딩 |

## 한국어 기본 분석 개선

OpenAI/Gemini 키가 없어도 기본 분석이 작동하도록 `document_analysis.py`에서 규칙 기반 분석을 수행합니다.

현재 적용된 개선:

- 공통 전처리 함수 `preprocess_korean_text()`
- 제어문자, 각주 표식, 불필요 기호 제거
- `soynlp`가 설치되어 있으면 반복 문자/이모티콘 정규화
- `pykospacing`이 설치되어 있고 텍스트가 짧으면 선택형 띄어쓰기 보정
- 한국어 조사/어미 제거 기반 키워드 정규화
- `RAG`, `LLM`, `BERT`, `OWPML`, `HWPX`, `FastAPI`, `MongoDB`, `정확도`, `데이터셋` 같은 도메인 용어 사전
- `customized_konlpy`가 설치되어 있으면 사용자 사전 기반 형태소 분석 사용
- 설치되어 있지 않으면 정규식 기반 토큰화로 안전하게 fallback
- 긴 문서를 청크로 나눈 뒤 질문과 가까운 구간을 먼저 고르는 로컬 RAG식 검색
- TF-IDF식 점수로 질문 관련 구간을 랭킹하고 `relevant_chunks`로 응답

참고한 자료:

- WikiDocs, **딥 러닝을 이용한 자연어 처리 입문 - RAG, 에이전트, 파인튜닝까지**, https://wikidocs.net/book/2155
- WikiDocs, **27-02 MemN으로 한국어 QA 해보기**, https://wikidocs.net/85470
- WikiDocs, **02-10 한국어 전처리 패키지**, https://wikidocs.net/92961
- WikiDocs, **04-04 TF-IDF(Term Frequency-Inverse Document Frequency)**, https://wikidocs.net/31698
- WikiDocs, **22-03 랭체인을 이용한 텍스트 청킹**, https://wikidocs.net/288612
- 참고 내용: 한국어 QA에서 형태소 분석기와 사용자 사전을 사용하는 아이디어, 한국어 반복 문자 정규화/띄어쓰기 보정/soynlp 소개, TF-IDF 기반 중요도 계산, 긴 텍스트를 청크로 나누는 RAG 전처리 아이디어
- 적용 방식: 예제 코드를 그대로 가져오지 않고, PaperMate의 로컬 문서 분석 키워드 추출에 맞게 선택형 토큰화 구조로 재구성

## HWPX/OWPML 처리

HWPX는 OWPML 기반의 ZIP + XML 문서입니다.  
현재 `extract_hwpx_owpml()`은 아래 XML을 중심으로 텍스트를 찾습니다.

- `section`이 들어간 XML
- `header.xml`
- `settings.xml`
- `content.hpf`

기존처럼 `section0.xml`부터 `section3.xml`까지만 보는 방식보다 긴 문서의 뒷부분을 놓칠 가능성이 줄었습니다.

## DB 스키마

데이터베이스 컬렉션과 프로젝트 저장 구조는 [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)에 정리되어 있습니다.

현재 실제 컬렉션:

```text
users
projects
```

추후 분리 후보:

```text
project_files
project_threads
visual_assets
shared_rooms
discussion_comments
```

현재 결론은 개발 테스트 단계에서는 `users`, `projects`를 유지하고, 배포/협업 기능이 커질 때 순차 분리하는 것입니다.

## 검증 명령

백엔드 문법 확인:

```powershell
cd C:\Users\pokfamadm\Desktop\project\project_v1\backend
.\venv\Scripts\python.exe -m py_compile main.py app\routers\auth.py app\routers\projects.py app\routers\analysis.py app\routers\visuals.py
```

FastAPI import 확인:

```powershell
.\venv\Scripts\python.exe -c "import main; print(main.app.title); print(len(main.app.routes))"
```

기본 API 확인:

```powershell
.\venv\Scripts\python.exe -c "from fastapi.testclient import TestClient; import main; c=TestClient(main.app); print(c.get('/api/health').json())"
```

## 다음 작업 후보

- 프로젝트 저장 로직을 `project_service.py`로 분리
- 공유방 기능을 `share_room_service.py`로 분리
- 댓글 기능을 `comment_service.py`로 분리
- 실제 파일 저장소 설계 후 `file_storage.py` 추가
- `visual_assets` 컬렉션부터 실제 분리 시작
