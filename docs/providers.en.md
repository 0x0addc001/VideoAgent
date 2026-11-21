# VideoAgent Providers

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-21 |
| Scope | Video generation providers, planner and vision review, media storage, configuration and troubleshooting |

This is the single entry point for provider documentation: video generation, LLM,
visual review and media storage live here instead of being spread across files.

## 1. Overview

| Provider | Transport | Capabilities | Auth | Configuration prefix |
| --- | --- | --- | --- | --- |
| `mock` | In-process | Text-to-video, image-to-video (bundled sample media) | None | — |
| `pippit` | CLI subprocess | Text/image-to-video, task queries, credit balance | Server-owned CLI login | `VIDEOAGENT_PIPPIT_*` |
| `kling` | CLI or MCP | Text/image-to-video, motion control, ordered multimodal references | China-region CLI OAuth or per-user MCP token | `VIDEOAGENT_KLING_*` |
| `wanx` | HTTP (DashScope) | Text/image-to-video, multi-shot narration | Server API key | `VIDEOAGENT_WANX_*` |

The planner and visual review speak the OpenAI-compatible protocol (DeepSeek, Qwen,
and others), and media storage has `local` and `oss` backends. Credentials only ever
come from environment variables or `.env`; they never enter the code or the repository.

## 2. Resolution order

1. `VIDEOAGENT_VIDEO_PROVIDER` selects the default provider (`mock`, `pippit`, `kling`, `wanx`).
2. A `Provider/Model` tag in the project brief (for example `Wanx/Wan 2.6`) overrides it.
3. An explicit `provider` sent by the client during estimate or generation overrides both.
4. `mock` short-circuits to the in-process provider and touches no external service.
5. Under `auto`, an unconnected Kling falls back to Mock when fallback is allowed, and
   the UI says so.

### 2.1 Model catalogue and UI selection

Models are no longer baked into the frontend: `GET /api/v1/providers/models` returns one
catalogue (`provider`, `model`, `label`, `display`, `kind`). The workspace video and image
pickers load it on mount and fall back to the bundled catalogue when the API is
unreachable. `Provider/Label` tags in a project brief resolve through the same catalogue.

Operators can change the catalogue without code:

```env
# Append models (JSON array; kind is video or image)
VIDEOAGENT_EXTRA_MODELS=[{"provider":"wanx","model":"wan2.2-t2v-plus","label":"Wan 2.2 Plus"}]
# Hide defaults by model id or "Provider/Label"
VIDEOAGENT_DISABLED_MODELS=["kling-video-v2_5"]
```

The static GitHub Pages landing site has no API and keeps the bundled catalogue.

## 3. Mock provider

Used for offline development, unit tests and Playwright E2E; it never bills anyone.

- Config: `VIDEOAGENT_VIDEO_PROVIDER=mock`
- Behaviour: submit returns `mock-<uuid>`, polling succeeds immediately against a bundled sample.
- Limits: it does not reproduce real provider timeouts, quotas or error codes.

## 4. Pippit provider

The server owns the Pippit CLI session, so browsers only see VideoAgent sessions.

```env
VIDEOAGENT_VIDEO_PROVIDER=pippit
VIDEOAGENT_PIPPIT_CLI_COMMAND=pippit-tool-cli
VIDEOAGENT_PIPPIT_VIDEO_MODEL=
VIDEOAGENT_PIPPIT_VIDEO_RESOLUTION=
VIDEOAGENT_PIPPIT_TIMEOUT_SECONDS=180
VIDEOAGENT_PIPPIT_ACCESS_KEY=      # CI only; prefer the browser login
```

- Submit: `generate-video` with prompt, duration, ratio, model and multimodal references.
- Poll: `query-result --thread-id --run-id`; the task id is a JSON reference to both
  fields, so jobs survive restarts.
- Account: `GET /providers/pippit` for status, `GET /providers/pippit/credits` for balance.
- Errors: missing binary → `503`, not logged in → `409`, upstream failure → `502`.

## 5. Kling provider

Two backends selected by `VIDEOAGENT_KLING_BACKEND`:

```env
VIDEOAGENT_KLING_BACKEND=cli          # cli | mcp
VIDEOAGENT_KLING_CLI_COMMAND=kling
VIDEOAGENT_KLING_CLI_TIMEOUT_SECONDS=180
VIDEOAGENT_KLING_EXPECTED_USER_ID=    # pins the authorized China-region account
```

- `cli`: runs `@klingai/cli-cn`; best for developer machines and single-host deploys.
- `mcp`: connects to `https://klingai.com/mcp` with the current user's OAuth token,
  encrypted at rest by `provider_credentials` and never exposed to the browser.
- An unconnected account without fallback returns `409 KLING_NOT_CONNECTED`.
- `kling who_am_i` and `kling account` provide read-only identity and credit checks.

## 6. Wanx provider (Alibaba Cloud Model Studio / Tongyi Wanx)

Pure HTTP with asynchronous tasks: submit returns a `task_id`, polling returns `video_url`.

```env
VIDEOAGENT_VIDEO_PROVIDER=wanx
VIDEOAGENT_WANX_API_KEY=sk-...
VIDEOAGENT_WANX_BASE_URL=https://dashscope.aliyuncs.com
VIDEOAGENT_WANX_MODEL=wan2.6-t2v
VIDEOAGENT_WANX_TIMEOUT_SECONDS=300
```

- **Same region is mandatory**: key, endpoint and model must match; workspace domains look
  like `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`.
- **Clamped parameters**: duration 2–15s; ratios 16:9, 9:16, 1:1, 4:3, 3:4 only, so a
  project's 21:9 falls back to 16:9.
- **Image-to-video**: public URLs pass through; local references are base64 data URIs, so
  very large images should go through OSS and a public URL instead.
- **Result URLs expire after 24 hours**: `materialize_generation_result` downloads and
  persists them immediately.
- **Model aliases**: `WANX_MODEL_ALIASES` maps labels such as `Wanx/Wan 2.6` to model ids.
- Unit tests use `httpx.MockTransport` and cover submission, status mapping, error codes
  and local image encoding.

## 7. Planner and vision review (LLM provider)

Both are OpenAI-compatible: switch vendors with `base_url`, `api_key` and `model`.

```env
# DeepSeek (default)
VIDEOAGENT_LLM_BASE_URL=https://api.deepseek.com/v1
VIDEOAGENT_LLM_MODEL=deepseek-flash

# Qwen
VIDEOAGENT_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_LLM_MODEL=qwen-plus

# Vision review
VIDEOAGENT_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_VISION_MODELS=["qwen-vl-max"]
```

- Without a key the deterministic local planner runs; nothing is called silently.
- A remote planner timeout or unparsable answer falls back locally and is reported in the
  agent trace.
- Visual review only runs on an exported film; with no evaluator configured the UI says so
  instead of inventing scores.

## 8. Media storage

```env
VIDEOAGENT_MEDIA_STORAGE=local        # local | oss
VIDEOAGENT_MEDIA_DIR=.data/media
VIDEOAGENT_OSS_ENDPOINT=
VIDEOAGENT_OSS_BUCKET=
VIDEOAGENT_OSS_ACCESS_KEY_ID=
VIDEOAGENT_OSS_ACCESS_KEY_SECRET=
VIDEOAGENT_OSS_PREFIX=videoagent
```

- `local`: the media directory is the durable copy; this is the default.
- `oss`: writes are mirrored (uploads, generated images, generated videos, exports,
  covers) and reads restore on a cache miss. FFmpeg always works on local files.
- Run `cd services/api && uv sync --extra oss` first; missing credentials raise a
  `StorageError` rather than silently degrading.

### 8.1 Create the bucket and a RAM user

**Do not use the root account AccessKey.** Production and team environments should use a
RAM user restricted to one bucket and prefix.

1. Enable OSS and create a bucket:
   - Same region as the API and Model Studio (for example `oss-cn-beijing`).
   - Access control: **private** — the app proxies downloads through its own API.
   - Static website hosting is not required.
2. Create a RAM user: RAM console → Users → Create User, tick "OpenAPI access", generate an
   AccessKey only (no console password).
3. Attach a custom least-privilege policy scoped to the prefix this repository uses:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject", "oss:GetObject", "oss:DeleteObject"],
      "Resource": ["acs:oss:*:*:your-bucket/videoagent/*"]
    }
  ]
}
```

4. Fill group 4 in `.env` and run `cd services/api && uv sync --extra oss`.
5. Verify with `uv run --project services/api python scripts/check-oss.py`; it performs a
   put → get → delete round trip and prints the bucket and endpoint.

Notes: when ECS and the bucket share a region, the internal endpoint
(`https://oss-cn-beijing-internal.aliyuncs.com`) avoids public traffic; local development
must use the public endpoint. Only static AK/SK are supported today; STS is not wired yet.

## 9. Adding a provider

1. Implement `name / estimate / submit / status` under `providers/`.
2. Register the mode in `providers/factory.py` and, for per-user auth, in
   `services/provider_resolver.py`.
3. Add a `VIDEOAGENT_`-prefixed setting and an empty example in `.env.example`.
4. If model aliases are needed, extend the alias table and the `Provider/Model` regex in
   `api/generation.py`.
5. Write contract tests with MockTransport or a fake CLI; never require a paid call.

## 10. Known limits

- Live Wanx, Kling MCP and Pippit runs need real keys or sessions; CI only runs contract tests.
- The OSS backend is unit-tested against a fake SDK, not a live bucket in CI.
- Wanx cannot produce 21:9; crop at export time instead of relying on the provider.

References: [DashScope OpenAI-compatible API](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions),
[Wanx text-to-video API](https://help.aliyun.com/zh/model-studio/text-to-video-api-reference),
[OSS Python SDK](https://help.aliyun.com/zh/oss/developer-reference/python-sdk/)
