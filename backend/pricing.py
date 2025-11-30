from typing import Literal, Mapping

ServiceTypeLiteral = Literal[
    "national_id",
    "driver_license",
    "passport",
    "vehicle_registration",
]

# In a real system this could call another Absher microservice.
SERVICE_FEES: Mapping[ServiceTypeLiteral, float] = {
    "national_id": 150.0,
    "driver_license": 80.0,
    "passport": 164.0,
    "vehicle_registration": 100.0,
}


def get_service_fee(service_type: ServiceTypeLiteral) -> float:
    """
    Get the official fee for a given service type.
    If unknown, fall back to a safe default.
    """
    return SERVICE_FEES.get(service_type, 150.0)
