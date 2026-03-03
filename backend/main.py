"""FastAPI application entry point."""
import asyncio
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import router, set_task_manager
from task.manager import TaskManager

# Sliding-window rate limit for POST /api/tasks: max 5 requests per minute per IP
_POST_TASKS_LIMIT = 5
_POST_TASKS_WINDOW = 60  # seconds
_rate_limit_store: dict[str, list[float]] = defaultdict(list)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: start background tasks on startup."""
    cleanup_task = asyncio.create_task(_periodic_rate_limit_cleanup())
    yield
    cleanup_task.cancel()


app = FastAPI(
    title="Full Doc to Markdown",
    description="Recursively crawl documentation sites and output as Markdown",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: allow Next.js dev server (ports 3000–3002 for when the default port is taken)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize shared task manager
task_manager = TaskManager()
set_task_manager(task_manager)

@app.middleware("http")
async def rate_limit_post_tasks(request: Request, call_next):
    """Rate-limit POST /api/tasks to prevent crawl spam."""
    if request.method == "POST" and request.url.path == "/api/tasks":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - _POST_TASKS_WINDOW

        # Remove timestamps outside the current window
        _rate_limit_store[client_ip] = [
            t for t in _rate_limit_store[client_ip] if t > window_start
        ]

        if len(_rate_limit_store[client_ip]) >= _POST_TASKS_LIMIT:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Rate limit exceeded. Maximum {_POST_TASKS_LIMIT} crawl tasks "
                        f"per {_POST_TASKS_WINDOW} seconds."
                    )
                },
            )

        _rate_limit_store[client_ip].append(now)

    return await call_next(request)


app.include_router(router, prefix="/api")


async def _periodic_rate_limit_cleanup() -> None:
    """Evict expired entries from the rate limit store every 5 minutes."""
    while True:
        await asyncio.sleep(300)
        cutoff = time.time() - _POST_TASKS_WINDOW
        for ip in list(_rate_limit_store):
            _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if t > cutoff]
            if not _rate_limit_store[ip]:
                del _rate_limit_store[ip]


@app.get("/health")
async def health_check():
    return {"status": "ok"}
