from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class HealthOut(BaseModel):
    status: str = Field(..., description="Health status (ok).")
    time_utc: str = Field(..., description="Current UTC timestamp ISO8601.")


class SignupRequest(BaseModel):
    email: str = Field(..., description="User email address.")
    password: str = Field(..., min_length=6, description="User password (min 6 chars).")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address.")
    password: str = Field(..., description="User password.")


class TokenOut(BaseModel):
    access_token: str = Field(..., description="JWT access token.")
    token_type: str = Field("bearer", description="Token type.")


class UserOut(BaseModel):
    id: str = Field(..., description="User id.")
    email: str = Field(..., description="User email.")
    created_at: str = Field(..., description="Created timestamp ISO8601.")


class DeviceCreate(BaseModel):
    external_id: str = Field(..., description="Hardware external id / provisioning id.")
    name: str = Field(..., description="Friendly device name.")
    room: Optional[str] = Field(None, description="Optional room assignment.")


class DeviceStateUpdate(BaseModel):
    is_on: Optional[bool] = Field(None, description="On/off state.")
    brightness: Optional[float] = Field(None, ge=0, le=100, description="Brightness percent 0-100.")


class DeviceOut(BaseModel):
    id: str = Field(..., description="Device id.")
    external_id: str = Field(..., description="Hardware external id.")
    name: str = Field(..., description="Device name.")
    room: Optional[str] = Field(None, description="Room assignment.")
    online: bool = Field(..., description="Online status.")
    is_on: bool = Field(..., description="On/off state.")
    brightness: float = Field(..., description="Brightness percent.")
    updated_at: str = Field(..., description="Last update timestamp ISO8601.")


class ScheduleCreate(BaseModel):
    device_id: str = Field(..., description="Target device id.")
    name: str = Field(..., description="Schedule name.")
    time_local: str = Field(..., description="Local time in HH:MM.")
    action: str = Field(..., description="turn_on | turn_off | set_brightness")
    brightness: float = Field(100.0, ge=0, le=100, description="Brightness for set_brightness.")
    days: Dict[str, bool] = Field(..., description="Days map: mon..sun -> bool")
    enabled: bool = Field(True, description="Whether schedule is active.")


class SchedulePatch(BaseModel):
    enabled: Optional[bool] = Field(None, description="Enable/disable schedule.")
    name: Optional[str] = Field(None, description="Schedule name.")


class ScheduleOut(BaseModel):
    id: str = Field(..., description="Schedule id.")
    device_id: str = Field(..., description="Device id.")
    name: str = Field(..., description="Schedule name.")
    time_local: str = Field(..., description="Local time HH:MM.")
    action: str = Field(..., description="Schedule action.")
    brightness: float = Field(..., description="Brightness.")
    days: Dict[str, bool] = Field(..., description="Days map.")
    enabled: bool = Field(..., description="Enabled.")
    created_at: str = Field(..., description="Created timestamp.")
    last_ran_at: Optional[str] = Field(None, description="Last execution timestamp.")


class AutomationCreate(BaseModel):
    device_id: str = Field(..., description="Target device id.")
    name: str = Field(..., description="Automation name.")
    trigger: str = Field(..., description="sunset|sunrise|motion_detected|device_online")
    action: str = Field(..., description="turn_on | turn_off | set_brightness")
    brightness: float = Field(100.0, ge=0, le=100, description="Brightness for set_brightness.")
    enabled: bool = Field(True, description="Enabled.")


class AutomationPatch(BaseModel):
    enabled: Optional[bool] = Field(None, description="Enable/disable automation.")
    name: Optional[str] = Field(None, description="Automation name.")


class AutomationOut(BaseModel):
    id: str = Field(..., description="Automation id.")
    device_id: str = Field(..., description="Device id.")
    name: str = Field(..., description="Name.")
    trigger: str = Field(..., description="Trigger.")
    action: str = Field(..., description="Action.")
    brightness: float = Field(..., description="Brightness.")
    enabled: bool = Field(..., description="Enabled.")
    created_at: str = Field(..., description="Created timestamp.")
