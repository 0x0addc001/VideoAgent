# VideoAgent 运营策略

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v2.0 |
| 更新日期 | 2026-11-04 |
| 范围 | Skills、Hots、Assets、Provider、支持、指标 |

## 1. 运营模型

VideoAgent 按三层内容运营：

1. 原厂商 Skill 与跨 Provider 工作流，分别使用 `kling`、`pippit` 或
   `video_agent` 命名空间。
2. 用户发布的 Skill 与 Hots 作品。
3. 项目产出的 Assets 成品与半成品。

## 2. 发布准备

- 完成认证和积分消耗验收。
- 确认 Pippit CLI 授权与 Kling MCP OAuth。
- 发布 PRD、Design、Interface、Impl、Test、Ops、FAQ、TODO 八份文档。
- 验证中英文文档切换。
- 验证项目创建、故事板规划、生成审批和任务轮询。
- 确认浏览器包、日志和 API 响应中不存在 Provider 凭据。

## 3. 官方 Skill 运营

- 原厂商能力使用厂商 user_id（如 `kling`）；跨 Provider 工作流使用 `video_agent`。
- Skill ID 稳定、小写，并使用下划线分隔。
- 每个 Skill 说明输入、输出、Provider 依赖和积分影响。
- Skill 变更同步更新 PRD、Design 和 Test。
- 废弃 Skill 至少保留一个版本并给出迁移说明。
- 场景 Playbook 引用有效 Skill，并与创作框字段保持一致。
- 外部 Agent 接力使用明确的 MCP 或 CLI 契约。

## 4. Assets 运营

- Assets 只展示当前用户自己的作品。
- 每项明确 private 或 public。
- 编辑日期统一使用 `yyyy-mm-dd`。
- Video 卡片悬浮预览，Skill 卡片不显示封面。
- Video 与 Skill 通过内部分页区分，不在卡片上重复类型标签。

## 5. Provider 与成本运营

- Pippit CLI 与 Kling MCP 通过统一 Provider 边界提供能力。
- 计费生成必须获得用户明确批准。
- Provider 提交使用数据库幂等键。
- 积分和 Provider 状态由服务端读取。
- 监控 Provider 错误率、超时率、不确定提交和重复提交拦截。
- 保留 Provider Task Reference 以支持对账。

## 6. 发布流程

1. 运行后端测试、前端测试、类型检查、构建和文档生成。
2. 检查敏感信息和依赖安全扫描。
3. 只读检查 Provider 状态和积分。
4. 验证中英文 Docs、搜索、导航和响应式布局。
5. 记录发布 Commit。

## 7. 监控指标

- 注册和登录成功率。
- 项目创建成功率。
- 故事板生成成功率和耗时。
- 审批到任务提交转化率。
- Provider 成功、失败、超时和不确定提交比例。
- 幂等键拦截的重复任务数。
- 单项目积分消耗。
- 文档搜索使用量和失效链接。

## 8. 用户支持

问题优先级：

1. 登录和 Session 异常。
2. Provider 不可用或授权异常。
3. 积分和计费异常。
4. 任务状态或重复提交风险。
5. 搜索、文档和导航问题。
6. 视觉与文案问题。

不得要求用户提供 Access Key、Cookie 或 CLI 登录文件。

## 9. 故障处理

- Provider 状态不确定时先停止计费生成，再排查。
- 保留任务记录和 Provider Task ID。
- Web 发布可独立回滚，不覆盖 Provider 凭据。
- 发布状态说明，明确受影响能力与缓解措施。
- 复盘重复扣费、跨用户访问和审计证据缺失。

## 10. 成功指标

- 激活：首次会话内完成项目创建。
- 创作：五分钟内生成故事板。
- 评估：故事板评估使用率。
- 可靠性：生成任务进入终态的比例。
- 成本：完成项目对应的积分消耗。
- 内容：官方 Skill 复用率和社区发布量。
- 文档：搜索成功率与双语链接完整率。
