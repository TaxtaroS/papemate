# 초보자 안내:
# 파일 원본은 나중에 Amazon S3 같은 스토리지에 올리고,
# 여기에는 프로젝트별 파일 메타데이터와 storagePath만 저장합니다.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from app.core.database import PROJECT_FILES_COLLECTION, db
from app.core.deps import get_current_user_id
from models.schemas import ProjectFileListResponse, ProjectFilePayload, ProjectFileResponse


router = APIRouter(prefix="/api/project-files", tags=["project-files"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _raise_database_error(exc: PyMongoError) -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"프로젝트 파일 저장소 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


@router.get("/{project_id}", response_model=ProjectFileListResponse)
async def list_project_files(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """프로젝트 파일 메타데이터 목록을 조회합니다."""

    try:
        cursor = db[PROJECT_FILES_COLLECTION].find({"user_id": user_id, "project_id": project_id}).sort("updated_at", -1)
        docs = [doc async for doc in cursor]
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"files": [doc["file"] for doc in docs]}


@router.post("", response_model=ProjectFileResponse, status_code=status.HTTP_201_CREATED)
async def upsert_project_file(
    payload: ProjectFilePayload,
    user_id: str = Depends(get_current_user_id),
):
    """파일 메타데이터를 저장합니다. 실제 바이너리 업로드는 S3 연결 단계에서 붙입니다."""

    file_doc = payload.file.model_dump()
    project_id = file_doc.get("projectId")
    file_id = file_doc.get("id")
    if not project_id or not file_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file.projectId와 file.id가 필요합니다.")

    now = datetime.now(timezone.utc)
    file_doc.setdefault("uploadedBy", user_id)
    file_doc.setdefault("createdAt", _now_iso())

    try:
        await db[PROJECT_FILES_COLLECTION].update_one(
            {"user_id": user_id, "project_id": project_id, "file.id": file_id},
            {
                "$set": {
                    "user_id": user_id,
                    "project_id": project_id,
                    "file": file_doc,
                    "storage_path": file_doc.get("storagePath"),
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"file": file_doc}


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_file(
    file_id: str,
    project_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """파일 메타데이터를 삭제합니다. S3 연결 후에는 원본 파일 삭제도 함께 묶을 예정입니다."""

    try:
        result = await db[PROJECT_FILES_COLLECTION].delete_one(
            {"user_id": user_id, "project_id": project_id, "file.id": file_id}
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="삭제할 파일 기록을 찾지 못했습니다.")
