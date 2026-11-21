# VideoAgent 运维文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-21 |
| 范围 | 环境、部署、发布、监控、备份、故障处理、扩容与安全 |
| 读者 | 运维、SRE、值班研发 |

本手册面向**系统可靠性**：怎么部署、怎么发布、出问题怎么定位。产品层面的活动、内容与
积分策略见 [运营策略](../product/operations.md)。

## 1. 环境

| 环境 | 用途 | 数据 | 访问 |
| --- | --- | --- | --- |
| local | 开发机，SQLite + 本地媒体 | 可丢弃 | 本机 |
| staging | 发布前验证，接近生产 | 合成数据 | 内网 |
| production | 正式服务 | 真实用户数据 | 公网 + 堡垒机 |

生产必须关闭调试输出，`VIDEOAGENT_ENVIRONMENT=production`，Cookie 走 `Secure`。

## 2. 部署拓扑

```text
用户 → SLB/CDN → Next.js (3000) ──/api/account──→ FastAPI (8000)
                                                    ├─ PostgreSQL / SQLite
                                                    ├─ Redis（Celery broker）
                                                    ├─ Celery worker（轮询 Provider）
                                                    ├─ OSS（媒体持久化）
                                                    └─ FFmpeg（导出与封面）
```

- Next.js 与 FastAPI 都是无状态进程，可水平扩容。
- Celery worker 与 API 共用代码镜像，独立副本数按队列深度调整。
- 本地可用 [deploy/docker-compose.yml](../../deploy/docker-compose.yml) 起 PostgreSQL、Redis、MinIO。

## 3. 发布流程

1. CI 必过：后端 `pytest / ruff / mypy`，前端 `vitest / tsc / build`。
2. 构建镜像，打不可变 tag（禁止 `latest` 上线）。
3. 数据库迁移：先备份，再执行，迁移失败立即停止发布。
4. 先发布 worker，再滚动重启 API，最后发布 Web。
5. 冒烟：`GET /api/v1/health`、`GET /api/v1/providers/models`、登录、上传、估算。
6. 观察 15 分钟错误率与延迟，无异常再继续下一批。
7. 回滚：回退镜像 tag；若迁移已执行，按迁移文档回滚或前滚修复。

## 4. 配置与密钥

- 配置只来自环境变量或 `services/api/.env`（本地），模板见 [`.env.example`](../../.env.example)。
- 云凭据使用 RAM 子账号 + 最小权限，禁止主账号 AccessKey。
- 密钥轮换：泄漏或人员变动时立即轮换，更新 `.env` 后滚动重启 API 与 worker。
- 启动即校验：`VIDEOAGENT_VIDEO_PROVIDER=wanx` 缺少 Key 会快速失败，不带病上线。

## 5. 健康检查与监控

| 指标 | 告警阈值（建议） | 说明 |
| --- | --- | --- |
| `/api/v1/health` | 连续 2 次失败 | 数据库与进程存活 |
| HTTP 5xx 比例 | > 1% 持续 5 分钟 | API 与 Web 分开看 |
| P95 延迟 | > 2s 持续 10 分钟 | 生成与 Agent 接口单列 |
| Celery 队列深度 | > 100 持续 10 分钟 | 队列积压通常意味着 Provider 慢 |
| Provider 超时率 | > 10% | 对应厂商限流或故障 |
| OSS 4xx/5xx | 任意持续增长 | 403 多为 RAM 策略或 AK 失效 |
| 磁盘使用率 | > 80% | 本地缓存与日志 |

日志要求：结构化 JSON、带 `request_id`，禁止记录 API Key、Cookie、完整命令行。

## 6. 备份与恢复

- PostgreSQL 每日全量 + 持续 WAL，保留 7–30 天；每月做一次恢复演练。
- OSS 开启版本控制；关键 Bucket 配置跨区域复制（按合规要求）。
- 恢复目标：RPO ≤ 24h（数据库）、RTO ≤ 2h（核心链路）。
- 恢复顺序：数据库 → OSS 校验 → API → worker → Web。

## 7. 故障处理

| 症状 | 常见原因 | 处置 |
| --- | --- | --- |
| 生成任务卡在 `running` | Provider 慢/限流 | 查 Provider 状态，必要时取消任务并退款 |
| `submission_uncertain` | 提交超时未拿到 task id | 禁止自动重发，按厂商近期任务人工对账 |
| OSS 403 | RAM 策略缺动作或 AK 失效 | 用 `scripts/check-oss.py` 复测，修复后重启 |
| 导出失败 | FFmpeg 缺滤镜/磁盘满 | 校验 `ffmpeg -filters`，清理 `.data` 缓存 |
| Redis 不可用 | 内存打满/网络 | Celery 降级为同步刷新，恢复后补投 |
| 登录 401 大面积 | 会话密钥变更 | 确认 `SESSION_SECRET` 未误改，必要时全员重登 |

## 8. 扩容与容量

- API：按 CPU 与 P95 扩容，保持无状态；数据库连接池按 `实例数 × 池大小` 估算上限。
- Worker：按队列深度扩容，注意 Provider 的 RPM 限额，避免把厂商打爆。
- 媒体：本地缓存设置上限并定期清理；持久层交给 OSS。
- Web：静态资源走 CDN，`/api/account` 代理不缓存。

## 9. 安全

- 依赖漏洞：`pnpm audit`、`uv` 锁文件审查，高危 24 小时内升级。
- 提交前扫描：`python scripts/check_secrets.py`，CI 已内置安全扫描工作流。
- 最小权限：OSS 只授予 `PutObject/GetObject/DeleteObject` 到业务前缀。
- 审计：管理操作写入 `admin_audit_logs`，保留不少于 180 天。

## 10. 值班清单

**日常**：健康检查、错误率、队列深度、OSS 错误、磁盘。

**发布前**：CI 绿、备份完成、回滚 tag 就绪、变更通知。

**事故中**：止血（回滚/限流/暂停生成）→ 定位 → 沟通 → 复盘。

暂停生成使用管理后台的运行时开关，估算与提交会同时被阻断。
