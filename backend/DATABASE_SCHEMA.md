# PaperMate Database Schema

이 문서는 현재 FastAPI 백엔드가 MongoDB에 저장하는 데이터 구조를 정리한 파일입니다.

현재 DB 이름은 환경변수 `MONGO_DB_NAME`으로 정하며, 기본값은 `papermate`입니다.

## Collections

현재 핵심 컬렉션은 두 개입니다.

| Collection | 역할 |
| --- | --- |
| `users` | 회원가입, 로그인, 프로필, 비밀번호 변경에 사용하는 사용자 정보 |
| `projects` | 분석 프로젝트, 공유 분석 프로젝트, 초대코드 기반 프로젝트 조회 데이터 |

## `users`

회원 계정 하나가 문서 하나로 저장됩니다.

```json
{
  "_id": "ObjectId",
  "username": "user14530",
  "display_name": "user14530",
  "password_hash": "bcrypt hash",
  "created_at": "2026-05-27T00:00:00Z"
}
```

| Field | Type | Required | 설명 |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Yes | MongoDB가 자동 생성하는 사용자 고유 ID |
| `username` | `string` | Yes | 로그인 아이디, 중복 불가 |
| `display_name` | `string` | Yes | 화면에 보여주는 이름 |
| `password_hash` | `string` | Yes | 원본 비밀번호가 아닌 해시값 |
| `created_at` | `datetime` | Yes | 회원가입 시각 |

### Indexes

| Index | Unique | 목적 |
| --- | --- | --- |
| `username` | Yes | 중복 가입 방지, 로그인 조회 |

## `projects`

프로젝트 하나가 문서 하나로 저장됩니다.  
백엔드는 소유자와 조회용 필드를 바깥에 두고, 실제 화면 데이터는 `project` 객체 안에 통째로 저장합니다.

```json
{
  "_id": "ObjectId",
  "user_id": "66501234567890abcdef1234",
  "invite_code": "aa33ddf",
  "project": {
    "id": "project-1710000000000",
    "type": "분석",
    "title": "이미지 분류",
    "owner": "user14530",
    "updatedAt": "2026.05.27",
    "date": "2026.05.27",
    "charts": 2,
    "isHwp": false,
    "inviteCode": "aa33ddf",
    "files": [],
    "thread": [],
    "visuals": []
  },
  "created_at": "2026-05-27T00:00:00Z",
  "updated_at": "2026-05-27T00:00:00Z"
}
```

| Field | Type | Required | 설명 |
| --- | --- | --- | --- |
| `_id` | `ObjectId` | Yes | MongoDB가 자동 생성하는 문서 ID |
| `user_id` | `string` | Yes | 프로젝트를 소유한 사용자 ID |
| `invite_code` | `string \| null` | No | 초대코드 빠른 조회용 복사 필드 |
| `project` | `object` | Yes | 프론트 프로젝트 카드와 분석/공유 데이터 전체 |
| `created_at` | `datetime` | Yes | 처음 저장된 시각 |
| `updated_at` | `datetime` | Yes | 마지막 저장/동기화 시각 |

### Indexes

| Index | Unique | 목적 |
| --- | --- | --- |
| `user_id + project.id` | Yes | 같은 사용자의 프로젝트 ID 중복 방지 |
| `invite_code` | No | 초대코드로 프로젝트 조회 |
| `project.inviteCode` | No | 과거/프론트 필드 기준 초대코드 조회 보조 |
| `updated_at` | No | 최신 프로젝트 정렬 |

## `project` Object

`project` 객체는 프론트 기능이 아직 빠르게 바뀌고 있어서, 백엔드에서는 엄격한 하위 스키마로 고정하지 않고 JSON 객체로 저장합니다.  
그래도 현재 화면이 기대하는 대표 필드는 아래와 같습니다.

| Field | Type | 설명 |
| --- | --- | --- |
| `id` | `string` | 프론트 프로젝트 고유 ID |
| `source` | `string` | 공유 토론에서 만든 카드는 `shared-discussion` |
| `type` | `string` | `분석`, `HWP`, `공유 분석`, `New` 등 카드 종류 |
| `title` | `string` | 프로젝트 카드 제목 |
| `owner` | `string` | 만든 사용자 이름 |
| `updatedAt` | `string` | 화면 표시용 최근 수정일 |
| `date` | `string` | 화면 표시용 날짜 |
| `charts` | `number` | 저장된 시각화 개수 |
| `isHwp` | `boolean` | HWP/HWPX 기반 프로젝트 여부 |
| `inviteCode` | `string` | 프로젝트마다 고정되는 초대코드 |
| `files` | `array` | 업로드한 문서/이미지의 메타데이터 |
| `thread` | `array` | 분석 Q&A 대화 기록 |
| `visuals` | `array` | 표, 그래프, 이미지, 마인드맵 등 시각화 보관함 |
| `discussionImages` | `array` | 공유 페이지 토론용 이미지 |
| `discussionComments` | `array` | 공유 페이지 토론 댓글 |
| `sourceProjects` | `array` | 공유 분석 카드가 참조한 원본 프로젝트 목록 |
| `createdAt` | `string` | 공유 분석 카드 생성 시각 |

## Nested Examples

### `files[]`

```json
{
  "name": "paper.pdf",
  "size": 2048000,
  "type": "application/pdf",
  "lastModified": 1710000000000
}
```

### `thread[]`

```json
{
  "id": "msg-1710000000000",
  "role": "user",
  "text": "핵심 실험 결과를 요약해줘"
}
```

`role`은 보통 `user`, `ai`, `system`, `asset` 중 하나입니다.

### `visuals[]`

```json
{
  "id": "visual-table-1710000000000",
  "kind": "table",
  "title": "실험 결과 비교표",
  "desc": "업로드 문서에서 추출한 비교 요약",
  "details": [],
  "rows": [],
  "date": "2026.05.27",
  "projectId": "project-1710000000000",
  "projectTitle": "이미지 분류"
}
```

`kind`는 현재 `table`, `graph`, `image`, `mindmap` 중심으로 사용합니다.

## 저장 흐름

1. 사용자가 회원가입하면 `users`에 계정이 저장됩니다.
2. 로그인하면 JWT 토큰이 발급되고, 이후 프로젝트 API는 토큰에서 `user_id`를 읽습니다.
3. 분석 페이지에서 프로젝트 저장을 누르면 프론트의 프로젝트 객체가 `/api/projects`로 전달됩니다.
4. 백엔드는 `projects` 컬렉션에서 `user_id + project.id` 기준으로 upsert합니다.
5. 공유 페이지에서 초대코드를 입력하면 `/api/projects/invite/{invite_code}`로 프로젝트를 조회합니다.

## API Response Schemas

DB 저장 구조와 별개로, 프론트가 API에서 기대하는 대표 응답은 아래처럼 고정했습니다.

### `POST /api/analysis/chat`

```json
{
  "answer": "기본 문서 추출 또는 LLM 분석 답변",
  "documents": [],
  "keywords": [],
  "metrics": [],
  "relevant_chunks": [],
  "intent": "summary",
  "llm_used": false,
  "provider": "openai",
  "model": null,
  "llm_error": "OpenAI API 키가 없어 기본 문서 추출로 응답했습니다."
}
```

`llm_used`가 `false`여도 `answer`는 항상 기본 문서 추출 결과로 채워지는 것을 목표로 합니다.  
LLM 키가 없거나 호출에 실패하면 `llm_error`에 이유를 담습니다.

### `POST /api/visuals/{type}`

```json
{
  "visual": {
    "id": "visual-table-1710000000000",
    "kind": "table",
    "title": "실험 결과 비교표",
    "desc": "시각화 설명",
    "rows": []
  }
}
```

`type`은 현재 `table`, `graph`, `image`, `mindmap`을 사용합니다.

### `GET /api/projects`

```json
{
  "projects": []
}
```

### `POST /api/projects`

```json
{
  "project": {}
}
```

## 앞으로 고정하면 좋은 부분

아직은 `project` 내부가 자유로운 JSON이지만, 배포 전에는 아래를 별도 모델로 나누면 더 안정적입니다.

| 후보 모델 | 이유 |
| --- | --- |
| `StoredFile` | 파일 메타데이터 필드 고정 |
| `ChatMessage` | 대화 기록 저장/삭제/검색 안정화 |
| `VisualAsset` | 표, 그래프, 이미지, 마인드맵 구조 고정 |
| `DiscussionComment` | 공유 댓글 작성자/삭제 권한 처리 |
| `SharedRoom` | 공유방 참여자와 댓글을 프로젝트와 분리 저장 |

## Collection Split Decision

현재 단계에서는 컬렉션을 `users`, `projects` 두 개로 유지합니다.

이유는 지금 프론트가 프로젝트 카드, 분석 대화, 시각화 보관함, 공유 토론 내용을 한 프로젝트 객체로 복원하는 구조이기 때문입니다. 이 상태에서 공유방/댓글을 갑자기 별도 컬렉션으로 나누면 프론트 복원 로직도 함께 크게 바꿔야 합니다.

다만 배포 전 또는 실시간 협업 기능을 넣기 전에는 아래처럼 분리하는 방향이 좋습니다.

| Future Collection | 분리 시점 | 저장할 데이터 |
| --- | --- | --- |
| `project_files` | 실제 파일 업로드/다운로드를 서버 저장소로 옮길 때 | 파일 메타데이터, 저장 경로, 소유 프로젝트 |
| `project_threads` | 분석 대화 검색/삭제/권한 처리가 필요할 때 | Q&A 메시지, 작성자, 생성 시각 |
| `visual_assets` | 시각화 자료를 파일처럼 관리할 때 | 표/그래프/이미지/마인드맵 데이터 |
| `shared_rooms` | 공유방 참여자와 초대코드 권한이 커질 때 | 방 정보, 메인 프로젝트, 참여자 |
| `discussion_comments` | 댓글 삭제 권한, 작성자별 필터, 알림이 필요할 때 | 댓글 본문, 작성자, 대상 자료 |

지금 결론:

```text
개발 테스트 단계: users + projects 유지
배포/협업 강화 단계: shared_rooms, discussion_comments, visual_assets 순서로 분리
```

## Future Collection Drafts

아래 스키마는 바로 적용하는 코드가 아니라, 현재 프론트 코드에서 쓰는 필드를 기준으로 정리한 분리 설계 초안입니다.  
Pydantic 초안은 `backend/models/schemas.py`의 `StoredFile`, `ChatMessage`, `VisualAsset`, `SharedRoomDraft`, `DiscussionComment`에 같이 적어두었습니다.

### `project_files`

분리 목적: 실제 파일을 서버 저장소나 S3 같은 외부 저장소에 보관할 때 사용합니다.  
현재 프론트 위치: `project.files`.

```json
{
  "_id": "ObjectId",
  "project_id": "project-1710000000000",
  "user_id": "66501234567890abcdef1234",
  "name": "paper.pdf",
  "size": 2048000,
  "type": "application/pdf",
  "last_modified": 1710000000000,
  "storage_path": "uploads/project-1710000000000/paper.pdf",
  "uploaded_by": "user14530",
  "created_at": "2026-05-27T00:00:00Z"
}
```

추천 인덱스:

| Index | 목적 |
| --- | --- |
| `project_id` | 프로젝트별 파일 목록 조회 |
| `user_id + project_id` | 소유자 권한 확인 |
| `created_at` | 최근 업로드 정렬 |

### `project_threads`

분리 목적: 분석 Q&A를 검색, 삭제, 페이지네이션, 작성자별 필터링할 때 사용합니다.  
현재 프론트 위치: `project.thread`.

```json
{
  "_id": "ObjectId",
  "message_id": "msg-1710000000000",
  "project_id": "project-1710000000000",
  "user_id": "66501234567890abcdef1234",
  "role": "user",
  "text": "핵심 실험 결과를 요약해줘",
  "source_type": null,
  "rows": [],
  "created_at": "2026-05-27T00:00:00Z"
}
```

추천 인덱스:

| Index | 목적 |
| --- | --- |
| `project_id + created_at` | 프로젝트 대화 시간순 복원 |
| `user_id + project_id` | 로그인 사용자 권한 확인 |
| `role` | 사용자 질문/AI 답변 필터 |

### `visual_assets`

분리 목적: 표, 그래프, 이미지, 마인드맵을 프로젝트 카드와 독립적으로 저장/삭제/다운로드할 때 사용합니다.  
현재 프론트 위치: `project.visuals`, 공유 페이지의 `projectAssets`.

```json
{
  "_id": "ObjectId",
  "visual_id": "visual-table-1710000000000",
  "project_id": "project-1710000000000",
  "user_id": "66501234567890abcdef1234",
  "kind": "table",
  "title": "실험 결과 비교표",
  "desc": "업로드 문서에서 추출한 비교 요약",
  "details": [],
  "rows": [],
  "data_url": null,
  "created_at": "2026-05-27T00:00:00Z"
}
```

추천 인덱스:

| Index | 목적 |
| --- | --- |
| `project_id + kind` | 프로젝트별 시각화 보관함 필터 |
| `user_id + project_id` | 소유자 권한 확인 |
| `visual_id` | 개별 시각화 삭제/다운로드 |

### `shared_rooms`

분리 목적: 초대코드별 공유방, 참여자, 메인 프로젝트, 불러온 보조 프로젝트를 따로 관리할 때 사용합니다.  
현재 프론트 위치: `papermate.sharedRoom.v1.{inviteCode}` localStorage.

```json
{
  "_id": "ObjectId",
  "invite_code": "aa33ddf",
  "joined_code": "aa33ddf",
  "main_project_id": "project-1710000000000",
  "loaded_project_ids": ["project-1710000000000"],
  "members": [
    {
      "id": 1710000000000,
      "name": "user14530",
      "role": "owner",
      "joined_at": "2026-05-27T00:00:00Z"
    }
  ],
  "created_by": "user14530",
  "created_at": "2026-05-27T00:00:00Z",
  "updated_at": "2026-05-27T00:00:00Z"
}
```

추천 인덱스:

| Index | 목적 |
| --- | --- |
| `invite_code` unique | 초대코드로 공유방 조회 |
| `main_project_id` | 프로젝트에서 공유방 역조회 |
| `members.name` | 사용자가 참여한 공유방 조회 |

### `discussion_comments`

분리 목적: 공유방 댓글을 작성자 권한, 삭제, 시간순 정렬, 알림 대상으로 관리할 때 사용합니다.  
현재 프론트 위치: `project.discussionComments`, `sharedRoom.comments`.

```json
{
  "_id": "ObjectId",
  "comment_id": "comment-1710000000000",
  "room_invite_code": "aa33ddf",
  "project_id": "project-1710000000000",
  "asset_id": "visual-table-1710000000000",
  "user": "user14530",
  "text": "이 표에서 정확도 차이가 가장 중요해 보여요.",
  "created_at": "2026-05-27T00:00:00Z"
}
```

추천 인덱스:

| Index | 목적 |
| --- | --- |
| `room_invite_code + created_at` | 공유방 댓글 시간순 조회 |
| `project_id` | 프로젝트 관련 댓글 조회 |
| `user` | 내 댓글 삭제 권한 확인 |
| `asset_id` | 특정 이미지/표/그래프에 달린 댓글 조회 |

## Migration Order

나중에 실제 컬렉션으로 분리할 때는 한 번에 전부 옮기기보다 아래 순서가 안전합니다.

1. `visual_assets`
2. `shared_rooms`
3. `discussion_comments`
4. `project_threads`
5. `project_files`

이 순서가 좋은 이유는, 시각화/공유방/댓글은 이미 프론트에서 독립적인 자료처럼 다루고 있고, 파일 저장은 실제 스토리지 설계가 필요해서 가장 마지막에 두는 편이 안전하기 때문입니다.

## Document Analysis Notes

DB 스키마와 직접 연결되지는 않지만, `project.thread`, `project.visuals`, 추후 `project_threads`, `visual_assets`에 저장될 분석 결과의 품질을 위해 문서 분석 서비스를 보강했습니다.

적용 위치:

```text
backend/app/services/document_analysis.py
```

현재 적용된 내용:

- 한국어 조사/어미 제거 기반 키워드 정규화
- 도메인 용어 사전 추가
  - `RAG`
  - `LLM`
  - `BERT`
  - `GPT`
  - `OWPML`
  - `HWPX`
  - `FastAPI`
  - `MongoDB`
  - `정확도`
  - `데이터셋`
- `customized_konlpy`가 설치되어 있으면 사용자 사전 기반 형태소 분석 사용
- 설치되어 있지 않으면 정규식 기반 토큰화로 fallback
- 긴 문서를 청크로 나누고 질문과 가까운 구간을 TF-IDF식 점수로 랭킹
- 분석 응답에 `relevant_chunks`를 포함해 추후 "근거 구간 보기" UI에 활용 가능
- HWPX/OWPML XML 탐색 범위 확대
  - `section`이 들어간 XML
  - `header.xml`
  - `settings.xml`
  - `content.hpf`

참고 자료:

| Source | URL | 적용한 아이디어 |
| --- | --- | --- |
| WikiDocs, 딥 러닝을 이용한 자연어 처리 입문 - RAG, 에이전트, 파인튜닝까지 | https://wikidocs.net/book/2155 | TF-IDF, 코사인 유사도, RAG 텍스트 청킹 등 현재 프로젝트에 필요한 목차 선별 |
| WikiDocs, 27-02 MemN으로 한국어 QA 해보기 | https://wikidocs.net/85470 | 한국어 QA에서 형태소 분석기와 사용자 사전을 사용해 이름/전문용어가 분리되는 문제를 줄이는 아이디어 |
| WikiDocs, 04-04 TF-IDF | https://wikidocs.net/31698 | 흔한 단어보다 문서 안에서 중요한 단어에 더 높은 가중치를 주는 아이디어 |
| WikiDocs, 22-03 랭체인을 이용한 텍스트 청킹 | https://wikidocs.net/288612 | 긴 텍스트를 LLM이 처리 가능한 크기의 청크로 나누는 RAG 전처리 아이디어 |

주의:

해당 WikiDocs 페이지는 OWPML 파싱 전용 문서가 아니라 한국어 QA/토큰화 예제입니다.  
따라서 예제 코드를 그대로 가져오지 않고, PaperMate의 로컬 문서 분석 키워드 추출에 맞게 선택형 토큰화 구조로 재구성했습니다.
