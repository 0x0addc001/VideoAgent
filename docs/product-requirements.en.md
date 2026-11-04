# VideoAgent Product Requirements

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Status | Current product baseline |
| Updated | 2026-11-04 |
| Product | VideoAgent |

## 1. Product Goal

VideoAgent helps a creator act as the director: describe an idea, select a skill
or production setting, generate controllable shots, review the result, and keep
finished or in-progress work organized in one workspace.

The product avoids marketing-only screens. Every primary view must expose a
concrete creation, review, publishing, search, or asset-management action.

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

## 4. Agents

- The home view contains a prominent prompt composer.
- The composer supports style, frame, duration, model, quality, audio, and
  review settings.
- A user can select a Skill before starting.
- Submitting creates a project and enters the project workspace.
- The VideoAgent headline and icon stream together.

## 5. Skills

### 5.1 Catalogue

Skills are one flat catalogue. They are not separated into atomic and workflow
sections.

Official skill IDs use:

```text
video_agent/<skill_id>
```

Examples:

```text
video_agent/text_to_video
video_agent/image_to_video
video_agent/reference_to_video
video_agent/first_last_frame
video_agent/motion_control
video_agent/video_extend
video_agent/video_edit
video_agent/video_upscale
video_agent/product_film
video_agent/creator_vlog
video_agent/short_drama
video_agent/review
```

Workflow skills do not display an internal flow diagram.

Review is a normal skill card. It has no separate action button.

### 5.2 Search and Publishing

- Skills has a top search field.
- The search field stays pinned to the top while content scrolls.
- Search matches user ID, skill ID, title, and description.
- A user can publish a skill using the same publish interaction pattern used by
  Hots.
- User-published IDs follow `<user_id>/<skill_id>`.
- Publishing is session-local until a persistent community API is implemented.

## 6. Hots

- Hots is listed above Assets in navigation.
- The top area contains a search field.
- The search field stays pinned to the top while content scrolls.
- Cards play muted looping video.
- Each card shows the title first and author and likes below.
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
- Assets are preview images only and do not autoplay.

## 8. Docs

Document order:

```text
PRD
Design
Interface
Impl
Test
Ops
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
- Search and filtering are client-side for current static views.
- User-published Skills and Hots posts are not persisted across devices yet.
- Public product UI is English; Chinese is currently enabled only for Docs.

## 11. Acceptance Criteria

1. Navigation order is Agents, Skills, Hots, Assets, Docs.
2. Hots is above Assets.
3. Agents can choose a Skill.
4. Skills is one searchable flat catalogue using `user_id/skill_id`.
5. Official Skills use the `video_agent` namespace.
6. Users can publish a Skill.
7. Review appears as a normal Skill card.
8. Hots and Assets both provide top search.
9. Hots cards play video and show title above author and likes.
10. Assets uses internal Video and Skill tabs and shows permission and
    `yyyy-mm-dd` edit time.
11. Assets uses a waterfall layout without playback.
12. Docs includes PRD, Design, Interface, Impl, Test, and Ops in order.
13. Docs search and bilingual switching work.
