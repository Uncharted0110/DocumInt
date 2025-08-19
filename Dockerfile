# Multi-stage build: build frontend, install backend, serve with integrated FastAPI

# ---------- Frontend build ----------
FROM node:20-alpine AS webbuilder
WORKDIR /app/web
# Build-time args for Vite (must be supplied at docker build time to be embedded in bundle)
ARG VITE_ADOBE_API_KEY
ARG VITE_GEMINI_API_KEY
# Expose them as env so "npm run build" sees them
ENV VITE_ADOBE_API_KEY=$VITE_ADOBE_API_KEY \
    VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
COPY DocumInt/package*.json ./
RUN npm ci --no-audit --no-fund
COPY DocumInt/ ./
# (Optional) quick sanity output so logs show whether a client id was supplied
RUN echo "Building with VITE_ADOBE_API_KEY=${VITE_ADOBE_API_KEY}" && npm run build

# ---------- Backend runtime ----------
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps (for building some wheels if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY Backend/ /app/backend/
# Copy the built frontend from previous stage
COPY --from=webbuilder /app/web/dist /app/web/dist

# Install backend dependencies
COPY Backend/requirements.txt /tmp/requirements.txt
# Install PyTorch CPU-only version first for lighter build, then remaining dependencies
RUN pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu torchaudio==2.3.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu && \
    grep -v "^torch" /tmp/requirements.txt > /tmp/requirements_no_torch.txt && \
    pip install --no-cache-dir -r /tmp/requirements_no_torch.txt

# Set environment variables
# Frontend configuration
ENV DOCUMINT_FRONTEND_DIST=/app/web/dist \
    DOCUMINT_DATA_DIR=/app/data/projects

# NOTE: VITE_* variables are compile-time only (already baked into static JS). Setting them here will NOT change the frontend bundle.
# Runtime-only API keys (server side usage) can still be provided at `docker run -e` time if backend code needs them.
ENV SPEECH_API_KEY="" \
    SPEECH_REGION="" \
    LLM_PROVIDER=gemini \
    GEMINI_MODEL=gemini-2.5-flash \
    TTS_PROVIDER=azure \
    PYTHONPATH=/app/backend:/app/backend/src

# Create data directory for persistence
RUN mkdir -p /app/data/projects

# Port
EXPOSE 8080

# Start the integrated FastAPI server that serves both frontend and backend
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--app-dir", "/app/backend"]
