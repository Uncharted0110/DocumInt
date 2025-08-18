import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Import the existing backend app
from app import app as backend_app

# Create a top-level FastAPI that serves the frontend and mounts backend under /api
app = FastAPI()

# Keep permissive CORS if the backend relies on it; harmless when same-origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Where the frontend build will be placed inside the container
FRONTEND_DIST = os.environ.get("DOCUMINT_FRONTEND_DIST", "/app/web/dist")

if os.path.isdir(FRONTEND_DIST):
    # Serve the built SPA at root; html=True ensures index.html on unmatched routes
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

# Mount the existing API under /api
app.mount("/api", backend_app)
