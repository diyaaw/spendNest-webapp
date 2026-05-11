from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import our modular routers
from app.routes.health import router as health_router
from app.routes.upload import router as upload_router
from app.routes.analytics import router as analytics_router
from app.routes.parse import router as parse_router   # ← NEW combined endpoint

# Initialize FastAPI application
app = FastAPI(
    title="SpendNest ML Microservice",
    description=(
        "Pure ML microservice called internally by the Express API gateway. "
        "Primary endpoint: POST /api/parse-and-analyze — parses a CSV bank "
        "statement, runs ARIMA forecasting and keyword categorization, and "
        "returns everything in one shot."
    ),
    version="2.0.0"
)

# CORS — allow Express backend (port 5000) and the old Vite frontend during migration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",   # Express API gateway
        "http://127.0.0.1:5000",
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # Next.js dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route registration ───────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api")
app.include_router(parse_router, prefix="/api")       # ← NEW: /api/parse-and-analyze
app.include_router(upload_router, prefix="/api")      # legacy /api/upload-csv (kept)
app.include_router(analytics_router, prefix="/api")   # legacy in-memory analytics (kept)
