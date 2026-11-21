# VideoAgent Strategy

| Attribute | Value |
| --- | --- |
| Document version | v1.1 |
| Updated | 2026-11-21 |

A strategy is a system for designing how a business goal gets achieved. A Playbook is
only one executable template inside that system, not a synonym for it.

## 1. Strategy Layers

| Layer | Focus | Typical output |
| --- | --- | --- |
| Business | Goal, audience, channel, budget | Scenario choice and success metrics |
| Gameplay | Narrative structure, hooks, interaction, pacing | Playbooks, hook combinations, series plans |
| Production | Model routing, duration, frame, asset reuse | Cost and quality balance |
| Review | Compliance, brand safety, release cadence | Review checklist and fallback |

A Playbook is one executable template inside the gameplay layer: it fixes the default
Skill, hook, style, frame, duration and review mode for a known scenario so a creator can
start in one click. The list below is the current Playbook catalogue; new gameplay can be
added without changing the layer model itself.

## 2. Playbook Structure

Every Playbook includes:

- Scenario name and target user
- Business objective and core message
- Default Skill, Hook, style, frame, duration, and review mode
- Input requirements and optional references
- Recommended narrative beats
- Output and delivery format
- Credit and model-capability constraints
- Review and fallback rules

## 3. Product Ad

For launches, proof-led creative, and performance ads.

- Hook: proof first
- Structure: Hook → use case → proof → hero packshot
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/product_film`
- Review: ask first

## 4. Creator Vlog

For personal stories, lifestyle content, and brand behind-the-scenes.

- Hook: visual atmosphere
- Structure: context → journey → emotional turn → personal close
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/creator_vlog`
- Review: auto

## 5. Micro Drama

For short-drama scenes, narrative ads, and social cliffhangers.

- Hook: narrative twist
- Structure: setup → escalation → cliffhanger or reveal
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/short_drama`
- Review: ask first

## 6. Music Video

For music promotion, artist visuals, and rhythmic brand content.

- Hook: sound cue
- Structure: visual motif → performance → rhythmic escalation → return
- Frame: 16:9
- Duration: 10 seconds
- Skill: `video_agent/music_video`
- Review: ask first

## 7. Localize

For adapting existing footage to another market.

- Preserve edit, pacing, and product facts
- Adapt language, voice, subtitles, and presenter
- Skill: `video_agent/video_localization`
- Review: ask first

## 8. Batch Test

For creative matrices and Hook testing.

- Hold product facts and visual identity fixed
- Vary Hook, scene, and expression
- Produce labeled, comparable variants
- Skill: `video_agent/batch_variants`
- Duration: 5 seconds

## 9. Operations

- Every Playbook references an active Skill.
- Defaults stay aligned with composer fields.
- Unsupported model capabilities trigger explicit adjustment or fallback.
- Version changes update PRD, Arch, and Test.

