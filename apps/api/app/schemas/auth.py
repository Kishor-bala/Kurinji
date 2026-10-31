from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: str
    role: str = "student"  # student, teacher, admin


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    display_name: str
    roles: List[str]


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    roles: List[str]
    status: str

    model_config = ConfigDict(from_attributes=True)
