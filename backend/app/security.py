import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, WebSocket
from jose import JWTError, jwt
from passlib.context import CryptContext

from .db import get_session
from .repos import user_repo

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
_DEFAULT_SECRET = "dev-only-change-me"


def _secret() -> str:
    return os.getenv("JWT_SECRET") or _DEFAULT_SECRET


# PUBLIC_INTERFACE
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


# PUBLIC_INTERFACE
def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a password against bcrypt hash."""
    return pwd_context.verify(plain_password, password_hash)


# PUBLIC_INTERFACE
def create_access_token(user_id: str, email: str, expires_minutes: int = 60 * 24) -> str:
    """Create a signed JWT access token."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": user_id, "email": email, "exp": exp}
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def _decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _get_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) != 2:
        return None
    if parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


# PUBLIC_INTERFACE
def get_current_user_from_request(request: Request, db=Depends(get_session)) -> Dict[str, Any]:
    """FastAPI dependency: read Authorization header and return current user dict."""
    token = _get_bearer_token(request.headers.get("authorization"))
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    data = _decode_token(token)
    user = user_repo.get_user_by_id(db=db, user_id=data["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


# PUBLIC_INTERFACE
async def get_current_user_from_ws(ws: WebSocket) -> Dict[str, Any]:
    """Authenticate WebSocket by ?token=... query param."""
    token = ws.query_params.get("token")
    await ws.accept()
    if not token:
        await ws.close(code=4401)
        raise HTTPException(status_code=401, detail="Missing token")
    data = _decode_token(token)
    # open a short session manually
    from .db import SessionLocal, init_db

    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        user = user_repo.get_user_by_id(db=db, user_id=data["sub"])
        if not user:
            await ws.close(code=4401)
            raise HTTPException(status_code=401, detail="Unknown user")
        return user
    finally:
        db.close()
