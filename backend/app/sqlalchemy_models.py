import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True, nullable=False)

    external_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    room: Mapped[str] = mapped_column(String, nullable=True)

    online: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_on: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    brightness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True, nullable=False)
    device_id: Mapped[str] = mapped_column(String, ForeignKey("devices.id"), index=True, nullable=False)

    name: Mapped[str] = mapped_column(String, nullable=False)
    time_local: Mapped[str] = mapped_column(String, nullable=False)  # "HH:MM"
    days_json: Mapped[str] = mapped_column(Text, nullable=False)  # json object
    action: Mapped[str] = mapped_column(String, nullable=False)  # turn_on/turn_off/set_brightness
    brightness: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    last_ran_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True, nullable=False)
    device_id: Mapped[str] = mapped_column(String, ForeignKey("devices.id"), index=True, nullable=False)

    name: Mapped[str] = mapped_column(String, nullable=False)
    trigger: Mapped[str] = mapped_column(String, nullable=False)  # sunset/sunrise/motion_detected/device_online
    action: Mapped[str] = mapped_column(String, nullable=False)
    brightness: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
