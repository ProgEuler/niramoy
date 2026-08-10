"""Pydantic v2 schemas — request/response DTOs."""

from .common import (  # noqa: F401
    PaginatedResponse,
)
from .user import (  # noqa: F401
    UserOut,
    UserCreate,
    PasswordResetRequest,
    PasswordResetConfirm,
    LoginIn,
    RefreshIn,
    TokenPairOut,
)
from .hospital import (  # noqa: F401
    HospitalCreate,
    HospitalAdminCreate,
    HospitalOut,
    HospitalSummaryOut,
    HospitalAdminOut,
    HospitalProfileOut,
    HospitalProfileUpdate,
    HospitalUpdate,
)
from .bed_availability import (  # noqa: F401
    BedAvailabilityOut,
    BedUpdateIn,
    BedUpdateResult,
    PricingOut,
    PricingUpdateIn,
)
from .update_history import (  # noqa: F401
    UpdateHistoryOut,
    UpdateApprovalIn,
    UpdateRejectionIn,
)
from .review import ReviewCreate  # noqa: F401
