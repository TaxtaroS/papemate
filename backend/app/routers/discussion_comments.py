# 초보자 안내:
# 공유 페이지 오른쪽 토론 댓글을 공유방/프로젝트와 분리해서 저장하는 API입니다.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import PyMongoError

from app.core.database import DISCUSSION_COMMENTS_COLLECTION, db
from app.core.deps import get_current_user_id
from models.schemas import DiscussionCommentListResponse, DiscussionCommentPayload, DiscussionCommentResponse


router = APIRouter(prefix="/api/discussion-comments", tags=["discussion-comments"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _raise_database_error(exc: PyMongoError) -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"토론 댓글 저장소 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


@router.get("", response_model=DiscussionCommentListResponse)
async def list_discussion_comments(
    room_invite_code: str,
    project_id: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    """공유방 댓글을 오래된 순으로 조회합니다."""

    query = {"room_invite_code": room_invite_code}
    if project_id:
        query["comment.projectId"] = project_id

    try:
        cursor = db[DISCUSSION_COMMENTS_COLLECTION].find(query).sort("created_at", 1)
        docs = [doc async for doc in cursor]
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"comments": [doc["comment"] for doc in docs]}


@router.post("", response_model=DiscussionCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_discussion_comment(
    payload: DiscussionCommentPayload,
    user_id: str = Depends(get_current_user_id),
):
    """댓글 하나를 저장합니다."""

    comment = payload.comment.model_dump()
    if not comment.get("roomInviteCode") or not comment.get("id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="comment.roomInviteCode와 comment.id가 필요합니다.")

    now = datetime.now(timezone.utc)
    comment.setdefault("createdAt", _now_iso())
    try:
        await db[DISCUSSION_COMMENTS_COLLECTION].insert_one(
            {
                "user_id": user_id,
                "room_invite_code": comment["roomInviteCode"],
                "project_id": comment.get("projectId"),
                "asset_id": comment.get("assetId"),
                "comment": comment,
                "created_at": now,
            }
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"comment": comment}


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discussion_comment(
    comment_id: str,
    room_invite_code: str,
    user_id: str = Depends(get_current_user_id),
):
    """내가 작성한 댓글만 삭제합니다."""

    try:
        result = await db[DISCUSSION_COMMENTS_COLLECTION].delete_one(
            {"user_id": user_id, "room_invite_code": room_invite_code, "comment.id": comment_id}
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="삭제할 내 댓글을 찾지 못했습니다.")
