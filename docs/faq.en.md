# VideoAgent Agent Engineering Interview FAQ

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-04 |
| Target roles | Video Agent engineering roles such as ByteDance Xiaoyunque and Kuaishou Kling |
| Answer rule | State the fact, explain the trade-off, then describe the evolution |

This FAQ is written from an interviewer's perspective. Answers emphasize system
boundaries, engineering trade-offs, and verifiability without presenting
hypothetical designs as shipped facts.

## Q1. How would you orchestrate a video Agent?

**Follow-up:** Why not start with a multi-Agent system?  
**Strong answer:**
Start with a deterministic workflow, not an unbounded ReAct loop. The main
path should cover brief, creative diagnosis, treatment, script/beats,
storyboard, continuity validation, previz, generation, shot QC, rough cut, and
delivery, with human gates for story, budget, and final direction. A single
planner is appropriate while responsibilities share one context. Split into
specialized Agents only when writing, visual planning, production, and review
need genuinely different tools and context.

**Extended topics:** LangGraph StateGraph, conditional edges, checkpoints,
human-in-the-loop, tool allowlists, structured output, recoverable state.

## Q2. The user says, “Change shot 3 only.” How do you implement that?

**Follow-up:** Should a review-only request replace the storyboard?  
**Strong answer:**
Route intent first: create, revise, review only, regenerate a take, or localize.
A local revision should return a shot patch, not a full storyboard. Stable shot
IDs, versions, and operation logs let only affected nodes change while
untouched shots remain intact.

**Extended topics:** function calling, JSON Patch, idempotent updates,
concurrent versions, event sourcing, optimistic locking.

## Q3. What fields define a production-ready shot?

**Follow-up:** Why are prompt, duration, and aspect ratio insufficient?  
**Strong answer:**
A prompt is a generation parameter, not a directing plan. A shot also needs
scene/beat, story function, shot size, angle, lens, movement, subject action,
gaze, blocking, lighting, palette, sound, transition, continuity references,
and entry/exit state. A prompt and duration alone cannot guarantee narrative,
spatial, gaze, and continuity constraints.

**Extended topics:** master/medium/close/insert/reaction, 180-degree rule,
30-degree rule, eyeline match, screen direction, match cut, motivated camera
movement.

## Q4. How do you make LLM output executable rather than merely plausible?

**Follow-up:** What happens after the model returns JSON?  
**Strong answer:**
Validate it with Pydantic, including required fields, duration, aspect ratio,
shot count, and references. Use a bounded repair loop, then return a structured
error. Before execution, negotiate provider capability such as supported
duration, audio, first/last frame, or reference inputs. The model makes
creative decisions; code enforces permissions, budget, and hard production
constraints.

**Extended topics:** schema validation, retry budget, repair loop, capability
negotiation, deterministic fallback, tool permissions.

## Q5. When should a video Agent use MCP versus a CLI?

**Follow-up:** Are the two integrations redundant?  
**Strong answer:**
Choose by runtime boundary, not protocol preference. A CLI fits stable
server-side jobs and batch operations. MCP fits exposing capabilities to
personal or cross-Agent workflows. Both should sit behind one Provider
contract that normalizes submit, query, cancel, errors, and result URLs.
Pippit is integrated through a server-side CLI and Kling through MCP tools;
both share one task contract.

**Extended topics:** adapters, capability discovery, OAuth, credential
isolation, timeout, uncertain submission, provider fallback.

## Q6. What do you do when a generation request times out?

**Follow-up:** Can you simply retry three times?  
**Strong answer:**
Never blindly retry a billable submission. Write the idempotency key and job
record first. On timeout enter `submission_uncertain`, query the provider, and
stop automatic submission if reconciliation is impossible. Read-only status
queries can use bounded backoff, but billable submission requires idempotency
and an explainable recovery path.

**Extended topics:** at-least-once delivery, idempotency, outbox, Celery,
dead-letter queue, reconciliation, state machines, SSE reconnect.

## Q7. How should a video Agent be evaluated?

**Follow-up:** Are the current consistency, coverage, clarity, and pacing
scores enough?  
**Strong answer:**
They are useful low-cost baselines, but counting at least three shots is not
real story coverage. Evaluate by stage: script for desire, conflict, turn, and
ending; boards for coverage, continuity, eyeline, and feasibility; shots for
identity, prompt alignment, and defects; the cut for rhythm, sound, and
retention. Combine deterministic rules, VLM review, and human preference data.

**Extended topics:** rubrics, LLM-as-a-judge, VLM, pairwise preference,
inter-rater agreement, gaming resistance, offline/online evaluation, guardrails.

## Q8. How do you preserve character and scene consistency across shots?

**Follow-up:** Is repeating one description in every prompt sufficient?  
**Strong answer:**
No. Use a style bible, reusable character/scene/prop references, shot-level
continuity references, and checks for screen direction, eyeline, wardrobe,
time, and spatial relationships. Run VLM checks after generation and
regenerate only affected shots. Kling Element and Omni-Ref can provide subject
references, but they should be adapted behind the same capability contract.

**Extended topics:** subject references, identity drift, motion continuity,
reference hierarchy, negative constraints, dependency graphs.

## Q9. How do you control credits and user expectations?

**Follow-up:** Is a confirmation dialog per shot enough?  
**Strong answer:**
No. Show a sequence-level budget and distinguish previews, final shots, and
alternate takes. Build a low-cost animatic before approving expensive
generation. Show why a regeneration is needed and its expected cost. Approval,
idempotency, and sequence budgets form one cost-control boundary.

**Extended topics:** budget envelopes, cost estimation, quota, reservation,
credit ledger, fallback models, cancellation, compensation.

## Q10. How do you debug a sudden drop in generation success?

**Follow-up:** Do you inspect model quality first or infrastructure first?  
**Strong answer:**
First locate the failed state: pre-submit, uncertain submit, queued, running,
download, or publishing. Segment by provider, model, region, release, and time
window. Check idempotency conflicts, timeouts, error codes, queue depth, and
media download. Disable unsafe billable retries, preserve task references and
audit records, then fail over or degrade without overwriting the original job.

**Extended topics:** golden signals, SLI/SLO, error budgets, tracing,
structured logging, canaries, feature flags, kill switches, postmortems.

## Q11. Why not let one autonomous Agent do everything?

**Follow-up:** Does more autonomy always mean more intelligence?  
**Strong answer:**
Video creation combines creative uncertainty with irreversible cost.
Unbounded autonomy makes permissions, budgets, state, and recovery hard to
prove. Use “high autonomy in ideation, strict constraints in production.”
The Agent can propose treatments and organize shots, while billable generation,
asset deletion, and public publishing require allowlisted tools and explicit
approval.

**Extended topics:** bounded autonomy, least privilege, confirmation gates,
replayability, auditability, deterministic boundaries.

## Q12. What is the most important engineering invariant for a video Agent?

**Follow-up:** Why is this more important than adding more Agents?
**Strong answer:**
Represent creative decisions as structured data that can be validated, traced,
and edited locally. Scene, beat, cinematic grammar, and continuity fields
underpin previz, evaluation, selective regeneration, and cost control.

