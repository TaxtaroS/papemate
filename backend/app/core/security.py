# 초보자 안내: 비밀번호 암호화와 로그인 토큰(JWT) 생성/검증을 담당하는 보안 파일입니다.

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import settings

JWT_ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    """비밀번호 검증"""
    password_bytes = password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except ValueError:
        return False

def create_access_token(subject: str) -> str:
    """JWT 액세스 토큰 생성"""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "iat": now, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> str:
    """Authorization 헤더로 받은 JWT에서 로그인 사용자 id를 꺼냅니다."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
    except InvalidTokenError as exc:
        raise ValueError("유효하지 않은 로그인 토큰입니다.") from exc

    subject = payload.get("sub")
    if not subject:
        raise ValueError("로그인 토큰에 사용자 정보가 없습니다.")
    return str(subject)
