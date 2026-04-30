# FaceFusion HTTP Service

Containerized FaceFusion ([github.com/facefusion/facefusion](https://github.com/facefusion/facefusion))
exposed over HTTP for the Vanity Palms admin Visualizer chat. The chat
sends a user image + an instruction; the MiniMax planner picks an
operation; this service runs it on GPU.

## Endpoints

| Path | Operation | Body |
|---|---|---|
| `GET /health` | liveness probe | — |
| `POST /api/swap` | face swap | `imageBase64` (target frame) + `targetBase64` (reference face) |
| `POST /api/enhance` | restore (GFPGAN / CodeFormer) | `imageBase64` + `model` + `blend` |
| `POST /api/age` | age modifier | `imageBase64` + `direction` (-100..+100) |
| `POST /api/expression` | expression edit | `imageBase64` + `expression` |

All operations return `{ resultBase64, mimeType, durationMs }`.
All operations require `Authorization: Bearer <FACEFUSION_API_TOKEN>` if that env var is set.

## Local run (CPU, slow)

```bash
docker build -t facefusion-api .
docker run --rm -p 8000:8000 \
  -e FACEFUSION_EXECUTION_PROVIDERS=cpu \
  -e FACEFUSION_API_TOKEN=dev-token \
  facefusion-api
```

Test:
```bash
IMG=$(base64 -w0 sample.jpg)
curl -X POST http://localhost:8000/api/enhance \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"${IMG}\",\"model\":\"gfpgan_1.4\"}" | jq -r '.resultBase64' | base64 -d > out.jpg
```

## Deploy to Railway

```bash
# 1. From the repo root
cd services/facefusion

# 2. Login (one-time)
railway login

# 3. Create the project
railway init  # pick a project name, e.g. "vanity-facefusion"

# 4. Set required secrets
railway variables --set FACEFUSION_API_TOKEN=$(openssl rand -hex 32)
railway variables --set ALLOWED_ORIGINS="https://your-frontend-domain.com"

# 5. Add a GPU plan + persistent volume in the Railway dashboard
#    (Settings -> Add GPU; Volumes -> Create -> mount at /app/.assets)

# 6. Deploy
railway up

# 7. Get the public URL
railway domain  # produces e.g. https://vanity-facefusion-production.up.railway.app
```

After deploy, configure the Supabase edge function:

```bash
supabase secrets set FACEFUSION_URL=https://vanity-facefusion-production.up.railway.app
supabase secrets set FACEFUSION_API_TOKEN=<the same token you set in Railway>
supabase functions deploy face-operation
```

## Notes

- **First request per operation is slow.** FaceFusion downloads its
  ONNX models (face detector, swapper, enhancer, age modifier, etc.)
  on first invocation. Mount a persistent volume at `/app/.assets`
  in Railway so models survive redeploys.
- **CUDA recommended.** CPU mode works but is 30+ seconds per
  inference. Railway Pro lets you attach a T4 / L4.
- **No video.** This wrapper only exposes still-image operations.
  Video support is straightforward to add (FaceFusion handles it
  natively) but adds storage and timeout complexity.
- **Auth.** When `FACEFUSION_API_TOKEN` is set the service rejects
  requests without a matching bearer header. The Supabase edge
  function holds the same token so the public URL stays closed.
