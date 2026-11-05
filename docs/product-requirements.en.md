# VideoAgent Product Requirements

| Attribute | Value |
| --- | --- |
| Document version | v1.6 |
| Updated | 2026-11-04 |

## 1. Product Goal

VideoAgent helps a creator act as the director: describe an idea, select a skill
or production setting, generate controllable shots, review the result, and keep
finished or in-progress work organized in one workspace.

Every primary view is organized around a concrete creation, review, publishing,
search, or asset-management task.

## 2. Target Users

- Independent video creators.
- Product and brand marketing teams.
- Social media operators.
- Short-drama and narrative creators.
- Users who need controllable video generation across multiple model providers.

## 3. Navigation

Desktop navigation is fixed on the left in this order:

```text
Agents
Skills
Hots
Assets
Docs
```

The left navigation bottom shows the avatar and username in one profile trigger.
Language, notifications, and credits live inside its popover instead of using
separate bottom controls. All surfaces are translucent and open upward.

The avatar opens login and registration when signed out. When signed in, it
shows the account email and a sign-out action.

## 4. Agents

- The home view contains a prominent prompt composer.
- The composer supports skill, hook, style, frame, duration, model, quality,
  audio, and review settings.
- The Model selector lists every currently available video model as
  `Provider/Model`.
- The prompt editor grows downward as wrapped text or line count increases.
- Idea prompts are visible only when the prompt is empty; production playbooks
  remain available for switching.
- A user can select a Skill before starting.
- Composer setting menus open above or below the trigger based on viewport
  space and remain inside the visible area.
- Production playbooks provide one-click starting points for product ads,
  creator vlogs, micro drama, music videos, localization, and batch variants.
- Applying a playbook fills the prompt and sets its recommended Skill, Hook,
  style, frame, duration, and review mode.
- Selecting the active playbook again cancels it and restores the composer
  state that existed before the playbook was applied.
- Submitting creates a project and enters the project workspace.
- The VideoAgent headline and icon stream together.

## 5. Skills

### 5.1 Catalogue

Skills use one flat catalogue with task-oriented cards.

Official skill IDs use:

```text
<provider_or_product>/<skill_id>
```

Kling-native capabilities use the `kling` namespace. Cross-provider workflows
and product-level Skills use `video_agent`.

Examples:

```text
video_agent/search_all_resources
kling/text_to_video
kling/image_to_video
kling/reference_to_video
kling/first_last_frame
kling/motion_control
kling/video_extend
kling/video_edit
video_agent/style_transfer
video_agent/video_upscale
video_agent/product_film
video_agent/creator_vlog
video_agent/short_drama
video_agent/review
video_agent/video_localization
video_agent/batch_variants
video_agent/script_assistant
video_agent/smart_preview
video_agent/camera_movement
video_agent/music_video
video_agent/reference_remake
video_agent/agent_handoff
```

Review uses the same skill-card structure as other task-oriented Skills.

### 5.2 Search and Publishing

- Skills has a top search field.
- The search field stays pinned to the top while content scrolls.
- Search matches user ID, skill ID, title, and description.
- A user can publish a skill using the same publish interaction pattern used by
  Hots.
- User-published IDs follow `<user_id>/<skill_id>`.
## 6. Hots

- The top area contains a search field.
- The search field stays pinned to the top while content scrolls.
- Cards play muted looping video.
- Each card shows the title first and author and likes below.
- Each scenario card opens Agents with its prompt and corresponding Skill.
- Users can publish a post from the feed. Publishing requires an MP4 upload,
  title, description, and Skill.
- Search matches title, author, and prompt.

## 7. Assets

Assets contains the current user's finished and in-progress work.

- The top area contains a search field.
- The search field stays pinned to the top while content scrolls.
- Cards are arranged as a waterfall.
- Internal Video and Skill tabs separate the two asset types; cards do not
  repeat type labels.
- Each card shows permission: `private` or `public`.
- Edit time uses `yyyy-mm-dd`.
- Duration, progress, and summary are not shown.
- Video cards play a muted loop on hover and pause when hover ends. Skill cards
  have no cover image.
- Assets displays the current user's real Hots videos and Skills. Every card
  opens a detail dialog, and video details support playback.

### 7.1 Project Workspace and Delivery

- The resource tree groups `Settings`, `Outlines`, and `Scripts` under
  `Direction`, and `Characters`, `Shots`, and `Final Cut` under `Vision`.
- Settings combines production attributes and extracted Agent-director clues in
  one `Attribute / Value` table. Q&A is reduced to semantic keys and values;
  approval messages are not treated as attributes.
- Agents create a directory for every recurring character and shot. Characters
  expose Description and Generation pages; each Shot opens one combined
  Description and Generation page.
- While Agents are planning, the conversation shows durable execution steps for
  context assembly, memory loading, Skill resolution, planning, validation,
  project-state updates, and reply composition.
- The execution trace reflects completed or active work only. It must not
  display a Skill or MCP tool as executed when the Agent has not called it.
- The editor header shows a live production-progress bar derived from workflow
  stage and completed Shots. It polls every three seconds and does not present
  readiness as visual quality.
- Final Cut provides optional publish-time visual review. Users choose a
  configured vision evaluator and metrics such as character consistency, style
  consistency, prompt alignment, and temporal stability.
- Settings, Outlines, Scripts, Characters, Shots, and Final Cut metadata are
  editable in place.
- Uploads receive a stable asset ID and append `@<asset-id>` to the active
  Prompt. Shots and Characters infer reference generation from that ID.
- Shot and Character results are grouped under their resource directory. Each
  result supports final-selection checkbox, ID copy, preview, and deletion.
- Navigation, Assets, Canvas, and Agents default to equal desktop widths and
  provide draggable separators.
- Character and shot Generation pages support an uploaded image, reference-image
  generation, or direct text generation where the selected model supports the
  mode. Generated media can be downloaded.
- Uploads must pass content-type, file-signature, and size validation.
- Users can inspect estimated credits and explicitly approve generation.
- Generated shots can be composed into a film with 16:9, 9:16, and 1:1 deliveries.
- Export supports captions, an uploaded soundtrack, an automatic cover, and
  private or public permission.
- Each delivery can be downloaded; share links expire and can be revoked.
- Assets lists only uploads, generated clips, deliveries, and community posts
  available to the current user.

## 8. Docs

Document order:

```text
PRD
Playbook
Arch
API
Dev
Test
Ops
FAQ
TODO
```

English labels and Chinese short labels:

| English | Chinese |
| --- | --- |
| PRD | 产品 |
| Playbook | 玩法 |
| Arch | 架构 |
| API | 接口 |
| Dev | 开发 |
| Test | 测试 |
| Ops | 运营 |
| FAQ | 客服 |
| TODO | 待办 |

Docs requirements:

- A search field is available at the top.
- The search field stays pinned to the top while content scrolls.
- Search covers document text in both languages.
- The language control changes only Docs.
- The left table of contents supports navigation, highlighting, and collapse.
- English and Chinese versions use the same document order.
- The Docs area uses a fixed dark theme without a theme toggle.

## 9. Authentication and Credits

- Users authenticate with email and password.
- Credentials are stored only as cryptographic hashes.
- Sessions use HttpOnly cookies.
- The sidebar credit count reflects the current user's VideoAgent balance
  without exposing the shared Provider account pool.
- Generation requires explicit approval before a billable provider call.
- Credits are reserved before submission and refunded idempotently after submit,
  generation, or cancellation failures.

## 10. Administration

- The administration route is `/<locale>/admin` and is restricted to emails in
  `VIDEOAGENT_ADMIN_EMAILS`.
- Overview metrics include users, projects, generation jobs, running jobs,
  failed jobs, and assets.
- Administrators can inspect user email, project count, credits, status, and
  registration time.
- Administrators can disable or restore accounts; disabling revokes existing
  sessions.
- Administrators can add or remove credits with a recorded reason.
- Administrators can inspect generation jobs and refund failed, cancelled, or
  uncertain credit holds.
- Administrators can create and revoke invite codes and switch registration
  between open, invite-only, and closed.
- Administrators can pause or resume all video generation; both estimation and
  submission are blocked while paused.
- Administrative actions are written to an audit log.
- Administrator identity is configured through the environment allowlist, not
  granted dynamically from the product UI.

## 11. Non-Functional Requirements

- Desktop and mobile layouts must avoid clipped controls.
- All primary controls must be keyboard accessible.
- Motion supports `prefers-reduced-motion`.
- Search and filtering run in the client.

## 12. Acceptance Criteria

1. Navigation order is Agents, Skills, Hots, Assets, Docs.
2. Agents can choose a Skill.
3. Skills is one searchable flat catalogue using `user_id/skill_id`.
4. Provider-native capabilities use provider namespaces; cross-provider
   workflows use `video_agent`.
5. Users can publish a Skill.
6. Review appears as a normal Skill card.
7. Hots and Assets both provide top search.
8. Hots cards play video and show title above author and likes.
9. Assets uses internal Video and Skill tabs and shows permission and
    `yyyy-mm-dd` edit time.
10. Assets uses a waterfall layout; videos preview on hover and Skill cards have no cover.
11. Docs includes PRD, Playbook, Arch, API, Dev, Test, Ops, FAQ, and TODO in order.
12. Docs search and bilingual switching work.
13. Avatar provides login, registration, or sign-out based on session state.
14. Production playbooks fill the prompt and recommended production settings.
15. Hots scenario cards open Agents with the corresponding Skill selected.
16. The prompt grows with its content and empty-state suggestions disappear
    while typing.
17. Re-clicking the active playbook cancels selection and restores the previous draft.
18. The Model selector exposes all available video models.
19. Users can upload references, compose a film, download a delivery, and
    create a share link.
20. User credit reservations, refunds, and Provider-account reconciliation agree.
21. Agents persist every recurring Character and Shot; Characters expose
    Description and Generation, while each Shot opens one combined page.
22. Reordering shots does not delete or recreate existing Shots.
23. Non-administrators cannot access administration APIs or pages.
24. Administrators can manage credits, accounts, invites, and generation state,
    with every action recorded in the audit log.
