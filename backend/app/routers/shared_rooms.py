# 초보자 안내:
# 공유 페이지의 방 상태를 저장하는 API입니다. 방 자체와 참여자/불러온 프로젝트 목록을 담당합니다.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.database import SHARED_ROOMS_COLLECTION, db
from app.core.deps import get_current_user_id
from models.schemas import SharedRoomDraft, SharedRoomListResponse, SharedRoomMember, SharedRoomPayload, SharedRoomResponse


router = APIRouter(prefix="/api/shared-rooms", tags=["shared-rooms"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _raise_database_error(exc: PyMongoError) -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"공유방 저장소 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


@router.get("", response_model=SharedRoomListResponse)
async def list_my_shared_rooms(user_id: str = Depends(get_current_user_id)):
    """내가 만든 공유방 목록을 최신순으로 조회합니다."""

    try:
        cursor = db[SHARED_ROOMS_COLLECTION].find({"created_by": user_id}).sort("updated_at", -1)
        docs = [doc async for doc in cursor]
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"rooms": [doc["room"] for doc in docs]}


@router.get("/{invite_code}", response_model=SharedRoomResponse)
async def get_shared_room(invite_code: str, user_id: str = Depends(get_current_user_id)):
    """초대코드로 공유방 상태를 조회합니다."""

    normalized_code = invite_code.strip()
    if not normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="초대코드를 입력해주세요.")

    try:
        doc = await db[SHARED_ROOMS_COLLECTION].find_one({"invite_code": normalized_code})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공유방을 찾지 못했습니다.")
    return {"room": doc["room"]}


@router.put("/{invite_code}", response_model=SharedRoomResponse)
async def upsert_shared_room(
    invite_code: str,
    payload: SharedRoomPayload,
    user_id: str = Depends(get_current_user_id),
):
    """공유방 상태를 생성하거나 갱신합니다."""

    normalized_code = invite_code.strip()
    room = payload.room.model_dump()
    room["inviteCode"] = room.get("inviteCode") or normalized_code
    if room["inviteCode"] != normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL 초대코드와 room.inviteCode가 다릅니다.")

    now = datetime.now(timezone.utc)
    now_text = _now_iso()
    room.setdefault("createdBy", user_id)
    room.setdefault("createdAt", now_text)
    room["updatedAt"] = now_text

    try:
        await db[SHARED_ROOMS_COLLECTION].update_one(
            {"invite_code": normalized_code},
            {
                "$set": {
                    "invite_code": normalized_code,
                    "room": room,
                    "loaded_project_ids": room.get("loadedProjectIds", []),
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now, "created_by": user_id},
            },
            upsert=True,
        )
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 공유방 초대코드입니다.") from exc
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"room": room}


@router.post("/{invite_code}/join", response_model=SharedRoomResponse)
async def join_shared_room(
    invite_code: str,
    member: SharedRoomMember,
    user_id: str = Depends(get_current_user_id),
):
    """공유방 참여자 목록에 현재 사용자를 추가합니다."""

    normalized_code = invite_code.strip()
    if not normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="초대코드를 입력해주세요.")

    try:
        doc = await db[SHARED_ROOMS_COLLECTION].find_one({"invite_code": normalized_code})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not doc:
        default_room = SharedRoomDraft(inviteCode=normalized_code, members=[]).model_dump()
        doc = {"room": default_room}

    room = doc["room"]
    members = room.get("members", [])
    member_doc = member.model_dump()
    member_doc["id"] = str(member_doc.get("id") or user_id)
    member_doc.setdefault("joinedAt", _now_iso())

    if not any(str(item.get("id")) == str(member_doc["id"]) or item.get("name") == member_doc.get("name") for item in members):
        members.append(member_doc)
    room["members"] = members
    room["updatedAt"] = _now_iso()

    try:
        await db[SHARED_ROOMS_COLLECTION].update_one(
            {"invite_code": normalized_code},
            {
                "$set": {
                    "invite_code": normalized_code,
                    "room": room,
                    "loaded_project_ids": room.get("loadedProjectIds", []),
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc), "created_by": user_id},
            },
            upsert=True,
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"room": room}
