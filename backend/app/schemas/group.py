from pydantic import BaseModel, ConfigDict, Field, field_validator


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nazwa grupy nie może być pusta")
        return stripped


class GroupMemberUpdate(BaseModel):
    user_id: int


class GroupMemberResponse(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)


class GroupResponse(BaseModel):
    id: int
    name: str
    members: list[GroupMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
