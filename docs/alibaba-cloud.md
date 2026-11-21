# VideoAgent 阿里云（百炼 / 通义万相 / OSS）接入

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-21 |
| 范围 | DashScope 规划器、视觉评审、Wanx 视频生成、OSS 媒体存储、部署映射 |

VideoAgent 的 provider 层与 LLM 层都是可插拔的，因此接入阿里云不需要改造业务逻辑：
规划器和视觉评审走 OpenAI 兼容协议，视频生成实现 `VideoProvider` 协议，媒体存储实现
`StorageBackend` 协议。

## 1. 规划器：DashScope OpenAI 兼容模式

`agent/planner.py` 使用 `langchain_openai.ChatOpenAI(base_url=...)`，百炼的兼容模式可以直接
替换 DeepSeek：

```env
VIDEOAGENT_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_LLM_API_KEY=sk-...
VIDEOAGENT_LLM_MODEL=qwen-plus
```

无需改代码。若使用业务空间专属域名，把 `base_url` 换成
`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`（其他地域同理）。

## 2. 视觉评审：qwen-vl

`services/visual_review.py` 直接请求 `{base}/chat/completions` 并用 `image_url` 传帧，
同样兼容百炼：

```env
VIDEOAGENT_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEOAGENT_VISION_API_KEY=sk-...
VIDEOAGENT_VISION_MODELS=["qwen-vl-max"]
```

## 3. 视频生成：通义万相（provider=`wanx`）

`providers/wanx.py` 实现异步提交 + 轮询：`POST /services/aigc/video-generation/video-synthesis`
返回 `task_id`，再轮询 `GET /tasks/{task_id}` 读取 `task_status` 与 `video_url`。

```env
VIDEOAGENT_VIDEO_PROVIDER=wanx
VIDEOAGENT_WANX_API_KEY=sk-...
VIDEOAGENT_WANX_BASE_URL=https://dashscope.aliyuncs.com
VIDEOAGENT_WANX_MODEL=wan2.6-t2v
VIDEOAGENT_WANX_TIMEOUT_SECONDS=300
```

行为说明：

- 模型、时长、比例跟随 `Shot`：时长夹到 2–15 秒，比例只接受 16:9 / 9:16 / 1:1 / 4:3 / 3:4，
  项目的 21:9 会回退为 16:9（万相不支持 21:9）。
- `image_to_video` 使用首帧图：公网 URL 原样传递，本地参考图编码为 base64 data URI。
- 结果链接只有 24 小时有效，`materialize_generation_result` 会立即下载转存到媒体存储。
- 项目 brief 中的 `Wanx/Wan 2.6` 这类标签会通过 `WANX_MODEL_ALIASES` 路由到该 provider；
  `VIDEOAGENT_VIDEO_PROVIDER=wanx` 时它也是默认 provider。

## 4. 媒体存储：OSS

默认 `local`（媒体目录即持久层）。切到 `oss` 后，写入时镜像到 OSS，读取时按需回源到本地
缓存，FFmpeg 始终处理本地文件：

```bash
cd services/api
uv sync --extra oss          # 安装官方 oss2 SDK

# .env
VIDEOAGENT_MEDIA_STORAGE=oss
VIDEOAGENT_OSS_ENDPOINT=https://oss-cn-beijing.aliyuncs.com
VIDEOAGENT_OSS_BUCKET=videoagent-media
VIDEOAGENT_OSS_ACCESS_KEY_ID=...
VIDEOAGENT_OSS_ACCESS_KEY_SECRET=...
VIDEOAGENT_OSS_PREFIX=videoagent
```

覆盖的写入点：上传、角色/场景生成图、视频生成结果、成片导出与封面。缺少凭据时
`build_storage` 会在启动或首次使用时抛出带变量名的 `StorageError`，不会静默降级。

## 5. 部署映射

| 本仓库 | 阿里云 |
| --- | --- |
| `deploy/docker-compose.yml` 的 postgres | RDS PostgreSQL |
| `redis` | 云数据库 Redis |
| `minio` | OSS |
| FastAPI / Next.js | ECS + SLB，或 ACK 容器服务 |
| Celery worker + `dev-worker.sh` | ECS / ACK 独立副本，或函数计算 |
| 日志与指标 | 日志服务 SLS + 云监控 |

## 6. 已知限制

- 地域必须一致：模型、Endpoint、API Key 三者跨地域会失败。
- 万相结果 URL 24 小时后失效，必须转存；本仓库默认下载到媒体存储。
- 本地参考图以 data URI 传给万相，超大图会显著增加请求体；生产建议先上传 OSS 再传公网 URL。
- OSS 后端未在本仓库的 CI 中做真实桶集成测试，仅覆盖签名/调用路径的单元测试。

参考：[DashScope OpenAI 兼容接口](https://www.alibabacloud.com/help/zh/model-studio/qwen-api-via-openai-chat-completions)、
[万相文生视频 API](https://help.aliyun.com/zh/model-studio/text-to-video-api-reference)、
[OSS Python SDK](https://help.aliyun.com/zh/oss/developer-reference/python-sdk/)
