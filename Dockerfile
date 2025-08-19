# Multi-stage build: build frontend, install backend, serve with Uvicorn

# ---------- Frontend build ----------
FROM node:20-alpine AS webbuilder
WORKDIR /app/web
COPY DocumInt/package*.json ./
RUN npm ci --no-audit --no-fund
COPY DocumInt/ ./
RUN npm run build

# ---------- Backend runtime ----------
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps (for building some wheels if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY Backend/ /app/backend/
# Copy the built frontend from previous stage
COPY --from=webbuilder /app/web/dist /app/web/dist

# Install backend dependencies (only from Backend)
COPY Backend/requirements.txt /tmp/requirements.txt
# Install PyTorch CPU-only version first for lighter build, then remaining dependencies
RUN pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu torchaudio==2.3.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu && \
    grep -v "^torch" /tmp/requirements.txt > /tmp/requirements_no_torch.txt && \
    pip install --no-cache-dir -r /tmp/requirements_no_torch.txt

# Expose envs (documented)
# Set non-sensitive environment variables; sensitive ones must be provided at runtime
ENV DOCUMINT_FRONTEND_DIST=/app/web/dist \
    VITE_ADOBE_API_KEY="" \
    LLM_PROVIDER=gemini \
    VITE_GEMINI_API_KEY="" \
    GEMINI_MODEL=gemini-2.5-flash \
    TTS_PROVIDER=azure \
    SPEECH_API_KEY="" \
    SPEECH_REGION=""

# Copy ASGI server that mounts frontend + backend
COPY Backend/app.py /app/backend/server.py

# Make sure PYTHONPATH includes backend and its src
ENV PYTHONPATH=/app/backend:/app/backend/src

# Port
EXPOSE 8080

# Start using uvicorn on 0.0.0.0:8080
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--app-dir", "/app/backend"]
