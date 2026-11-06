# VideoAgent Product Requirements

| Attribute | Value |
| --- | --- |
| Document version | v1.7 |
| Updated | 2026-11-06 |

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
Videos
Assets
Docs
```

The left navigation bottom shows the avatar and username trigger without a
trailing chevron. Its popover spans the navigation width minus the `13px` inner
padding on both sides. It contains Languages, Notifications, Credits, and
account actions. The current language is shown inline with a right-pointing
expansion control that opens a separate right-side flyout containing English
and Chinese vertically. Empty notification copy is
omitted, and a green dot appears only when unread notifications exist.

The avatar opens login and registration when signed out. When signed in, it
shows the account email and a sign-out action.

## 4. Agents

- The home view contains a prominent prompt composer.
- The composer supports skill, hook, style, frame, duration, model, quality,
  audio, and review settings.
- The Model selector lists every currently available video model as
  `Provider/Model`.
- Character and Scene pages expose image-model selection; Shot pages expose
  video-model selection for both text-to-video and image-to-video. “Project
  default” inherits the initial choice, and changing a model invalidates the
  prior estimate.
- When one Skill has multiple Provider implementations, task editors expose the
  known `Provider/Model` choices while the project default remains preselected.
  Providers are not switched silently; estimation and generation confirm the
  current selection.
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

### 5.2 Search, Ranking, and Publishing

- Skills has a top search field.
- The search field stays pinned to the top while content scrolls.
- Search matches user ID, skill ID, title, and description.
- Category filters cover Generation, Story, Workflow, Post, Review, and
  Utility.
- Cards show unique likes, unique account uses, and the category immediately
  after the title. Individual cards show neither rank nor reward.
- The leaderboard score is `unique uses × 2 + unique likes × 3`.
- Authors cannot like their own Skill. A user contributes at most one like and
  one use signal to the same published Skill.
- A user can publish a skill using the same publish interaction pattern used by
  Videos.
- User-published IDs follow `<user_id>/<skill_id>`.
## 6. Videos

- The top area contains a search field.
- The search field stays pinned to the top while content scrolls.
- Category filters cover Vlog, Product, Drama, Music, Localization, and
  Campaign.
- Users can sort by likes or publication time while rank remains based on
  unique likes.
- Each account contributes at most one like to a post, and authors cannot like
  their own post.
- Cards play muted looping video.
- Each card shows the title with its category immediately after it, followed by
  author and likes. Individual cards show neither rank nor earned credits.
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
- Assets displays the current user's real Videos and Skills. Every card
  opens a detail dialog, and video details support playback.

### 7.1 Project Workspace and Delivery

- The resource tree has three peer groups: `Directions` contains editable
  Settings, Outlines, and Scripts; `Visions` contains Characters, Scenes, and
  Shots; `Versions` contains exported final video versions with their creation
  dates.
- Settings combines production attributes and extracted Agent-director clues in
  one `Attribute / Value` table. Q&A is reduced to semantic keys and values;
  approval messages are not treated as attributes.
- The English workspace does not render raw Chinese dialogue as Settings values.
  Recognized Chinese directing terms are normalized to English, while uncertain
  input is omitted. Long briefs are split into duration, format, product,
  opening, development, ending, tone, visual style, and lighting attributes
  instead of being stored as `Creative brief` or `Director direction`.
- The approval loop fills Settings from the brief, conversation, and option
  choices. Once the direction is sufficient, Agents produce Outlines and Scripts
  and create reusable Character and Scene objects before organizing Shots.
- Shot estimation and generation require at least one defined Character and one
  defined Scene, so every Shot is organized against reusable production objects.
- Characters and Scenes own their uploaded references. Each object directory
  groups its images and selected reference. Scenes retain a physical location.
- Character and Scene pages support text-to-image and image-to-image generation
  with task-level image-model selection.
- While Agents are planning, the conversation shows durable execution steps for
  context assembly, memory loading, Skill resolution, planning, validation,
  project-state updates, and reply composition.
- The execution trace reflects completed or active work only. It must not
  display a Skill or MCP tool as executed when the Agent has not called it.
- Final Cut provides optional publish-time visual review. Users choose a
  configured vision evaluator and metrics such as character consistency, style
  consistency, prompt alignment, and temporal stability.
- Settings, Outlines, Scripts, Characters, Scenes, Shots, and version metadata
  remain editable or inspectable in place.
- Uploads receive a stable asset ID and append `@<asset-id>` to the active
  Prompt. Shots and Characters infer reference generation from that ID.
- Shot, Character, and Scene results are grouped under their resource directory. Each
  result supports final-selection checkbox, ID copy, preview, and deletion.
- Navigation, Assets, Canvas, and Agents default to equal desktop widths and
  provide draggable separators.
- Character and shot Generation pages support an uploaded image, reference-image
  generation, or direct text generation where the selected model supports the
  mode. Generated media can be downloaded.
- Shot references may combine ordered image, video, and audio assets up to the
  selected model's declared limit.
- The Shot page can override model, task type, audio, and output resolution.
  Task types include `Auto`, reference remake, edit, and extend. Overrides apply
  only to the current Shot and participate in credit estimation.
- Uploads must pass content-type, file-signature, and size validation.
- Users can inspect estimated credits and explicitly approve generation.
- A final cut can be composed only after every storyboard Shot has a generated
  result. Deliveries support 21:9, 16:9, 9:16, and 1:1 formats.
- Shot duration may extend to 30 seconds when the selected model supports it;
  the provider capability remains authoritative.
- Final-cut composition is normally requested in conversation, for example
  “Render the final cut”. An existing version can also adjust its frames,
  soundtrack or voice-over, and line-by-line captions before creating a new
  delivery version.
- Export supports 21:9, 16:9, 9:16, and 1:1, captions, an uploaded soundtrack,
  an automatic cover, and private or public permission.
- Each delivery can be downloaded, shared through an expiring asset link, or
  published to Videos.
- Project sharing creates a collaboration link with view or edit permission.
  An optional invited email restricts acceptance to that account.
- Accepted collaborations appear in the collaborator's Projects and Recents;
  view-only members cannot mutate project content.
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
| Playbook | 策略 |
| Arch | 架构 |
| API | 接口 |
| Dev | 开发 |
| Test | 测试 |
| Ops | 运营 |
| FAQ | 客服 |
| TODO | 待办 |

Docs requirements:

- The first document, PRD, opens by default whenever Docs is entered.
- Search sits above the document body. The document directory is below search
  and to the left of the reader; it can collapse to an icon rail.
- Its default width matches the expanded VideoAgent navigation width and can
  be resized independently.
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

1. Navigation order is Agents, Skills, Videos, Assets, Docs.
2. Agents can choose a Skill.
3. Skills is one searchable flat catalogue using `user_id/skill_id`.
4. Provider-native capabilities use provider namespaces; cross-provider
   workflows use `video_agent`.
5. Users can publish a Skill.
6. Review appears as a normal Skill card.
7. Videos and Assets both provide top search.
8. Videos cards play video and show title above author and likes.
9. Assets uses internal Video and Skill tabs and shows permission and
    `yyyy-mm-dd` edit time.
10. Assets uses a waterfall layout; videos preview on hover and Skill cards have no cover.
11. Docs includes PRD, Playbook, Arch, API, Dev, Test, Ops, FAQ, and TODO in order.
12. Docs opens on PRD, uses a resizable left directory matching navigation
    width by default, and supports search plus bilingual switching.
13. Avatar provides login, registration, or sign-out based on session state.
14. Production playbooks fill the prompt and recommended production settings.
15. Videos scenario cards open Agents with the corresponding Skill selected.
16. The prompt grows with its content and empty-state suggestions disappear
    while typing.
17. Re-clicking the active playbook cancels selection and restores the previous draft.
18. The Model selector exposes all available video models.
19. Users can upload references, generate every shot, compose a film, download a
    delivery, share its content, and publish it.
20. User credit reservations, refunds, and Provider-account reconciliation agree.
21. Agents persist every recurring Character, Scene, and Shot. Character and
    Scene references remain attached to their object after planning revisions.
22. Reordering shots does not delete or recreate existing Shots.
23. Non-administrators cannot access administration APIs or pages.
24. Skills expose category filters, unique likes, unique uses, sorting, and a
    leaderboard score.
25. Videos exposes category filters, unique likes, rank, and reward projections.
26. Repeated likes toggle one account's contribution without inflating counts.
24. Administrators can manage credits, accounts, invites, and generation state,
    with every action recorded in the audit log.
