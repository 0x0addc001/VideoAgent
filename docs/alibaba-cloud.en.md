# Alibaba Cloud Integration (Model Studio, Wanx, OSS)

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-21 |
| Scope | DashScope planner, vision review, Wanx video generation, OSS media storage, deployment mapping |

VideoAgent's provider layer and LLM layer are pluggable, so Alibaba Cloud needs no
change to the product workflow: the planner and visual review speak the OpenAI
compatible protocol, video generation implements `VideoProvider`, and media storage
implements `StorageBackend`.

## 1. Planner: DashScope OpenAI-compatible mode

`agent/planner.py` builds `langchain_openai.ChatOpenAI(base_url=...)`, so Model Studio
can replace DeepSeek by configuration only:

```env
VIDEOAGENT_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_LLM_API_KEY=sk-...
VIDEOAGENT_LLM_MODEL=qwen-plus
```

For a workspace-specific domain use
`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` instead.

## 2. Visual review: qwen-vl

`services/visual_review.py` posts to `{base}/chat/completions` with `image_url` parts,
which the compatible endpoint serves directly:

```env
VIDEOAGENT_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_VISION_API_KEY=sk-...
VIDEOAGENT_VISION_MODELS=["qwen-vl-max"]
```

## 3. Video generation: Tongyi Wanx (`provider=wanx`)

`providers/wanx.py` implements the asynchronous protocol: create a task with
`POST /services/aigc/video-generation/video-synthesis`, then poll `GET /tasks/{task_id}`
for `task_status` and `video_url`.

```env
VIDEOAGENT_VIDEO_PROVIDER=wanx
VIDEOAGENT_WANX_API_KEY=sk-...
VIDEOAGENT_WANX_BASE_URL=https://dashscope.aliyuncs.com
VIDEOAGENT_WANX_MODEL=wan2.6-t2v
VIDEOAGENT_WANX_TIMEOUT_SECONDS=300
```

Behaviour:

- Shot settings drive the request: duration is clamped to 2–15s and aspect ratios are
  limited to 16:9, 9:16, 1:1, 4:3 and 3:4, so a project's 21:9 falls back to 16:9.
- `image_to_video` passes a public URL through and encodes local reference images as
  base64 data URIs.
- Result URLs expire after 24 hours, so `materialize_generation_result` downloads them
  into media storage immediately.
- Project brief tags such as `Wanx/Wan 2.6` route through `WANX_MODEL_ALIASES`;
  `VIDEOAGENT_VIDEO_PROVIDER=wanx` also makes it the default provider.

## 4. Media storage: OSS

The default is `local`, where the media directory is the durable copy. With `oss`,
writes are mirrored to the bucket and reads fall back to OSS on a cache miss; FFmpeg
always works on local files:

```bash
cd services/api
uv sync --extra oss

# .env
VIDEOAGENT_MEDIA_STORAGE=oss
VIDEOAGENT_OSS_ENDPOINT=https://oss-cn-beijing.aliyuncs.com
VIDEOAGENT_OSS_BUCKET=videoagent-media
VIDEOAGENT_OSS_ACCESS_KEY_ID=...
VIDEOAGENT_OSS_ACCESS_KEY_SECRET=...
VIDEOAGENT_OSS_PREFIX=videoagent
```

Covered write paths: uploads, generated character/scene images, generated videos,
exported films and covers. Missing credentials raise a `StorageError` naming the
variable instead of silently falling back to local storage.

## 5. Deployment mapping

| This repository | Alibaba Cloud |
| --- | --- |
| `deploy/docker-compose.yml` postgres | RDS PostgreSQL |
| `redis` | ApsaraDB for Redis |
| `minio` | OSS |
| FastAPI / Next.js | ECS behind SLB, or ACK |
| Celery worker (`dev-worker.sh`) | ECS/ACK replica, or Function Compute |
| Logs and metrics | SLS + CloudMonitor |

## 6. Known limits

- Model, endpoint and API key must belong to the same region.
- Wanx result URLs expire after 24 hours and must be copied; this repository downloads
  them into media storage.
- Local reference images travel as data URIs; very large images bloat the request body,
  so production should upload to OSS and pass the public URL.
- The OSS backend is unit-tested against a fake SDK, not a live bucket in CI.

References: [DashScope OpenAI-compatible API](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions),
[Wanx text-to-video API](https://help.aliyun.com/zh/model-studio/text-to-video-api-reference),
[OSS Python SDK](https://help.aliyun.com/zh/oss/developer-reference/python-sdk/)
