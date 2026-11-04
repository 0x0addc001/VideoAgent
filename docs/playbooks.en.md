# VideoAgent Playbooks

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-04 |

A Playbook is a reusable production recipe. It combines a business scenario,
narrative structure, default production settings, and review policy into an
editable project starting point.

## 1. Common Structure

Every Playbook includes:

- Scenario name and target user
- Business objective and core message
- Default Skill, Hook, style, frame, duration, and review mode
- Input requirements and optional references
- Recommended narrative beats
- Output and delivery format
- Credit and model-capability constraints
- Review and fallback rules

## 2. Product Ad

For launches, proof-led creative, and performance ads.

- Hook: proof first
- Structure: Hook → use case → proof → hero packshot
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/product_film`
- Review: ask first

## 3. Creator Vlog

For personal stories, lifestyle content, and brand behind-the-scenes.

- Hook: visual atmosphere
- Structure: context → journey → emotional turn → personal close
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/creator_vlog`
- Review: auto

## 4. Micro Drama

For short-drama scenes, narrative ads, and social cliffhangers.

- Hook: narrative twist
- Structure: setup → escalation → cliffhanger or reveal
- Frame: 9:16
- Duration: 10 seconds
- Skill: `video_agent/short_drama`
- Review: ask first

## 5. Music Video

For music promotion, artist visuals, and rhythmic brand content.

- Hook: sound cue
- Structure: visual motif → performance → rhythmic escalation → return
- Frame: 16:9
- Duration: 10 seconds
- Skill: `video_agent/music_video`
- Review: ask first

## 6. Localize

For adapting existing footage to another market.

- Preserve edit, pacing, and product facts
- Adapt language, voice, subtitles, and presenter
- Skill: `video_agent/video_localization`
- Review: ask first

## 7. Batch Test

For creative matrices and Hook testing.

- Hold product facts and visual identity fixed
- Vary Hook, scene, and expression
- Produce labeled, comparable variants
- Skill: `video_agent/batch_variants`
- Duration: 5 seconds

## 8. Operations

- Every Playbook references an active Skill.
- Defaults stay aligned with composer fields.
- Unsupported model capabilities trigger explicit adjustment or fallback.
- Version changes update PRD, Arch, and Test.

