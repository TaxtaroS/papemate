# 초보자 안내:
# 분석 페이지의 Q&A 대화 기록을 프로젝트 본문과 분리해서 저장하는 API입니다.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from app.core.database import PROJECT_THREADS_COLLECTION, db
from app.core.deps import get_current_user_id
from models.schemas import ChatMessage, ProjectThreadPayload, ProjectThreadResponse


router = APIRouter(prefix="/api/project-threads", tags=["project-threads"])


def _raise_database_error(exc: PyMongoError) -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"프로젝트 대화 저장소 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


@router.get("/{project_id}", response_model=ProjectThreadResponse)
async def get_project_thread(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """프로젝트 분석 대화 기록을 조회합니다."""

    try:
        doc = await db[PROJECT_THREADS_COLLECTION].find_one({"user_id": user_id, "project_id": project_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"projectId": project_id, "messages": doc["messages"] if doc else []}


@router.put("/{project_id}", response_model=ProjectThreadResponse)
async def replace_project_thread(
    project_id: str,
    payload: ProjectThreadPayload,
    user_id: str = Depends(get_current_user_id),
):
    """프로젝트 대화 기록 전체를 교체합니다."""

    messages = [message.model_dump() for message in payload.messages]
    now = datetime.now(timezone.utc)

    try:
        await db[PROJECT_THREADS_COLLECTION].update_one(
            {"user_id": user_id, "project_id": project_id},
            {
                "$set": {"messages": messages, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"projectId": project_id, "messages": messages}


@router.post("/{project_id}/messages", response_model=ProjectThreadResponse, status_code=status.HTTP_201_CREATED)
async def append_project_message(
    project_id: str,
    message: ChatMessage,
    user_id: str = Depends(get_current_user_id),
):
    """프로젝트 대화 기록에 메시지 하나를 추가합니다."""

    message_doc = message.model_dump()
    if message_doc.get("projectId") != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL project_id와 message.projectId가 다릅니다.")

    now = datetime.now(timezone.utc)
    try:
        await db[PROJECT_THREADS_COLLECTION].update_one(
            {"user_id": user_id, "project_id": project_id},
            {
                "$push": {"messages": message_doc},
                "$set": {"updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        doc = await db[PROJECT_THREADS_COLLECTION].find_one({"user_id": user_id, "project_id": project_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"projectId": project_id, "messages": doc["messages"] if doc else [message_doc]}
