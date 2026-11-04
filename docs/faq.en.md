# VideoAgent FAQ

| Attribute | Value |
| --- | --- |
| Document version | v2.0 |
| Updated | 2026-11-04 |

## Q1. How would you orchestrate a video Agent?

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

## Q2. The user says, “Change shot 3 only.” How do you implement that?

**Answer**

Route the request by intent, then apply the change to a stable shot ID. The
Agent returns a local shot patch with a version and operation log; other shots
and their approval state remain unchanged.

**Follow-up:** Should a review-only request replace the storyboard?

**Answer**

No. Review requests enter a read-only branch and return findings and
suggestions without producing a write operation.

**Extension:** How do you make local edits concurrency-safe?

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

## Q4. How do you make LLM output truly executable?

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

## Q6. What do you do when a generation request times out?

**Answer**

Enter `submission_uncertain`, preserve the idempotency key and request record,
then query the provider for reconciliation. If acceptance cannot be proven,
stop automatic submission and alert.

**Follow-up:** Can you simply retry three times?

**Answer**

Read-only status queries can use bounded backoff. Billable submissions cannot
be blindly retried; continue only after proving the request was not accepted or
after locating the same task through the idempotency key.

**Extension:** How do you prevent duplicate charges?

**Answer**

Use a database-level idempotency key, submission state machine, provider task
reference, and an explainable reconciliation path so at-least-once delivery
does not become duplicate billing.

## Q7. How should a video Agent be evaluated?

**Answer**

Evaluate by stage. Script: desire, conflict, turn, and ending. Board: coverage,
continuity, and feasibility. Shot: identity, prompt alignment, and defects.
Cut: rhythm, sound, and retention.

**Follow-up:** Are consistency, coverage, clarity, and pacing scores enough?

**Answer**

They are useful low-cost baselines, but rules such as “three shots equals full
coverage” are easy to game. Combine deterministic metrics with VLM review and
human preference data.

**Extension:** How do you reduce judge bias?

**Answer**

Use fixed rubrics, blinded model identity, pairwise comparisons, multi-rater
calibration, and continuous monitoring of inter-rater agreement and gaming
resistance.

## Q8. How do you preserve character and scene consistency?

**Answer**

Maintain a style bible for characters, costume, locations, props, and visual
tone. Each shot references the relevant assets and is checked for eyeline,
screen direction, and spatial relationships.

**Follow-up:** Is repeating one description in every prompt sufficient?

**Answer**

No. Text alone cannot lock identity and space. Use structured references,
first/last frames, or subject references, then run post-generation consistency
checks.

**Extension:** Should you regenerate every shot when one drifts?

**Answer**

No. Use a continuity graph to identify dependent nodes and regenerate only the
affected shots while retaining approved results.

## Q9. How do you control credits and user expectations?

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

## Q10. How do you debug a sudden drop in generation success?

**Answer**

Locate the failed state first: pre-submit, uncertain submit, queued, running,
download, or completion. Then segment by provider, model, region, and release
time.

**Follow-up:** Do you inspect model quality first or infrastructure first?

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

