# VideoAgent Product Requirements

| Attribute | Value |
| --- | --- |
| Document version | v1.4 |
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

The account controls are fixed in the upper-right in this order:

```text
Language
Notifications
Credits
Avatar
```

The account-control container has no outer border.
Search, language, notifications, credits, and avatar controls use translucent
surfaces. Their menus open downward and use the same translucent treatment.

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
video_agent/<skill_id>
```

Examples:

```text
video_agent/search_all_resources
video_agent/text_to_video
video_agent/image_to_video
video_agent/reference_to_video
video_agent/first_last_frame
video_agent/motion_control
video_agent/video_extend
video_agent/video_edit
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
- Users can publish a post from the feed.
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

## 8. Docs

Document order:

```text
PRD
Design
Interface
Impl
Test
Ops
FAQ
TODO
```

English labels and Chinese short labels:

| English | Chinese |
| --- | --- |
| PRD | 产品 |
| Design | 设计 |
| Interface | 接口 |
| Impl | 实现 |
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
- The upper-right credit count reflects the active server provider.
- Generation requires explicit approval before a billable provider call.

## 10. Non-Functional Requirements

- Desktop and mobile layouts must avoid clipped controls.
- All primary controls must be keyboard accessible.
- Motion supports `prefers-reduced-motion`.
- Search and filtering run in the client.

## 11. Acceptance Criteria

1. Navigation order is Agents, Skills, Hots, Assets, Docs.
2. Agents can choose a Skill.
3. Skills is one searchable flat catalogue using `user_id/skill_id`.
4. Official Skills use the `video_agent` namespace.
5. Users can publish a Skill.
6. Review appears as a normal Skill card.
7. Hots and Assets both provide top search.
8. Hots cards play video and show title above author and likes.
9. Assets uses internal Video and Skill tabs and shows permission and
    `yyyy-mm-dd` edit time.
10. Assets uses a waterfall layout; videos preview on hover and Skill cards have no cover.
11. Docs includes PRD, Design, Interface, Impl, Test, Ops, FAQ, and TODO in order.
12. Docs search and bilingual switching work.
13. Avatar provides login, registration, or sign-out based on session state.
14. Production playbooks fill the prompt and recommended production settings.
15. Hots scenario cards open Agents with the corresponding Skill selected.
16. The prompt grows with its content and empty-state suggestions disappear
    while typing.
17. Re-clicking the active playbook cancels selection and restores the previous draft.
18. The Model selector exposes all available video models.
