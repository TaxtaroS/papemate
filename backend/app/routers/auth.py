# 초보자 안내: 회원가입, 로그인, 프로필 수정, 비밀번호 변경 같은 인증 API를 모아둔 파일입니다.

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.database import (
    DISCUSSION_COMMENTS_COLLECTION,
    PROJECT_FILES_COLLECTION,
    PROJECT_THREADS_COLLECTION,
    PROJECTS_COLLECTION,
    SHARED_ROOMS_COLLECTION,
    VISUAL_ASSETS_COLLECTION,
    db,
)
from app.core.deps import get_current_user_id
from app.core.security import create_access_token, hash_password, verify_password
from models.schemas import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    SignupRequest,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _raise_database_error(exc: PyMongoError) -> None:
    """MongoDB 장애를 로그인 화면에서 이해할 수 있는 오류로 바꿉니다."""

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"데이터베이스 연결 또는 처리 중 오류가 발생했습니다: {exc}",
    ) from exc


def serialize_user(user) -> AuthUser:
    return AuthUser(id=str(user["_id"]), username=user.get("display_name") or user["username"])


def get_object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 사용자입니다.") from exc


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="아이디를 입력해주세요.")

    user_doc = {
        "username": username,
        "display_name": username,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디입니다.") from exc
    except PyMongoError as exc:
        _raise_database_error(exc)

    user_doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id))
    return AuthResponse(access_token=token, user=serialize_user(user_doc))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    username = payload.username.strip()
    try:
        user = await db.users.find_one({"username": username})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="등록되지 않은 아이디입니다.")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="비밀번호가 올바르지 않습니다.")

    token = create_access_token(str(user["_id"]))
    return AuthResponse(access_token=token, user=serialize_user(user))


@router.patch("/profile", response_model=AuthUser)
async def update_profile(
    payload: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="닉네임을 입력해주세요.")

    object_id = get_object_id(user_id)
    try:
        user = await db.users.find_one({"_id": object_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    display_name = username
    try:
        await db.users.update_one({"_id": object_id}, {"$set": {"display_name": display_name}})
    except PyMongoError as exc:
        _raise_database_error(exc)

    user["display_name"] = display_name

    return serialize_user(user)


@router.patch("/password")
async def change_password(
    payload: PasswordChangeRequest,
    user_id: str = Depends(get_current_user_id),
):
    object_id = get_object_id(user_id)
    try:
        user = await db.users.find_one({"_id": object_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="현재 비밀번호가 올바르지 않습니다.")

    try:
        await db.users.update_one(
            {"_id": object_id},
            {"$set": {"password_hash": hash_password(payload.new_password)}},
        )
    except PyMongoError as exc:
        _raise_database_error(exc)

    return {"message": "비밀번호가 변경되었습니다."}


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user_id: str = Depends(get_current_user_id)):
    object_id = get_object_id(user_id)
    try:
        result = await db.users.delete_one({"_id": object_id})
    except PyMongoError as exc:
        _raise_database_error(exc)

    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    try:
        await db[PROJECTS_COLLECTION].delete_many({"user_id": user_id})
        await db[VISUAL_ASSETS_COLLECTION].delete_many({"user_id": user_id})
        await db[DISCUSSION_COMMENTS_COLLECTION].delete_many({"user_id": user_id})
        await db[PROJECT_THREADS_COLLECTION].delete_many({"user_id": user_id})
        await db[PROJECT_FILES_COLLECTION].delete_many({"user_id": user_id})
        await db[SHARED_ROOMS_COLLECTION].delete_many({"created_by": user_id})
    except PyMongoError as exc:
        _raise_database_error(exc)
