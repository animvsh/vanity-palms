# FaceFusion service — CUDA 12 + FastAPI wrapper
# Built for Railway Pro GPU plans (CUDA 12.x compatible).
# CPU-only fallback works but is slow (>30s/inference).
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FACEFUSION_DIR=/app/facefusion \
    HF_HOME=/app/.cache/huggingface \
    XDG_CACHE_HOME=/app/.cache

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3.11-venv python3-pip \
        git ffmpeg curl ca-certificates libgl1 libglib2.0-0 \
        libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.11 /usr/local/bin/python && \
    ln -sf /usr/bin/python3.11 /usr/local/bin/python3

WORKDIR /app

# Pull FaceFusion at a known-good tag; pin so Docker cache stays warm.
ARG FACEFUSION_VERSION=3.4.1
RUN git clone --depth 1 --branch ${FACEFUSION_VERSION} \
        https://github.com/facefusion/facefusion.git ${FACEFUSION_DIR}

# FaceFusion's own deps (CPU + CUDA ONNX runtime + insightface, etc.)
WORKDIR ${FACEFUSION_DIR}
RUN python -m pip install --upgrade pip && \
    python -m pip install -r requirements.txt && \
    python -m pip install onnxruntime-gpu

# Wrapper deps
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN python -m pip install -r /app/requirements.txt

# Copy wrapper sources
COPY app.py /app/app.py
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Models live on a persistent volume in production. The wrapper
# downloads on first call to each operation, then caches.
VOLUME ["/app/.assets"]

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s \
    CMD curl -fsS http://127.0.0.1:${PORT:-8000}/health || exit 1

CMD ["/app/start.sh"]
