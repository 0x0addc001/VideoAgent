# VideoAgent Agent 工程面试 FAQ

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-04 |
| 适用岗位 | 字节云雀 / 快手可灵等视频 Agent 工程岗位 |
| 回答原则 | 先讲事实，再讲取舍，最后讲演进 |

本文按面试官提问、连续追问和扩展八股组织。答案强调系统边界、工程取舍和
可验证性，不把假设方案描述成已交付事实。

## Q1. 你会怎样设计视频 Agent 的主编排？

**追问：** 为什么现在不直接做多 Agent？  
**甜点答案：**
先用确定性工作流而不是无限 ReAct。主链路应由 Brief、创作诊断、Treatment、
Script/Beats、Storyboard、连续性校验、预演、生成、镜头 QC、粗剪和交付组成，
在故事、预算和成片方向处设置人工确认点。当前项目先用单节点 Agent 产出可校验
的故事板，是因为职责边界尚不需要多个自由 Agent；当剧本、视觉、制片和审片具有
真正独立的工具与上下文，再拆成受限子 Agent，由父流程协调。

**扩展八股：** LangGraph StateGraph、条件边、checkpoint、human-in-the-loop、
tool allowlist、结构化输出、可恢复状态。

## Q2. 用户说“只改第三镜，其他不要动”，你怎么实现？

**追问：** 如果用户只是问“这个分镜怎么样”，也应该重写故事板吗？  
**甜点答案：**
先做 intent routing，区分新建、局部修改、只评估、重生成 take 和本地化。
局部修改应输出 shot patch，不返回整份故事板。正确边界是使用稳定 shot id、
版本号和操作日志只修改受影响节点，并保留用户未提及的镜头。

**扩展八股：** function calling、JSON Patch、幂等更新、并发版本、事件溯源、
optimistic locking。

## Q3. 一个可生成的专业镜头，至少需要哪些字段？

**追问：** 为什么只有 prompt、duration 和 aspect ratio 不够？  
**甜点答案：**
Prompt 只是生成参数，不是导演计划。镜头还要有 scene/beat、叙事功能、景别、
机位、镜头、运镜、主体动作、视线、走位、光线、色彩、声音、转场、连续性
引用和前后景状态。只有 Prompt 和时长不足以稳定保证人物、空间、视线和
叙事连续性。

**扩展八股：** master/medium/close/insert/reaction、180 度规则、30 度规则、
eyeline match、screen direction、match cut、motivated camera movement。

## Q4. 如何让 LLM 输出真正可执行，而不是一段漂亮的话？

**追问：** 模型返回 JSON 后还需要做什么？  
**甜点答案：**
用 Pydantic 定义严格结构，校验必填字段、时长、比例、镜头数量和引用关系；
失败时有限修复，仍失败就返回结构化错误。执行前还要做能力匹配，例如模型是否
支持该时长、音频、首尾帧或参考输入。LLM 负责创意决策，代码负责权限、预算和
不可违反的生产约束。

**扩展八股：** schema validation、retry budget、repair loop、capability
negotiation、deterministic fallback、tool permission boundary。

## Q5. MCP 和 CLI 应该怎么选？

**追问：** 两者同时存在会不会重复建设？  
**甜点答案：**
不按协议站队，按运行边界选。服务端批处理和稳定部署可以用 CLI；需要把视频
能力暴露给个人 Agent 或跨 Agent 复用时用 MCP。关键是上层统一 Provider
接口，把提交、查询、取消、错误和结果 URL 标准化。Pippit 通过服务端 CLI
接入，Kling 通过 MCP 工具接入，两者共享统一任务契约。

**扩展八股：** adapter、capability discovery、OAuth、credential isolation、
timeout、uncertain submission、provider fallback。

## Q6. 生成任务超时后怎么办？

**追问：** 可以自动重试三次吗？  
**甜点答案：**
不能盲目重试计费提交。提交前写幂等键和任务记录；遇到超时进入
`submission_uncertain`，先查询 Provider，无法对账时停止自动提交并告警。
普通查询失败可以退避重试，计费提交必须依赖幂等和人工可解释的恢复策略。

**扩展八股：** at-least-once、idempotency、outbox、Celery、死信队列、
对账任务、状态机、SSE 重连。

## Q7. 视频 Agent 的评测应该怎么做？

**追问：** 现在的一致性、覆盖度、清晰度和节奏分够吗？  
**甜点答案：**
可以保留为低成本基线，但不能把“镜头数大于等于三”当成故事覆盖。应采用
分阶段评测：剧本看欲望、冲突、转折和结尾；故事板看覆盖、连续性、视线和
可生成性；镜头看人物、Prompt 匹配和技术瑕疵；成片看节奏、声音和留存。
规则指标加视觉语言模型复核，再结合人工偏好数据校准权重。

**扩展八股：** rubric、LLM-as-a-judge、VLM、pairwise preference、inter-rater
agreement、gaming resistance、offline/online eval、guardrail metrics。

## Q8. 如何保证多镜头的人物与场景一致性？

**追问：** 只把同一段描述放进每个 Prompt 够吗？  
**甜点答案：**
不够。需要 Style Bible、角色/场景/道具引用资产、镜头级 continuity refs，
以及在生成前检查屏幕方向、视线、服装、时间和空间关系。生成后做 VLM
一致性检查，失败只重做受影响镜头。Kling 的 Element/Omni-Ref 这类能力可以
承担主体引用，但必须经过统一能力适配。

**扩展八股：** subject reference、identity drift、motion continuity、
reference image hierarchy、negative constraints、shot dependency graph。

## Q9. 如何控制积分成本和用户预期？

**追问：** 每个镜头都弹确认框是不是就够了？  
**甜点答案：**
不够。应按制作包或序列展示预算，区分预览、正式镜头和备选 take；先做低成本
Animatic，再批准高成本生成。重做要显示原因和预计费用，超预算时停止而不是
静默继续。生成前审批、幂等提交和序列级预算共同构成成本控制边界。

**扩展八股：** budget envelope、cost estimation、quota、reservation、
credit ledger、fallback model、cancellation compensation。

## Q10. 如果线上生成成功率突然下降，你怎么排查？

**追问：** 你最先看模型质量还是看基础设施？  
**甜点答案：**
先按状态机定位是提交前、提交不确定、排队、运行、下载还是发布失败，再按
Provider、模型、地区、版本和时间窗口切分。检查幂等拦截、超时、错误码、
队列积压和媒体下载。先关闭高风险计费重试，保留任务引用和审计记录，再切
备用 Provider 或降级到 Mock/预览，不覆盖原始任务。

**扩展八股：** golden signals、SLI/SLO、error budget、tracing、structured
logging、canary、feature flag、kill switch、postmortem。

## Q11. 为什么不用一个无限自主的 Agent 完成所有事情？

**追问：** 自主性越高不是越智能吗？  
**甜点答案：**
视频创作包含创意不确定性和不可逆成本。无限自主循环会让权限、预算、状态和
失败恢复难以证明。更合理的是“高自主创意 + 强约束生产”：Agent 可以提出
多个方案和组织镜头，但提交生成、删除资产、公开发布等动作必须走白名单工具
和人工确认。

**扩展八股：** bounded autonomy、least privilege、confirmation gate、
replayability、auditability、deterministic boundary。

## Q12. 用一句话总结视频 Agent 最关键的工程原则？

**追问：** 为什么这个原则比增加更多 Agent 更重要？
**甜点答案：**
把创意决策表示为可校验、可追踪、可局部修改的结构化数据。scene、beat、
镜头语言和连续性字段是预演、评估、局部重做与成本控制共同依赖的地基。

