from fastapi import APIRouter

# Create a router specifically for health-related endpoints
router = APIRouter(
    tags=["health"] # Tags help organize the automatic documentation (Swagger UI)
)

@router.get("/health")
def check_health():
    """
    A simple health check endpoint.
    This is used to verify that the API is running and responding correctly.
    """
    return {
        "status": "success",
        "app_name": "FlowShield API",
        "message": "The backend server is running perfectly!"
    }
