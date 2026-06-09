from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    is_approved: bool
    role: UserRole

    model_config = {"from_attributes": True}


class UserApprovalResponse(UserResponse):
    pass


class MockSsoLogin(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.user
