# 초보자 안내: 프로젝트 목록 저장, 동기화, 삭제, 초대코드 조회 API를 담당합니다.

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from app.core.database import (
    DISCUSSION_COMMENTS_COLLECTION,
    PROJECT_FILES_COLLECTION,
    PROJECT_THREADS_COLLECTION,
    PROJECTS_COLLECTION,
    VISUAL_ASSETS_COLLECTION,
    db,
)
from app.core.deps import get_current_user_id
from models.schemas import ProjectListPayload, ProjectListResponse, ProjectPayload, ProjectResponse


router = APIRouter(prefix="/api/projects", tags=["projects"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean_mongo_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """MongoDB 내부 _id는 프론트에서 쓰지 않으므로 문자열로 바꿔 응답합니다."""
    doc["_id"] = str(doc["_id"])
    return doc


def _get_project_id(project: dict[str, Any]) -> str:
    project_id = str(project.get("id") or "").strip()
    if not project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="project.id가 필요합니다.")
    return project_id


def _get_invite_code(project: dict[str, Any]) -> str | None:
    invite_code = str(project.get("inviteCode") or "").strip()
    return invite_code or None


def _raise_database_error(exc: PyMongoError) -> None:
    """MongoDB 처리 실패를 프론트가 이해할 수 있는 503 오류로 바꿉니다."""

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"데이터베이스 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


@router.get("", response_model=ProjectListResponse)
async def list_projects(user_id: str = Depends(get_current_user_id)) -> dict[str, list[dict[str, Any]]]:
    """로그인 사용자의 프로젝트 목록을 MongoDB에서 읽습니다."""
    try:
        cursor = db[PROJECTS_COLLECTION].find({"user_id": user_id}).sort("updated_at", -1)
        docs = [_clean_mongo_doc(doc) async for doc in cursor]
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"projects": [doc["project"] for doc in docs]}


@router.put("/sync", response_model=ProjectListResponse)
async def sync_projects(
    payload: ProjectListPayload,
    user_id: str = Depends(get_current_user_id),
):
    """브라우저에 있던 프로젝트 배열 전체를 MongoDB에 동기화합니다."""
    incoming_ids = []
    now = _now()

    try:
        existing_cursor = db[PROJECTS_COLLECTION].find({"user_id": user_id}, {"project.id": 1})
        existing_ids = {
            str(doc.get("project", {}).get("id"))
            async for doc in existing_cursor
            if doc.get("project", {}).get("id")
        }

        for project in payload.projects:
            project_id = _get_project_id(project)
            incoming_ids.append(project_id)
            await db[PROJECTS_COLLECTION].update_one(
                {"user_id": user_id, "project.id": project_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "project": project,
                        "invite_code": _get_invite_code(project),
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )

        deleted_ids = existing_ids - set(incoming_ids)
        await db[PROJECTS_COLLECTION].delete_many({"user_id": user_id, "project.id": {"$nin": incoming_ids}})
        if deleted_ids:
            await db[VISUAL_ASSETS_COLLECTION].delete_many({"user_id": user_id, "project_id": {"$in": list(deleted_ids)}})
            await db[PROJECT_THREADS_COLLECTION].delete_many({"user_id": user_id, "project_id": {"$in": list(deleted_ids)}})
            await db[PROJECT_FILES_COLLECTION].delete_many({"user_id": user_id, "project_id": {"$in": list(deleted_ids)}})
            await db[DISCUSSION_COMMENTS_COLLECTION].delete_many({"user_id": user_id, "project_id": {"$in": list(deleted_ids)}})
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"projects": payload.projects}


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def upsert_project(
    payload: ProjectPayload,
    user_id: str = Depends(get_current_user_id),
):
    """프로젝트 하나를 생성하거나 같은 id의 기존 프로젝트를 갱신합니다."""
    project = payload.project
    project_id = _get_project_id(project)
    now = _now()

    try:
        await db[PROJECTS_COLLECTION].update_one(
            {"user_id": user_id, "project.id": project_id},
            {
                "$set": {
                    "user_id": user_id,
                    "project": project,
                    "invite_code": _get_invite_code(project),
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"project": project}


@router.get("/invite/{invite_code}", response_model=ProjectResponse)
async def get_project_by_invite(invite_code: str) -> dict[str, dict[str, Any]]:
    """초대코드로 공유 가능한 프로젝트를 찾습니다."""
    normalized_code = invite_code.strip()
    if not normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="초대코드를 입력해주세요.")

    try:
        doc = await db[PROJECTS_COLLECTION].find_one(
            {
                "$or": [
                    {"invite_code": normalized_code},
                    {"project.inviteCode": normalized_code},
                ]
            }
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="초대코드에 해당하는 프로젝트가 없습니다.")
    return {"project": doc["project"]}


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """로그인 사용자의 프로젝트 하나를 MongoDB에서 삭제합니다."""
    try:
        result = await db[PROJECTS_COLLECTION].delete_one({"user_id": user_id, "project.id": project_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="삭제할 프로젝트를 찾지 못했습니다.")

    try:
        await db[VISUAL_ASSETS_COLLECTION].delete_many({"user_id": user_id, "project_id": project_id})
        await db[PROJECT_THREADS_COLLECTION].delete_many({"user_id": user_id, "project_id": project_id})
        await db[PROJECT_FILES_COLLECTION].delete_many({"user_id": user_id, "project_id": project_id})
        await db[DISCUSSION_COMMENTS_COLLECTION].delete_many({"user_id": user_id, "project_id": project_id})
    except PyMongoError as exc:
        _raise_database_error(exc)
