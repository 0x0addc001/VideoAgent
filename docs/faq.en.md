# VideoAgent FAQ

| Attribute | Value |
| --- | --- |
| Document version | v2.2 |
| Updated | 2026-11-05 |

## Q1. How should a video Agent be orchestrated?

**Answer**

Use a deterministic workflow: brief, creative diagnosis, treatment,
script/beats, storyboard, continuity validation, previz, generation, shot QC,
rough cut, and delivery. Human gates protect story direction, budget, and final
direction. Models make creative decisions; code owns state, permissions, and
cost boundaries.

**Follow-up:** Why not start with multiple autonomous Agents?

**Answer**

When responsibilities share one context, a single Agent with explicit tools and
state is more reliable. Split into bounded sub-Agents only when writing, visual
planning, production, and review have genuinely independent tools, context, and
acceptance criteria.

**Extension:** LangGraph

**Answer**

Use a StateGraph for stages and conditional edges, checkpoints for recovery,
human-in-the-loop for critical approvals, tool allowlists for capability
boundaries, and structured output for stable contracts between nodes.

## Q2. The user says, “Change shot 3 only.” How should the system implement it?

**Answer**

Route the request by intent, then apply the change to a stable shot ID. The
Agent returns a local shot patch with a version and operation log; other shots
and their approval state remain unchanged.

**Follow-up:** Should a review-only request replace the storyboard?

**Answer**

No. Review requests enter a read-only branch and return findings and
suggestions without producing a write operation.

**Extension:** How can local edits be made concurrency-safe?

**Answer**

Use optimistic locking or version-conditioned updates, idempotency keys, and
dependency links between a shot revision and any generation job based on it.

## Q3. What fields define a production-ready shot?

**Answer**

Beyond prompt, duration, and aspect ratio, a shot needs scene/beat, story
function, shot size, angle, lens, movement, subject action, gaze, blocking,
lighting, palette, sound, transition, continuity references, and entry/exit
state.

**Follow-up:** Why is a detailed prompt still insufficient?

**Answer**

A prompt describes one generation request. Identity, space, gaze, wardrobe, and
continuity require structured fields, reference assets, and cross-shot checks.

**Extension:** Which cinematic rules matter?

**Answer**

Use master/medium/close/insert/reaction coverage and check the 180-degree rule,
30-degree rule, eyeline match, screen direction, match cuts, and motivated
camera movement.

## Q4. How should LLM output be made truly executable?

**Answer**

Define a strict Pydantic schema, validate fields, duration, aspect ratio, shot
count, and references, then match the request against provider capabilities
such as duration, audio, and input types.

**Follow-up:** What happens after the model returns JSON?

**Answer**

JSON is only a candidate result. Schema validation, business validation,
permission checks, and cost checks must pass before persistence or generation.

**Extension:** What if validation fails?

**Answer**

Allow a bounded structured repair loop. When the repair budget is exhausted,
return a stable error and do not enter the billable path or pass malformed text
to the next tool.

## Q5. When should a video Agent use MCP versus a CLI?

**Answer**

Choose by runtime boundary. Server-side batch jobs use a CLI; cross-Agent,
personal-Agent, and tool-discovery workflows use MCP. Both converge on one
Provider contract.

**Follow-up:** Are the integrations redundant?

**Answer**

No. The transport adapters differ, while estimate, submit, status, cancel, and
normalized errors live in the shared provider boundary.

**Extension:** What should a Provider adapter normalize?

**Answer**

Model capabilities, task references, status, error codes, result URLs, credits,
and cancellation semantics. Credentials remain inside the adapter and never
enter browser or domain objects.

## Q6. What should happen when a generation request times out?

**Answer**

Enter `submission_uncertain`, preserve the idempotency key and request record,
then query the provider for reconciliation. If acceptance cannot be proven,
stop automatic submission and alert.

**Follow-up:** Can the submission simply be retried three times?

**Answer**

Read-only status queries can use bounded backoff. Billable submissions cannot
be blindly retried; continue only after proving the request was not accepted or
after locating the same task through the idempotency key.

**Extension:** How should duplicate charges be prevented?

**Answer**

Use a database-level idempotency key, submission state machine, provider task
reference, and an explainable reconciliation path so at-least-once delivery
does not become duplicate billing.

## Q7. How should a video Agent be evaluated?

**Answer**

Evaluate by stage. Script: desire, conflict, turn, and ending. Board: coverage,
continuity, and feasibility. Shot: identity, prompt alignment, and defects.
Cut: rhythm, sound, and retention.

**Follow-up:** Should the storyboard phase show visual quality scores?

**Answer**

No. Storyboard readiness is derived from the workflow and Shot completion but
is not shown as a progress score. Visual metrics such as character and style
consistency belong to Final Cut, where a selected configured evaluator scores
extracted frames against an explicit rubric. The product must not fabricate
scores when no evaluator is available.

**Extension:** How can judge bias be reduced?

**Answer**

Use fixed rubrics, blinded model identity, pairwise comparisons, multi-rater
calibration, and continuous monitoring of inter-rater agreement and gaming
resistance.

## Q8. How should character and scene consistency be preserved?

**Answer**

Maintain a style bible for characters, costume, locations, props, and visual
tone. Each shot references the relevant assets and is checked for eyeline,
screen direction, and spatial relationships.

**Follow-up:** Is repeating one description in every prompt sufficient?

**Answer**

No. Text alone cannot lock identity and space. Use structured references,
first/last frames, or subject references, then run post-generation consistency
checks.

**Extension:** Should every shot be regenerated when one drifts?

**Answer**

No. Use a continuity graph to identify dependent nodes and regenerate only the
affected shots while retaining approved results.

## Q9. How should credits and user expectations be controlled?

**Answer**

Show budgets at the sequence or production-package level, distinguish previews,
final shots, and alternate takes, and require a low-cost animatic before
expensive generation.

**Follow-up:** Is a confirmation dialog per shot enough?

**Answer**

No. Per-shot confirmation prevents individual mistakes but cannot control the
whole sequence. Use sequence budgets, quota reservations, and hard stop limits.

**Extension:** What should the cost system record?

**Answer**

Estimates, approver, idempotency key, provider cost, actual credits, retry
reason, and selected take, forming a reconcilable credit ledger.

## Q10. How should a sudden drop in generation success be diagnosed?

**Answer**

Locate the failed state first: pre-submit, uncertain submit, queued, running,
download, or completion. Then segment by provider, model, region, and release
time.

**Follow-up:** Should model quality or infrastructure be inspected first?

**Answer**

Use observability signals to locate the boundary before assigning blame. Error
codes, timeouts, queue depth, and download metrics quickly separate
infrastructure, provider, and content-policy failures.

**Extension:** What should observability include?

**Answer**

Traces spanning project, shot, job, and provider task; structured logs;
SLI/SLOs; latency and success rates; idempotency interception; credit usage;
canaries; feature flags; and kill switches.

## Q11. Why not let one autonomous Agent do everything?

**Answer**

Video creation combines creative uncertainty with irreversible cost. Unbounded
autonomy makes permissions, budgets, recovery, and audit difficult to prove.
Use high autonomy in ideation and strict constraints in production.

**Follow-up:** Does more autonomy always mean more intelligence?

**Answer**

Autonomy expands the action space, not the quality of decisions. A production
Agent needs boundaries, confirmation gates, and replayable state to turn
capability into reliable delivery.

**Extension:** Which actions require human approval?

**Answer**

Billable generation, batch regeneration, asset deletion, public publishing,
permission changes, and budget changes require allowlisted tools and explicit
approval.

## Q12. What is the most important engineering principle for a video Agent?

**Answer**

Represent creative decisions as structured data that can be validated, traced,
and edited locally so Agent reasoning can enter a reliable production state
machine.

**Follow-up:** Why is this more important than adding more Agents?

**Answer**

Without stable data contracts, more Agents only amplify context drift and state
inconsistency. Structured data makes delegation, recovery, evaluation, and
local regeneration verifiable.

**Extension:** Which base fields matter most?

**Answer**

Scene, beat, story function, cinematic grammar, subject action, continuity
references, and generation capability requirements connect previz, generation,
evaluation, and editing.

## Q13. What are the main technical trade-offs for a video Agent?

**Answer**

The main trade-offs are latency versus quality and cost, autonomy versus control,
consistency versus creative flexibility, single versus multiple Agents, and
polling versus realtime delivery. Architecture should address the current
bottleneck rather than pursue “more intelligent” or “more distributed” labels.

**Follow-up:** When should a single Agent be split into multiple Agents?

**Answer**

Split only when subtasks have independent tools, context, evaluation criteria,
and scaling needs. Adding Agents does not fix context drift and increases
coordination, tracing, and consistency costs.

**Extension:** How should architecture overdesign be avoided?

**Answer**

Measure whether the bottleneck is creative quality, provider latency, queue
pressure, or database contention, then choose the smallest change. Every added
component must justify its operational cost with observable benefit.

## Q14. How should a video generation system support high concurrency?

**Answer**

The API authenticates, validates, and enqueues work without waiting for
generation. Workers consume tasks according to provider quotas. Layered limits
for users, IPs, tenants, and providers combine with bounded queues, semaphores,
idempotency keys, connection pools, and backpressure.

**Follow-up:** What happens when provider concurrency is exhausted?

**Answer**

Tasks enter a fair queue prioritized by tenant, priority, and deadline, and the
client receives an explainable queued state. Billable submissions must not be
retried blindly, and autoscaling cannot exceed provider hard limits.

**Extension:** How should graceful overload work?

**Answer**

Use bounded queues, load shedding, circuit breakers, and preview degradation.
Protect accepted jobs, reject excess new work explicitly, and expose queue
depth, wait time, and rejection rate.

## Q15. How should a video Agent achieve high availability?

**Answer**

Keep the API stateless and multi-instance, make the database the source of
truth, and limit Redis to cache, queue, and coordination. Add health checks,
rolling releases, timeouts, and circuit breakers; support controlled provider
failover behind one adapter.

**Follow-up:** How should the system degrade when the database or Redis fails?

**Answer**

On database failure, stop new writes and preserve read-only behavior where
possible. On Redis failure, protect the database, pause queue consumption, and
recover from persisted jobs. Idempotency keys and reconciliation records must
survive to prevent duplicate submissions.

**Extension:** What belongs in high-availability acceptance?

**Answer**

Define RTO and RPO, then rehearse instance failure, database failover, queue
recovery, provider outage, and regional failure. An architecture is not
complete until recovery has been exercised.

## Q16. How should fallback be designed for the video generation pipeline?

**Answer**

Use four fallback layers: explicit model degradation, provider failover,
low-cost preview or animatic, and cached read-only output with an error
explanation. Every fallback states quality, cost, and capability differences;
models are never silently replaced.

**Follow-up:** Can a provider timeout trigger immediate recreation elsewhere?

**Answer**

First check the idempotency key and task reference to determine whether the
request was accepted. Stop billable retries when the outcome is uncertain and
switch providers only after proving non-acceptance and respecting user policy.

**Extension:** How should fallback priority be determined?

**Answer**

Prioritize data safety, billing consistency, result availability, quality, and
latency in that order. Fallbacks must be observable, explainable, reversible,
and constrained by user budget and content policy.

## Q17. What is the VideoAgent Agent Loop?

**Answer**

It is currently a bounded planning run, not an unrestricted ReAct loop. FastAPI
accepts the user message, stores a `run_id`, assembles bounded Context, loads
Memory and current project resources, resolves an optional Skill, and executes
the single LangGraph `plan_storyboard` node. The planner returns a
`StoryboardPlan`; Pydantic validates it before workflow, Message, Character,
and Shot state are persisted. The director reply is then stored and returned.

**Follow-up:** Why does the waiting UI show many steps?

**Answer**

Each step is persisted in `agent_activities`, and the client polls by `run_id`
to display real `context → memory → skill → planning → validation → state →
reply` events. It does not simulate tool execution; a Skill or MCP call that did
not occur is never shown as completed.

**Extension:** When is a true multi-turn Loop needed?

**Answer**

A multi-node loop is needed when the Agent must choose its next action from tool
results, such as reading assets, invoking visual review, retrying from a typed
failure, or asking for missing input. That loop requires budgets, stopping
conditions, approval gates, and recoverable checkpoints.

## Q18. How are VideoAgent Context and Memory designed and managed?

**Answer**

Context is the bounded input for one planning call: project title, brief,
current request, locale, workflow stage/status, current Character/Shot
summaries, recent conversation, and optional Skill instructions. Short-term
Memory reads the eight most recent historical messages, clips each to 600
characters, excludes the current request, and caps Storyboard context at 20
Shots.

**Follow-up:** Where does long-term Memory live?

**Answer**

The relational database is the source of truth. It stores Project,
Conversation, Message, ProjectWorkflow, Storyboard, Character, Shot, Asset, and
GenerationJob state. Vector memory, cross-project user memory, and automatic
long-term summaries are not enabled.

**Extension:** What is required before adding vector Memory?

**Answer**

Add user/project isolation, deduplication, TTL, deletion propagation,
permission checks, and inspectable retrieval. Retrieved text is still a bounded
Context input; it never replaces authoritative database state or approval
records.

## Q19. How are VideoAgent Skills, MCP, and SubAgents invoked?

**Answer**

A Skill is not currently a tool execution. The composer writes its ID into
project `Production settings`. The Context Builder looks up a Skill published
by the current user and attaches persisted instructions and the starter prompt
to Planner Context. A built-in Skill without database instructions contributes
only its ID as a directing constraint.

**Follow-up:** Does the Storyboard Agent call MCP directly?

**Answer**

No. MCP is behind the billable provider boundary. After explicit generation
approval, the Generation API resolves a provider. With the Kling MCP backend,
the Provider Resolver creates a `StreamableHTTPToolClient` with the current
user's OAuth token, then `KlingVideoProvider` invokes `text_to_video`,
`image_to_video`, or `query_tasks`. The default China-region path uses a
controlled CLI subprocess. This prevents the planning Agent from creating
unreviewed billable side effects.

**Extension:** Are there SubAgents today?

**Answer**

No. There is currently one LangGraph `plan_storyboard` node and no SubAgent
runtime, delegation protocol, or parallel subgraph. Split responsibilities only
when writing, visual, review, or production work has independent tools,
context, acceptance criteria, and scaling needs. Every SubAgent would still
share the traceable `run_id`, budget, and approval boundary.

## Q20. How are VideoAgent Hooks used?

**Answer**

A Hook is a directing constraint for the opening seconds that establishes
attention. It is not a webhook or runtime event. The composer offers Auto,
visual impact, narrative twist, spoken hook, sound cue, and proof-first
openings. VideoAgent writes the selected Hook into the project brief and uses
it while planning the creative direction, first narrative beat, and opening
shot. Auto lets the Agent choose according to subject, audience, and platform.

To use a Hook, select one in the composer or apply a Playbook with a default
Hook, describe the subject and desired response, approve the direction, then
ask for a targeted change such as “make the opening more proof-led” if the first
beat does not match. Hook selection remains visible in Settings and can be
changed before any billable generation.

**Follow-up:** How is a Hook different from a Playbook?

**Answer**

A Playbook is a complete reusable starting strategy containing a prompt, Skill,
Hook, style, frame, duration, model, and review mode. A Hook defines only how
the opening earns attention. One Playbook can use different Hooks, and one Hook
can appear in multiple Playbooks.

**Extension:** Does a Hook guarantee performance?

**Answer**

No. It constrains intent, while results still depend on writing, shots,
performance, editing, and audience. Use batch variants to compare several
openings against completion and engagement data rather than treating a Hook as
a performance guarantee.

## Q21. How does VideoAgent choose a model when a Skill has multiple Provider implementations?

**Answer**

The Agent resolves candidates by task and capability: text, image, or video;
text/image/video references; duration; aspect ratio; audio and language; output
quality; provider availability; and estimated credits. The project default is
preselected, but it is not treated as a permanent lock. If two providers can
complete the same Skill, the task editor exposes the available
`Provider/Model` choices and the user confirms by estimating or generating
instead of the system silently switching providers.

**Follow-up:** Can the user change the model after the project has started?

**Answer**

Yes. Character generation exposes an image-model selector, and Shot
generation exposes a video-model selector for both text-to-video and
image-to-video. “Project default” inherits the initial choice; an explicit
override applies to the next generation and invalidates the previous estimate.
Provider switching never happens silently after a paid task has been accepted.

**Extension:** Can the user change the text-planning model too?

**Answer**

Planning-model choice belongs to the same task-routing rule, but the current
deployment exposes the planner configured by the administrator. If multiple
planning models are configured, the selector should live in Settings and show
their reasoning, context, latency, and price trade-offs. Generated content from
one model is never described as if another model produced it.

