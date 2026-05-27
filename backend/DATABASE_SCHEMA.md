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

## 앞으로 고정하면 좋은 부분

아직은 `project` 내부가 자유로운 JSON이지만, 배포 전에는 아래를 별도 모델로 나누면 더 안정적입니다.

| 후보 모델 | 이유 |
| --- | --- |
| `StoredFile` | 파일 메타데이터 필드 고정 |
| `ChatMessage` | 대화 기록 저장/삭제/검색 안정화 |
| `VisualAsset` | 표, 그래프, 이미지, 마인드맵 구조 고정 |
| `DiscussionComment` | 공유 댓글 작성자/삭제 권한 처리 |
| `SharedRoom` | 공유방 참여자와 댓글을 프로젝트와 분리 저장 |
