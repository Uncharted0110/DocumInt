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
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Expose envs (documented)
ENV DOCUMINT_FRONTEND_DIST=/app/web/dist \
    ADOBE_EMBED_API_KEY="" \
    LLM_PROVIDER=gemini \
    GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json \
    GEMINI_MODEL=gemini-2.5-flash \
    TTS_PROVIDER=azure \
    AZURE_TTS_KEY="" \
    AZURE_TTS_ENDPOINT=""

# Copy ASGI server that mounts frontend + backend
COPY Backend/server.py /app/backend/server.py

# Make sure PYTHONPATH includes backend and its src
ENV PYTHONPATH=/app/backend:/app/backend/src

# Port
EXPOSE 8080

# Start using uvicorn on 0.0.0.0:8080
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--app-dir", "/app/backend"]
