# VideoAgent 软件测试与 TDD 规范

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v2.1 |
| 更新日期 | 2026-11-04 |
| 测试框架 | pytest、Vitest、Testing Library |

## 1. 目的

本文档定义 VideoAgent 的自动化测试策略、契约、质量门禁与验收检查。

## 2. TDD 规则

1. 先编写一个失败的行为测试。
2. 编写足以通过测试的最小实现。
3. 在不改变公开行为的前提下重构。
4. 提交前执行完整质量门禁。

测试关注公开行为、API 契约、权限、状态迁移和用户可见结果，不绑定私有实现细节。

## 3. 测试分层

```text
单元与组件测试
  → Provider 与 API 契约测试
  → SQLite 集成测试
  → 浏览器组件测试
```

真实付费生成不进入普通 CI。

## 4. 覆盖范围

后端：

- 密码哈希与会话行为。
- 项目所有权、重命名和归档。
- 故事板替换与版本。
- 确定性 Planner 与 Fake LLM 的 Agent 规划。
- Mock、Pippit 和 Kling Provider 契约。
- 积分估算、审批、幂等和任务状态。
- Provider 状态与积分。
- 健康检查。
- 故事板即时评估。

前端：

- 共享 Landing 结构与导航。
- 流式主标题和视频轮播。
- 创作框与自定义下拉。
- 项目创建流程。
- Assets、Hots 和 Docs 视图切换。
- Assets 权限、日期、悬浮预览与封面行为。
- Hots 作者、喜欢数、播放和发布。
- Docs 中英文切换。
- 项目列表、认证表单与项目工作区。

## 5. Provider 契约测试

每个 `VideoProvider` 验证：

- Provider 名称稳定。
- 积分估算返回标准化积分与时长。
- 提交返回稳定任务引用。
- 状态映射为 `pending`、`submitted`、`queued`、`running`、`succeeded`、
  `failed` 或 `cancelled`。
- 错误不暴露凭据或完整敏感命令参数。
- 相同幂等键不会重复提交。

Pippit 测试使用本地 Fake CLI，覆盖状态、积分、提交、查询、超时、缺失二进制、
无效 JSON 和缺失任务 ID。Kling 测试使用 Fake MCP Client，覆盖文生视频、
图生视频、动作控制、任务状态映射和结果提取。

## 6. API 测试

必须验证：

- 认证与所有权。
- 响应状态码和 Schema。
- 稳定错误码。
- 显式生成审批。
- 幂等行为。
- 故事板替换后的镜头顺序。
- Agent 消息持久化。
- 评估结果结构。
- 响应不包含 Provider 凭据。

## 7. 前端测试

组件测试覆盖：

- 左侧独立视图导航。
- 自定义下拉渲染与选择。
- Action 启用和禁用状态。
- Hots 元数据顺序：标题在作者与喜欢数之上。
- 每张 Hots 卡片包含自动播放、静音、循环视频。
- 发布入口使用蓝色播放键。
- Skills 使用 `user_id/skill_id` 的单一搜索目录，原厂商能力使用厂商命名空间。
- Playbook 正确填充提示词、Skill、Hook、风格、画幅、时长和审核设置。
- 再次点击当前 Playbook 会恢复应用前状态。
- Hots 场景卡片进入 Agents 时选中对应 Skill 和提示词。
- 输入框随多行内容增高，输入非空时隐藏示例灵感。
- Model 目录包含全部 Kling 与 Pippit 视频模型，并显示为 `服务商/模型`。
- Docs 标签为 `PRD`、`Design`、`Interface`、`Impl`、`Test`、`Ops`、`FAQ`、`TODO`。
- Globe 控件切换 Docs 语言。
- Skills、Hots、Assets、Docs 搜索框保持固定。
- Assets 通过 Video/Skill 分页切换，不重复类型标签。
- Video 悬浮预览，Skill 卡片无封面。
- 创作框菜单不超出视口。
- 搜索、语言、通知、积分和头像使用半透明表面。
- 头像在未登录时提供登录与注册，登录后提供退出。
- Interface 开头展示属性表。
- FAQ 与 TODO 均有中英文版本。

## 8. 响应式与可访问性

- 导航、下拉、Docs 和弹窗可用键盘操作。
- 焦点样式清晰。
- 字号和对比度充足。
- 支持 `prefers-reduced-motion`。
- 桌面侧栏和移动导航可用。
- 中英文长文本不重叠。

## 9. CI 门禁

Pull Request 必须通过：

```text
Ruff 检查与格式检查
mypy 严格类型检查
pytest
Vitest
TypeScript 检查
Next.js 生产构建
Docs 与静态产物构建
敏感信息和依赖扫描
```

## 10. Provider 验证

### 只读检查

1. 安装并认证 `pippit-tool-cli`。
2. 执行 `status` 与 `get-credit-balance`。
3. 查询 `/providers/pippit` 和 `/providers/pippit/credits`。
4. 验证日志不包含 Access Key。
5. 使用 Kling MCP `who_am_i` 验证授权与模型发现。

### 获准的付费生成

仅在用户明确批准预算时：

1. 记录起始积分。
2. 提交一个最小任务。
3. 验证幂等键和 Provider Task Reference。
4. 轮询到完成。
5. 记录结果、积分和 UI/API 状态一致性。
6. 不确定提交禁止自动重试。

## 11. 完成定义

- 测试先于实现，或与已记录的回归用例同步编写。
- 相关本地测试通过。
- Ruff、mypy、TypeScript、Next Build 和 Docs Build 通过。
- 不提交密钥、本地数据库或生成媒体。
- 行为变化同步更新 API 与 UI 文档。
- 付费 Provider 测试保持人工开启。
