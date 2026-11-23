# VideoAgent 模型文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-21 |
| 范围 | 视频生成 Provider、规划器与视觉评审、媒体存储、配置与排查 |

本文件是 Provider 相关内容的唯一入口：视频生成、LLM、视觉评审和媒体存储都在这里说明，
不再分散到各文档。

## 1. 总览

| Provider | 接入方式 | 能力 | 鉴权 | 配置前缀 |
| --- | --- | --- | --- | --- |
| `mock` | 进程内 | 文生视频、图生视频（本地样例素材） | 无 | — |
| `pippit` | CLI 子进程 | 文生/图生视频、任务查询、积分余额 | 服务端 CLI 登录 | `VIDEOAGENT_PIPPIT_*` |
| `kling` | CLI 或 MCP | 文生/图生视频、动作控制、多模态参考 | 国内版 CLI OAuth 或用户 MCP Token | `VIDEOAGENT_KLING_*` |
| `wanx` | HTTP（DashScope） | 文生/图生视频、多镜头叙事 | 服务端 API Key | `VIDEOAGENT_WANX_*` |

规划器与视觉评审走 OpenAI 兼容协议（DeepSeek、通义千问等），媒体存储有 `local` 与 `oss`
两种后端。所有凭据只来自环境变量或 `.env`，不进入代码和仓库。

## 2. 选择与解析顺序

1. `VIDEOAGENT_VIDEO_PROVIDER` 决定默认 Provider（`mock` / `pippit` / `kling` / `wanx`）。
2. 项目 Brief 中的 `Provider/模型` 标签（如 `Wanx/Wan 2.6`）优先于默认值。
3. 前端在估算或生成时显式提交的 `provider` 再次覆盖。
4. `mock` 模式直接返回 Mock Provider，不访问任何外部服务。
5. `auto` 模式下，Kling 未连接且允许降级时回退到 Mock，并如实告知用户。

### 2.1 模型目录与前端选择

模型不再写死在前端：`GET /api/v1/providers/models` 返回统一目录
（`provider` / `model` / `label` / `display` / `kind`），工作区的视频与图片选择器在挂载时拉取，
接口不可用时回退到打包时的目录。项目 Brief 里的 `Provider/Label` 标签也通过同一份目录解析。

运营可以在不改代码的情况下调整目录：

```env
# 追加模型（JSON 数组，kind 为 video 或 image）
VIDEOAGENT_EXTRA_MODELS=[{"provider":"wanx","model":"wan2.2-t2v-plus","label":"Wan 2.2 Plus"}]
# 隐藏默认模型（按 model id 或 "Provider/Label"）
VIDEOAGENT_DISABLED_MODELS=["kling-video-v2_5"]
```

静态落地页（GitHub Pages）没有 API，仍使用打包目录作为回退。

### 2.2 自动推荐（Auto）

创作框的 Auto 不在项目创建时决定模型；到镜头阶段由用户填写选项，服务端按选项推荐：

| 输入 | 说明 |
| --- | --- |
| `generation_mode` | 文生视频 / 图生视频 |
| `duration_seconds` | 1–30 秒 |
| `aspect_ratio` | 16:9 / 21:9 / 9:16 / 1:1 等 |
| `reference_image_count` | 参考图数量 |
| `audio_enabled` | 是否需要音频 |
| `preference` | `budget` / `balanced` / `quality` |

路由先按能力硬过滤（模式、时长上限、原生比例、参考图槽位、音频、Provider 是否可用），
再按偏好加权打分（预算、画质档位、参数贴合度），返回首选与候补：

```json
{
  "recommended": {
    "provider": "wanx",
    "model": "wan2.7-t2v",
    "display": "Wanx/Wan 2.7",
    "estimated_credits": 5,
    "score": 66,
    "reasons": ["ratio_native", "duration_fits", "cheapest"]
  },
  "alternatives": [],
  "applied": { "duration_seconds": 5, "aspect_ratio": "9:16", "preference": "balanced" }
}
```

理由码：`ratio_native`、`duration_fits`、`references_supported`、`audio_supported`、
`cheapest`、`highest_quality`、`mock_provider`；前端按当前语言渲染。

接口：`POST /api/v1/shots/{shot_id}/model-recommendation`。镜头页选择「自动推荐」后，
时长、比例、参考图或偏好变化会实时刷新推荐，估算与生成复用同一个 `provider/model`，
不会静默换模型。`GET /providers/models` 同时返回每个模型的 `modes`、`max_duration`、
`ratios`、`max_references`、`supports_audio`、`credits_per_second`、`quality_tier`。

### 2.3 模型发现

启动时会调用百炼的 OpenAI 兼容 `/models`（当前返回 191 个模型）补充**图像模型**
（如 `wan2.7-image`、`wan2.7-image-pro`）。`qwen-image-*`、`z-image-*` 走其他图像
接口，暂未接入。该接口**不返回视频模型**，
视频目录仍由本文件维护。发现结果缓存 10 分钟，失败时静默回退静态目录；
`GET /providers/models` 合并两部分，前端无需改代码即可看到新模型。

## 3. Mock Provider

用于离线开发、单元测试和 Playwright E2E，不产生费用。

- 配置：`VIDEOAGENT_VIDEO_PROVIDER=mock`
- 行为：提交返回 `mock-<uuid>`，轮询立即成功并指向仓库内置样例视频。
- 限制：不验证真实 Provider 的时限、配额和错误码。

## 4. Pippit Provider

服务端持有 Pippit CLI 的登录态，浏览器只拿到 VideoAgent 自己的会话。

```env
VIDEOAGENT_VIDEO_PROVIDER=pippit
VIDEOAGENT_PIPPIT_CLI_COMMAND=pippit-tool-cli
VIDEOAGENT_PIPPIT_VIDEO_MODEL=
VIDEOAGENT_PIPPIT_VIDEO_RESOLUTION=
VIDEOAGENT_PIPPIT_TIMEOUT_SECONDS=180
VIDEOAGENT_PIPPIT_ACCESS_KEY=      # 仅 CI 使用，优先浏览器登录
```

- 提交：`generate-video`，携带提示词、时长、比例、模型与多模态参考文件。
- 查询：`query-result --thread-id --run-id`，`task_id` 是这两个字段的 JSON 引用，可跨重启恢复。
- 账号：`GET /providers/pippit` 读状态，`GET /providers/pippit/credits` 读余额。
- 错误：CLI 缺失 → `503`；未登录 → `409`；上游失败 → `502`。

## 5. Kling Provider

两种后端，由 `VIDEOAGENT_KLING_BACKEND` 选择：

```env
VIDEOAGENT_KLING_BACKEND=cli          # cli | mcp
VIDEOAGENT_KLING_CLI_COMMAND=kling
VIDEOAGENT_KLING_CLI_TIMEOUT_SECONDS=180
VIDEOAGENT_KLING_EXPECTED_USER_ID=    # 固定已授权的国内版账号
```

- `cli`：调用国内版 `@klingai/cli-cn`，适合开发机和单机部署。
- `mcp`：用当前用户的 OAuth Token 连接 `https://klingai.com/mcp`，Token 由
  `provider_credentials` 加密存储，不落浏览器。
- 未连接且不可降级时返回 `409 KLING_NOT_CONNECTED`。
- 可用 `kling who_am_i` 与 `kling account` 做只读核对。

### 5.1 连接 MCP（OAuth）

MCP 后端使用**当前用户**的加密 token，不是服务端共享凭据：

1. `GET /api/v1/providers/kling/connect`：动态注册客户端（或使用
   `VIDEOAGENT_KLING_OAUTH_CLIENT_ID`）、生成 PKCE、写入 10 分钟有效的一次性
   `oauth_flows`，返回 `authorization_url`。
2. 浏览器打开该地址完成可灵授权，回调 `GET /api/v1/providers/kling/callback?code&state`：
   校验 state/过期、交换 token、加密写入 `provider_connections`，然后 303 回到前端。
3. `GET /api/v1/providers/kling` 查看连接状态，`DELETE` 断开连接。
4. 管理后台 Runtime 卡片的「Connect Kling account」按钮已接同一流程。

state 一次性使用；过期、重放或 provider 不匹配都会返回 400。

## 6. Wanx Provider（阿里云百炼 / 通义万相）

纯 HTTP，异步任务：提交拿 `task_id`，轮询取 `video_url`。

```env
VIDEOAGENT_VIDEO_PROVIDER=wanx
VIDEOAGENT_WANX_API_KEY=sk-...
VIDEOAGENT_WANX_BASE_URL=https://dashscope.aliyuncs.com
VIDEOAGENT_WANX_MODEL=wan2.6-t2v
VIDEOAGENT_WANX_TIMEOUT_SECONDS=300
```

- **地域必须一致**：API Key、Endpoint、模型跨地域会失败；业务空间专属域名形如
  `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`。
- **参数收敛**：时长夹到 2–15 秒；比例只接受 16:9 / 9:16 / 1:1 / 4:3 / 3:4，项目的 21:9
  回退为 16:9。
- **图生视频**：公网图片 URL 原样传递；本地参考图编码为 base64 data URI，超大图建议先传
  OSS 再传 URL。
- **结果 24 小时失效**：`materialize_generation_result` 立即下载并转存到媒体存储。
- **模型别名**：`WANX_MODEL_ALIASES` 把 `Wanx/Wan 2.6`、`Wanx/Wan 3.0 Prime` 等标签映射到
  模型 ID。
- 单测使用 `httpx.MockTransport`，覆盖提交、状态映射、错误码和本地图片编码。

图像模型分两套接口：`wan2.7-image` / `wan2.7-image-pro` 走同步的
`/api/v1/services/aigc/multimodal-generation/generation`；`wanx2.1-t2i-turbo` 走
`/api/v1/services/aigc/text2image/image-synthesis` 异步任务。两者目前都只支持**文生图**，
参考图生图请选择 Kling 图片模型。

## 7. 规划器与视觉评审（LLM Provider）

两者都是 OpenAI 兼容接口，改 `base_url` + `api_key` + `model` 即可切换厂商。

```env
# DeepSeek（默认）
VIDEOAGENT_LLM_BASE_URL=https://api.deepseek.com/v1
VIDEOAGENT_LLM_MODEL=deepseek-flash

# 通义千问
VIDEOAGENT_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_LLM_MODEL=qwen-plus

# 视觉评审
VIDEOAGENT_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_VISION_MODELS=["qwen-vl-max"]
```

- 不配置 Key 时使用确定性的本地 Planner，不会静默调用外部模型。
- 远程 Planner 超时或返回不可解析结果时，回退本地 Planner 并在 Agent 轨迹中说明。
- 视觉评审只对已导出的成片运行；未配置评估器时明确提示，不伪造分数。

## 8. 媒体存储

```env
VIDEOAGENT_MEDIA_STORAGE=local        # local | oss
VIDEOAGENT_MEDIA_DIR=.data/media
VIDEOAGENT_OSS_ENDPOINT=
VIDEOAGENT_OSS_BUCKET=
VIDEOAGENT_OSS_ACCESS_KEY_ID=
VIDEOAGENT_OSS_ACCESS_KEY_SECRET=
VIDEOAGENT_OSS_PREFIX=videoagent
```

- `local`：媒体目录即持久层，默认行为。
- `oss`：写入时镜像（上传、生成图、生成视频、成片、封面），读取缺失时回源；FFmpeg 始终
  处理本地文件。
- 启用前先 `cd services/api && uv sync --extra oss`；缺凭据抛 `StorageError`，不静默降级。

### 8.1 创建 Bucket 与 RAM 子账号

**不要用主账号 AccessKey。** 生产与团队环境用 RAM 子账号，权限限定到 Bucket + 前缀。

1. 开通 OSS，创建 Bucket：
   - 地域与 API/百炼一致（例如北京 `oss-cn-beijing`）。
   - 读写权限选**私有**——应用通过自己的 API 代理下载，不需要公共读。
   - 不需要开启静态网站托管。
2. 创建 RAM 用户：控制台 → RAM 访问控制 → 用户 → 创建用户，勾选「OpenAPI 调用访问」，
   只生成 AccessKey，不创建控制台登录密码。
3. 给该用户绑定自定义策略（最小权限，只覆盖本仓库使用的前缀）：

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

4. 填 `.env` 第 4 组，执行 `cd services/api && uv sync --extra oss`。
5. 验证：`uv run --project services/api python scripts/check-oss.py` 会做一次
   put → get → delete 往返，并打印 Bucket 与 Endpoint。

补充：ECS 与 Bucket 同地域时可用内网 Endpoint
（`https://oss-cn-beijing-internal.aliyuncs.com`）省流量；本地开发必须用公网 Endpoint。
当前只支持静态 AK/SK，尚未接入 STS 临时凭证。

## 9. 新增一个 Provider

1. 在 `providers/` 实现 `name / estimate / submit / status` 四个成员。
2. 在 `providers/factory.py` 注册模式，必要时在 `services/provider_resolver.py` 处理用户级鉴权。
3. 在 `config.py` 用 `VIDEOAGENT_` 前缀增加配置，并在 `.env.example` 留空示例。
4. 如果支持模型别名，加入 `api/generation.py` 的别名表与 `Provider/模型` 正则。
5. 用 MockTransport 或 Fake CLI 写契约测试，不依赖真实付费调用。

## 10. 已知限制

- Wanx、Kling MCP、Pippit 的真实联调需要各自的 Key 或登录态，CI 只跑契约测试。
- OSS 后端仅对假 SDK 做过单测，未在 CI 上跑真实 Bucket。
- 万相不支持 21:9；需要 21:9 时请在导出阶段裁切，而不是依赖 Provider。

参考：[DashScope OpenAI 兼容接口](https://www.alibabacloud.com/help/zh/model-studio/qwen-api-via-openai-chat-completions)、
[万相文生视频 API](https://help.aliyun.com/zh/model-studio/text-to-video-api-reference)、
[OSS Python SDK](https://help.aliyun.com/zh/oss/developer-reference/python-sdk/)
