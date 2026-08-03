from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr                          # Validates email format
    username: str = Field(
        min_length=3,                        # Minimum 3 characters
        max_length=50                        # Maximum 50 characters
    )


class UserUpdate(BaseModel):
    email: EmailStr | None = None            # Optional email
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50
    )


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str

    class Config:
        """Pydantic configuration."""
        from_attributes = True               # Allow creating from ORM models
