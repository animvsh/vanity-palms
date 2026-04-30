"""FaceFusion HTTP API — thin wrapper around `facefusion headless-run`.

Exposes four chat-driven operations:
  * POST /api/swap        : face swap (source -> target)
  * POST /api/enhance     : GFPGAN / CodeFormer face restoration
  * POST /api/age         : age modifier (delta -100..+100)
  * POST /api/expression  : expression restorer (smile, neutral, etc.)

All endpoints accept either:
  - multipart/form-data with `image` (and `target` for swap), OR
  - application/json with `imageBase64` (and `targetBase64` for swap)

All endpoints return JSON `{ resultBase64, mimeType, durationMs, ... }`.

The `facefusion` CLI is invoked as a subprocess so we don't depend on
internal modules. The trade-off is per-request startup cost (a couple
seconds of process spin-up); for our use case the operation itself
dominates, so this is fine.

Auth: if FACEFUSION_API_TOKEN is set, requests must carry
`Authorization: Bearer <token>`. This is the recommended setup so the
public Railway URL isn't open to the world.
"""
from __future__ import annotations

import base64
import os
import secrets
import shutil
import subprocess
import tempfile
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Literal, Optional

from fastapi import (
    Body,
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

FACEFUSION_DIR = Path(os.environ.get("FACEFUSION_DIR", "/app/facefusion"))
FACEFUSION_BIN = FACEFUSION_DIR / "facefusion.py"
WORK_DIR = Path(os.environ.get("FACEFUSION_WORK_DIR", "/tmp/facefusion-work"))
WORK_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
]
API_TOKEN = os.environ.get("FACEFUSION_API_TOKEN", "")
EXECUTION_PROVIDERS = os.environ.get(
    "FACEFUSION_EXECUTION_PROVIDERS",
    "cuda" if os.environ.get("NVIDIA_VISIBLE_DEVICES") else "cpu",
)
DEFAULT_TIMEOUT = int(os.environ.get("FACEFUSION_TIMEOUT_S", "180"))
MAX_IMAGE_BYTES = int(os.environ.get("FACEFUSION_MAX_BYTES", str(15 * 1024 * 1024)))

app = FastAPI(
    title="FaceFusion HTTP API",
    description="Chat-driven face manipulation backend for Vanity Palms.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def require_token(authorization: Optional[str] = None) -> None:
    """If FACEFUSION_API_TOKEN is set, enforce bearer auth."""
    if not API_TOKEN:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    # Constant-time comparison
    if not secrets.compare_digest(token, API_TOKEN):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


def auth_dependency(
    authorization: Optional[str] = Header(default=None),
) -> None:
    require_token(authorization)


@contextmanager
def workspace() -> Iterator[Path]:
    """Per-request scratch dir, cleaned up on exit."""
    d = WORK_DIR / uuid.uuid4().hex
    d.mkdir(parents=True, exist_ok=True)
    try:
        yield d
    finally:
        shutil.rmtree(d, ignore_errors=True)


def decode_image(b64_or_data_url: str, dest: Path) -> None:
    if "," in b64_or_data_url and b64_or_data_url.startswith("data:"):
        b64 = b64_or_data_url.split(",", 1)[1]
    else:
        b64 = b64_or_data_url
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Invalid base64 image: {exc}") from exc
    if len(raw) == 0:
        raise HTTPException(400, "Empty image payload")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(
            413, f"Image too large ({len(raw)} bytes, max {MAX_IMAGE_BYTES})"
        )
    dest.write_bytes(raw)


async def write_upload(upload: UploadFile, dest: Path) -> None:
    raw = await upload.read()
    if not raw:
        raise HTTPException(400, "Empty image upload")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image too large")
    dest.write_bytes(raw)


def encode_result(path: Path) -> str:
    if not path.exists() or path.stat().st_size == 0:
        raise HTTPException(500, "FaceFusion produced no output")
    return base64.b64encode(path.read_bytes()).decode("ascii")


def run_facefusion(args: list[str], timeout: int = DEFAULT_TIMEOUT) -> tuple[int, str]:
    """Invoke FaceFusion's CLI in headless mode. Returns (rc, combined_output)."""
    full = [
        "python",
        str(FACEFUSION_BIN),
        "headless-run",
        "--execution-providers",
        EXECUTION_PROVIDERS,
        *args,
    ]
    try:
        res = subprocess.run(
            full,
            cwd=str(FACEFUSION_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(504, f"FaceFusion timed out after {timeout}s") from exc
    out = (res.stdout or "") + "\n" + (res.stderr or "")
    return res.returncode, out


# ── Health ────────────────────────────────────────────────────────


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "facefusion": FACEFUSION_BIN.exists(),
            "execution_providers": EXECUTION_PROVIDERS,
        }
    )


# ── Schemas ───────────────────────────────────────────────────────


class SwapBody(BaseModel):
    imageBase64: str = Field(..., description="Source (target frame) image, base64")
    targetBase64: str = Field(..., description="Reference face to swap onto, base64")
    faceEnhancer: Literal["none", "gfpgan_1.4", "codeformer"] = "gfpgan_1.4"


class EnhanceBody(BaseModel):
    imageBase64: str
    model: Literal["gfpgan_1.4", "codeformer", "gpen_bfr_512"] = "gfpgan_1.4"
    blend: int = Field(80, ge=0, le=100, description="0-100, blend % with original")


class AgeBody(BaseModel):
    imageBase64: str
    direction: int = Field(
        ...,
        ge=-100,
        le=100,
        description="Negative = younger, positive = older. ~30 = subtle, ~80 = dramatic.",
    )


class ExpressionBody(BaseModel):
    imageBase64: str
    expression: Literal[
        "neutral", "smile", "laugh", "frown", "surprised", "sad", "angry"
    ] = "smile"


def _result(out_path: Path, started: float) -> dict:
    return {
        "resultBase64": encode_result(out_path),
        "mimeType": "image/jpeg",
        "durationMs": int((time.time() - started) * 1000),
    }


# ── Operations ────────────────────────────────────────────────────


@app.post("/api/swap", dependencies=[Depends(auth_dependency)])
async def face_swap(
    body: Optional[SwapBody] = Body(None),
    image: Optional[UploadFile] = File(None),
    target: Optional[UploadFile] = File(None),
    face_enhancer: str = Form("gfpgan_1.4"),
) -> dict:
    """Swap the face in `target` onto the face in `image`.

    In FaceFusion terms: -s = reference face (whose face you want to apply),
                          -t = target frame (whose body/scene to keep).
    Conventionally the user uploads their photo as `image` and the reference
    they want to look like as `target`.
    """
    started = time.time()
    with workspace() as ws:
        target_frame = ws / "target.jpg"
        source_face = ws / "source.jpg"
        out_path = ws / "out.jpg"

        if body and not (image or target):
            decode_image(body.imageBase64, target_frame)
            decode_image(body.targetBase64, source_face)
            chosen_enhancer = body.faceEnhancer
        elif image and target:
            await write_upload(image, target_frame)
            await write_upload(target, source_face)
            chosen_enhancer = face_enhancer
        else:
            raise HTTPException(
                400,
                "Provide both `imageBase64`+`targetBase64` (JSON) or both `image`+`target` (multipart)",
            )

        processors = ["face_swapper"]
        if chosen_enhancer and chosen_enhancer != "none":
            processors.append("face_enhancer")

        args = [
            "--source-paths",
            str(source_face),
            "--target-path",
            str(target_frame),
            "--output-path",
            str(out_path),
            "--processors",
            *processors,
        ]
        if "face_enhancer" in processors:
            args += ["--face-enhancer-model", chosen_enhancer]

        rc, log = run_facefusion(args)
        if rc != 0:
            raise HTTPException(500, f"FaceFusion swap failed: {log[-800:]}")
        return _result(out_path, started)


@app.post("/api/enhance", dependencies=[Depends(auth_dependency)])
async def face_enhance(
    body: Optional[EnhanceBody] = Body(None),
    image: Optional[UploadFile] = File(None),
    model: str = Form("gfpgan_1.4"),
    blend: int = Form(80),
) -> dict:
    started = time.time()
    with workspace() as ws:
        in_path = ws / "in.jpg"
        out_path = ws / "out.jpg"

        if body and not image:
            decode_image(body.imageBase64, in_path)
            chosen_model = body.model
            chosen_blend = body.blend
        elif image:
            await write_upload(image, in_path)
            chosen_model = model
            chosen_blend = blend
        else:
            raise HTTPException(400, "Provide `imageBase64` (JSON) or `image` (multipart)")

        args = [
            "--target-path",
            str(in_path),
            "--output-path",
            str(out_path),
            "--processors",
            "face_enhancer",
            "--face-enhancer-model",
            chosen_model,
            "--face-enhancer-blend",
            str(chosen_blend),
        ]
        rc, log = run_facefusion(args)
        if rc != 0:
            raise HTTPException(500, f"FaceFusion enhance failed: {log[-800:]}")
        return _result(out_path, started)


@app.post("/api/age", dependencies=[Depends(auth_dependency)])
async def face_age(
    body: Optional[AgeBody] = Body(None),
    image: Optional[UploadFile] = File(None),
    direction: int = Form(0),
) -> dict:
    started = time.time()
    with workspace() as ws:
        in_path = ws / "in.jpg"
        out_path = ws / "out.jpg"

        if body and not image:
            decode_image(body.imageBase64, in_path)
            delta = body.direction
        elif image:
            await write_upload(image, in_path)
            delta = direction
        else:
            raise HTTPException(400, "Provide `imageBase64` (JSON) or `image` (multipart)")

        # FaceFusion's age modifier expects a direction value -100..+100
        args = [
            "--target-path",
            str(in_path),
            "--output-path",
            str(out_path),
            "--processors",
            "age_modifier",
            "--age-modifier-direction",
            str(int(delta)),
        ]
        rc, log = run_facefusion(args)
        if rc != 0:
            raise HTTPException(500, f"FaceFusion age failed: {log[-800:]}")
        return _result(out_path, started)


@app.post("/api/expression", dependencies=[Depends(auth_dependency)])
async def face_expression(
    body: Optional[ExpressionBody] = Body(None),
    image: Optional[UploadFile] = File(None),
    expression: str = Form("smile"),
) -> dict:
    started = time.time()
    with workspace() as ws:
        in_path = ws / "in.jpg"
        out_path = ws / "out.jpg"

        if body and not image:
            decode_image(body.imageBase64, in_path)
            expr = body.expression
        elif image:
            await write_upload(image, in_path)
            expr = expression
        else:
            raise HTTPException(400, "Provide `imageBase64` (JSON) or `image` (multipart)")

        args = [
            "--target-path",
            str(in_path),
            "--output-path",
            str(out_path),
            "--processors",
            "expression_restorer",
            "--expression-restorer-expression",
            expr,
        ]
        rc, log = run_facefusion(args)
        if rc != 0:
            raise HTTPException(500, f"FaceFusion expression failed: {log[-800:]}")
        return _result(out_path, started)
