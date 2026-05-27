# 초보자 안내:
# 프론트엔드와 백엔드가 주고받는 데이터 모양을 Pydantic 모델로 정의한 파일입니다.
# MongoDB에 최종 저장되는 컬렉션 구조는 backend/DATABASE_SCHEMA.md에 따로 정리했습니다.

from typing import Any

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    """회원가입 요청 body입니다."""

    username: str = Field(..., min_length=3, max_length=40)
    password: str = Field(..., min_length=4, max_length=128)


class LoginRequest(BaseModel):
    """로그인 요청 body입니다."""

    username: str = Field(..., min_length=3, max_length=40)
    password: str = Field(..., min_length=4, max_length=128)


class ProfileUpdateRequest(BaseModel):
    """프로필 닉네임 변경 요청 body입니다."""

    username: str = Field(..., min_length=3, max_length=40)


class PasswordChangeRequest(BaseModel):
    """비밀번호 변경 요청 body입니다."""

    current_password: str = Field(..., min_length=4, max_length=128)
    new_password: str = Field(..., min_length=4, max_length=128)


class AuthUser(BaseModel):
    """프론트에 노출해도 되는 사용자 정보입니다. 비밀번호 해시는 절대 내려주지 않습니다."""

    id: str
    username: str


class AuthResponse(BaseModel):
    """회원가입/로그인 성공 시 내려주는 인증 응답입니다."""

    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class ProjectPayload(BaseModel):
    # 프론트 프로젝트 카드/분석/공유 데이터는 아직 형태가 자주 바뀌므로
    # MongoDB에는 JSON 객체 전체를 저장하고, 화면 안정화 후 세부 스키마를 고정합니다.
    # 필수로 기대하는 핵심 필드는 project.id, project.title, project.inviteCode 입니다.
    project: dict[str, Any]


class ProjectListPayload(BaseModel):
    """브라우저에 있는 프로젝트 배열을 백엔드와 동기화할 때 쓰는 요청 body입니다."""

    projects: list[dict[str, Any]] = Field(default_factory=list)
