import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    AutomationCreate,
    AutomationOut,
    AutomationPatch,
    DeviceCreate,
    DeviceOut,
    DeviceStateUpdate,
    ScheduleCreate,
    ScheduleOut,
    SchedulePatch,
)
from .security import hash_password, verify_password
from .sqlalchemy_models import Automation, Device, Schedule, User


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.isoformat()


def _device_out(d: Device) -> DeviceOut:
    return DeviceOut(
        id=d.id,
        external_id=d.external_id,
        name=d.name,
        room=d.room,
        online=d.online,
        is_on=d.is_on,
        brightness=float(d.brightness or 0),
        updated_at=_iso(d.updated_at) or datetime.utcnow().isoformat(),
    )


def _schedule_out(s: Schedule) -> ScheduleOut:
    return ScheduleOut(
        id=s.id,
        device_id=s.device_id,
        name=s.name,
        time_local=s.time_local,
        action=s.action,
        brightness=float(s.brightness or 0),
        days=json.loads(s.days_json),
        enabled=s.enabled,
        created_at=_iso(s.created_at) or datetime.utcnow().isoformat(),
        last_ran_at=_iso(s.last_ran_at),
    )


def _automation_out(a: Automation) -> AutomationOut:
    return AutomationOut(
        id=a.id,
        device_id=a.device_id,
        name=a.name,
        trigger=a.trigger,
        action=a.action,
        brightness=float(a.brightness or 0),
        enabled=a.enabled,
        created_at=_iso(a.created_at) or datetime.utcnow().isoformat(),
    )


@dataclass
class UserRepo:
    def get_user_by_id(self, db: Session, user_id: str) -> Optional[Dict[str, Any]]:
        u = db.get(User, user_id)
        if not u:
            return None
        return {"id": u.id, "email": u.email, "created_at": _iso(u.created_at) or ""}

    def create_user(self, email: str, password: str) -> Dict[str, Any]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            exists = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if exists:
                raise ValueError("Email already registered")
            u = User(email=email, password_hash=hash_password(password))
            db.add(u)
            db.commit()
            db.refresh(u)
            return {"id": u.id, "email": u.email, "created_at": _iso(u.created_at) or ""}
        finally:
            db.close()

    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            u = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if not u:
                return None
            if not verify_password(password, u.password_hash):
                return None
            return {"id": u.id, "email": u.email, "created_at": _iso(u.created_at) or ""}
        finally:
            db.close()


@dataclass
class DeviceRepo:
    def list_devices(self, owner_user_id: str) -> List[DeviceOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            rows = db.execute(select(Device).where(Device.owner_user_id == owner_user_id).order_by(Device.updated_at.desc())).scalars().all()
            return [_device_out(r) for r in rows]
        finally:
            db.close()

    def create_device(self, owner_user_id: str, payload: DeviceCreate) -> DeviceOut:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            d = Device(
                owner_user_id=owner_user_id,
                external_id=payload.external_id,
                name=payload.name,
                room=payload.room,
                online=True,
                is_on=False,
                brightness=0.0,
                updated_at=datetime.utcnow(),
            )
            db.add(d)
            db.commit()
            db.refresh(d)
            return _device_out(d)
        finally:
            db.close()

    def provision_device(self, owner_user_id: str, payload: DeviceCreate) -> DeviceOut:
        # For now provisioning is same as create, but could verify external_id.
        return self.create_device(owner_user_id=owner_user_id, payload=payload)

    def delete_device(self, owner_user_id: str, device_id: str) -> bool:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            d = db.get(Device, device_id)
            if not d or d.owner_user_id != owner_user_id:
                return False
            db.delete(d)
            db.commit()
            return True
        finally:
            db.close()

    def update_state(self, owner_user_id: str, device_id: str, payload: DeviceStateUpdate) -> Optional[DeviceOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            d = db.get(Device, device_id)
            if not d or d.owner_user_id != owner_user_id:
                return None
            if payload.is_on is not None:
                d.is_on = payload.is_on
                if not payload.is_on:
                    # if turning off, keep brightness but could clamp.
                    pass
            if payload.brightness is not None:
                d.brightness = float(payload.brightness)
                # If brightness > 0 we can consider device "on"
                if d.brightness > 0 and payload.is_on is None:
                    d.is_on = True
            d.updated_at = datetime.utcnow()
            db.add(d)
            db.commit()
            db.refresh(d)
            return _device_out(d)
        finally:
            db.close()


@dataclass
class ScheduleRepo:
    def list_schedules(self, owner_user_id: str) -> List[ScheduleOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            rows = db.execute(select(Schedule).where(Schedule.owner_user_id == owner_user_id).order_by(Schedule.created_at.desc())).scalars().all()
            return [_schedule_out(r) for r in rows]
        finally:
            db.close()

    def create_schedule(self, owner_user_id: str, payload: ScheduleCreate) -> ScheduleOut:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            s = Schedule(
                owner_user_id=owner_user_id,
                device_id=payload.device_id,
                name=payload.name,
                time_local=payload.time_local,
                days_json=json.dumps(payload.days),
                action=payload.action,
                brightness=float(payload.brightness),
                enabled=payload.enabled,
                created_at=datetime.utcnow(),
            )
            db.add(s)
            db.commit()
            db.refresh(s)
            return _schedule_out(s)
        finally:
            db.close()

    def patch_schedule(self, owner_user_id: str, schedule_id: str, payload: SchedulePatch) -> Optional[ScheduleOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            s = db.get(Schedule, schedule_id)
            if not s or s.owner_user_id != owner_user_id:
                return None
            if payload.enabled is not None:
                s.enabled = payload.enabled
            if payload.name is not None:
                s.name = payload.name
            db.add(s)
            db.commit()
            db.refresh(s)
            return _schedule_out(s)
        finally:
            db.close()

    def delete_schedule(self, owner_user_id: str, schedule_id: str) -> bool:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            s = db.get(Schedule, schedule_id)
            if not s or s.owner_user_id != owner_user_id:
                return False
            db.delete(s)
            db.commit()
            return True
        finally:
            db.close()

    async def run_due_schedules(self, now: datetime, on_execute: Callable[[Any], Any]) -> None:
        """
        Execute schedules due at the current minute. This uses local server time as the 'local time'.

        This is a simplistic scheduler for the template; production systems would use cron/queueing and timezone handling.
        """
        hhmm = now.strftime("%H:%M")
        weekday_key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][now.weekday()]

        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            rows = db.execute(select(Schedule).where(Schedule.enabled == True, Schedule.time_local == hhmm)).scalars().all()  # noqa: E712
            if not rows:
                return
            for s in rows:
                days = json.loads(s.days_json)
                if not days.get(weekday_key, False):
                    continue

                d = db.get(Device, s.device_id)
                if not d:
                    continue

                if s.action == "turn_on":
                    d.is_on = True
                    if d.brightness <= 0:
                        d.brightness = 100.0
                elif s.action == "turn_off":
                    d.is_on = False
                elif s.action == "set_brightness":
                    d.brightness = float(s.brightness)
                    d.is_on = d.brightness > 0
                d.updated_at = datetime.utcnow()
                s.last_ran_at = datetime.utcnow()

                db.add(d)
                db.add(s)
                db.commit()
                db.refresh(d)
                # broadcast
                await on_execute(_device_out(d))
        finally:
            db.close()


@dataclass
class AutomationRepo:
    def list_automations(self, owner_user_id: str) -> List[AutomationOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            rows = db.execute(select(Automation).where(Automation.owner_user_id == owner_user_id).order_by(Automation.created_at.desc())).scalars().all()
            return [_automation_out(r) for r in rows]
        finally:
            db.close()

    def create_automation(self, owner_user_id: str, payload: AutomationCreate) -> AutomationOut:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            a = Automation(
                owner_user_id=owner_user_id,
                device_id=payload.device_id,
                name=payload.name,
                trigger=payload.trigger,
                action=payload.action,
                brightness=float(payload.brightness),
                enabled=payload.enabled,
                created_at=datetime.utcnow(),
            )
            db.add(a)
            db.commit()
            db.refresh(a)
            return _automation_out(a)
        finally:
            db.close()

    def patch_automation(self, owner_user_id: str, automation_id: str, payload: AutomationPatch) -> Optional[AutomationOut]:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            a = db.get(Automation, automation_id)
            if not a or a.owner_user_id != owner_user_id:
                return None
            if payload.enabled is not None:
                a.enabled = payload.enabled
            if payload.name is not None:
                a.name = payload.name
            db.add(a)
            db.commit()
            db.refresh(a)
            return _automation_out(a)
        finally:
            db.close()

    def delete_automation(self, owner_user_id: str, automation_id: str) -> bool:
        from .db import SessionLocal, init_db

        if SessionLocal is None:
            init_db()
        db = SessionLocal()
        try:
            a = db.get(Automation, automation_id)
            if not a or a.owner_user_id != owner_user_id:
                return False
            db.delete(a)
            db.commit()
            return True
        finally:
            db.close()


user_repo = UserRepo()
device_repo = DeviceRepo()
schedule_repo = ScheduleRepo()
automation_repo = AutomationRepo()
