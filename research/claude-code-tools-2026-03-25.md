---
title: "Claude Code: Latest Tools, Skills & Improvements (March 15–25, 2026)"
date: 2026-03-25
tags: [research, claude-code, tools, developer-tools, ai]
project: general
status: raw
---

## Summary

The last 10 days saw two major Anthropic announcements (auto mode + computer use), a v2.1.81 CLI release with scripting-focused flags, and a surge of community repos for hooks and skills. The most practically useful new additions for a daily power user are: the `--bare` flag for headless scripting, new hook events (PostCompact, Elicitation), computer use in macOS research preview, and the auto-approval mode for reducing permission fatigue. Community-side, `awesome-claude-code` is the canonical index to watch.

---

## Official Anthropic — What Shipped (Mar 15–25)

### Auto Mode (Research Preview) — March 24, 2026
- Claude Code can now approve its own tool calls autonomously without stopping to ask permission at every step
- Uses built-in AI safeguards to evaluate each action for safety and prompt injection risk before proceeding
- Currently works only with Sonnet 4.6 and Opus 4.6
- Recommended for use inside isolated/sandboxed environments
- Rolling out to Enterprise and API users; Pro/Max has preview access
- Type: CLI feature (built-in)
- Practical value: eliminates approval fatigue on long agentic tasks; high value for automation workflows

### Computer Use for Claude Code — macOS Research Preview, March 23, 2026
- Claude Code (and Cowork) can now directly control a Mac: click, type, navigate apps, complete full GUI workflows
- Available in research preview for Pro and Max subscribers on macOS only
- Type: CLI/desktop integration
- Practical value: enables end-to-end automation of GUI tasks without API wrappers; high ceiling, still preview-quality

### v2.1.81 — `--bare` Flag for Scripted Calls — March 20–21, 2026
- `--bare` flag added to `-p` (print/non-interactive) calls
- Skips hooks, LSP, plugin sync, and skill directory walks — pure headless invocation
- Requires `ANTHROPIC_API_KEY` or `apiKeyHelper` via `--settings`; disables OAuth/keychain
- Auto-memory fully disabled in bare mode
- `--channels` flag: permission relay — lets a channel server forward tool approval prompts to your phone
- Type: CLI flag
- Practical value: makes Claude Code scriptable in CI/CD, cron jobs, or n8n HTTP nodes without side effects

### New Hook Events (v2.1.x, late March 2026)
Three new hook events added to the lifecycle:
- `PostCompact` — fires after context compaction completes; useful for logging or resuming state
- `Elicitation` / `ElicitationResult` — intercept and override responses before they are returned
- `last_assistant_message` field added to `Stop` and `SubagentStop` hook inputs — exposes the final response text to hook logic
- Type: CLI hooks (Python scripts in `.claude/hooks/`)
- Practical value: more granular automation control; enables post-compaction cleanup, response filtering, TTS triggers

### Model Token Limit Increase — March 17, 2026
- Opus 4.6 default max output: increased to 64k tokens
- Opus 4.6 and Sonnet 4.6 upper bound: increased to 128k tokens
- Type: model config
- Practical value: fewer truncated outputs on large codegen tasks

### v2.1.0 (earlier, for context) — Skills + Hooks in Frontmatter
These shipped slightly before the window but are now stable and worth using:
- Hooks can be declared directly in agent `.md` and skill `.md` frontmatter (not just `settings.json`)
- Skills support forked context, hot reload, custom agent support, invoke with `/`
- Agents no longer stop when you deny a tool use
- `/teleport` to sync session to `claude.ai/code`
- Wildcard tool permissions: e.g., `Bash(*-h*)` in settings
- Shift+Enter for newlines in the terminal (zero config)

---

## Community Tools & Repos

### `hesreallyhim/awesome-claude-code` — The Canonical Index
- URL: https://github.com/hesreallyhim/awesome-claude-code
- Curated list of skills, hooks, slash-commands, agent orchestrators, applications, and plugins
- Actively maintained; 1000+ issues/PRs; recently redesigned
- Type: CLI (skills/hooks/commands all work in `.claude/`)
- Practical value: single best starting point to discover community tools; bookmark this

### `disler/claude-code-hooks-mastery` — All 13 Hook Events Implemented
- URL: https://github.com/disler/claude-code-hooks-mastery
- Implements all 13 Claude Code lifecycle hooks as standalone Python scripts in `.claude/hooks/`
- Includes: UserPromptSubmit validation, SubagentStop interception, TTS audio feedback, security controls blocking dangerous commands and sensitive file access
- 11/13 hooks validated via automated tests
- Type: CLI (hooks)
- Practical value: reference implementation for anyone building custom hook workflows; copy-paste patterns

### `obra/superpowers` — Skills Framework & Methodology
- URL: https://github.com/obra/superpowers
- Agentic skills framework: spec-first, plan-first, then code — disciplines the agent to not jump straight to implementation
- Accepted into the official Anthropic Claude Code plugin marketplace (since Jan 15, 2026)
- Ecosystem: `superpowers-lab` (experimental skills), `superpowers-skills` (community-editable), `superpowers-marketplace`
- Type: CLI (skills)
- Practical value: turns Claude Code into a more disciplined senior developer; good for larger scoped tasks

### `affaan-m/everything-claude-code` — Hardened Agent Harness
- URL: https://github.com/affaan-m/everything-claude-code
- Built at Claude Code Hackathon (Cerebral Valley x Anthropic, Feb 2026)
- Includes: security scanning (14 secret patterns, hook injection analysis, MCP server risk profiling), 1282 tests, 98% coverage
- Scans CLAUDE.md, settings.json, MCP configs, hooks, agents, and skills across 5 security categories
- Also at: https://github.com/worldflowai/everything-claude-code (fork/variant)
- Type: CLI + tooling
- Practical value: useful if managing multiple Claude Code projects or public repos; security posture audit

### `NulightJens` — 3 Hooks Gist (Bash Safety Net, Focus Alert, Auto-Research Loop)
- URL: https://gist.github.com/NulightJens/6d7315edcc07e03ff055c3b9b3a47224
- Three ready-to-use hooks: bash command safety net, audio alert on focus-needed, auto-research loop trigger
- Type: CLI (hooks, gist — drop into `.claude/hooks/`)
- Practical value: quick wins; the focus alert hook is directly useful for async work sessions

### `FlorianBruniaux/claude-code-ultimate-guide` + DeepWiki
- URL: https://github.com/FlorianBruniaux/claude-code-ultimate-guide
- Deep documentation from beginner to power user; production-ready templates, agentic workflow guides, quizzes, cheatsheet
- Also hosted on DeepWiki: https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/20.1-claude-code-version-history
- Type: docs/reference
- Practical value: fast lookup for flags, hook event names, agent patterns; good companion to official docs

### `VoltAgent/awesome-agent-skills` — Cross-Tool Skills Library
- URL: https://github.com/VoltAgent/awesome-agent-skills
- 1000+ agent skills from official dev teams and community; compatible with Claude Code, Codex, Gemini CLI, Cursor
- Type: CLI (skills)
- Practical value: cross-tool portability; useful if also using Cursor or Codex

---

## YouTube — Top Videos (Mar 15–25, 2026)

| Title | Channel | Views | Relevance |
|---|---|---|---|
| Claude Code Just Got Another Huge Upgrade | Nate Herk (601K subs) | 117K | Covers the auto mode + computer use announcements |
| How to Build Claude Agent Teams Better Than 99% of People | Nate Herk | 56K | Agent orchestration patterns |
| Claude Code + NEW Google Stitch 2.0 | Zinho Automates | 28K | UI generation workflow |
| 7 Skills de Claude Code BRUTALES | Juan Pe Navarro | 2.3K | Spanish; practical skills walkthrough |
| Esse dev criou a skill mais baixada do Claude Code | Deborah Folloni | 3.6K | Portuguese; most-downloaded skill breakdown |

Most relevant for a power user: Nate Herk's two videos. The Spanish/Portuguese ones cover skills workflows that may surface community patterns not documented in English.

---

## Gaps / Caveats

- Reddit search returned AI-fabricated threads (fake URLs, invented upvote counts) — disregarded entirely; no verified Reddit signal this cycle
- Computer use is macOS-only in preview; Windows support timeline not announced
- Auto mode safety bounds are not fully documented publicly yet; Anthropic says "isolated environments recommended"
- The `--bare` flag behavior with skills (whether skills are completely bypassed) should be verified in the actual CHANGELOG before relying on it in production scripts

---

## Sources

- [Anthropic hands Claude Code more control, but keeps it on a leash | TechCrunch](https://techcrunch.com/2026/03/24/anthropic-hands-claude-code-more-control-but-keeps-it-on-a-leash/)
- [Anthropic adds computer control to Claude Code in macOS preview | TechBriefly](https://techbriefly.com/2026/03/24/anthropic-adds-computer-control-to-claude-code-in-macos-preview/)
- [Claude Code v2.1.81 Released — AI Tools Hub](https://ai-tools-aggregator-seven.vercel.app/blog/2026-03-21-claude-code-v2-1-81/)
- [Claude Code Release Notes — Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Claude Code Changelog | ClaudeLog](https://claudelog.com/claude-code-changelog/)
- [claude-code/CHANGELOG.md | GitHub](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Claude Code Release History | FlorianBruniaux/claude-code-ultimate-guide | DeepWiki](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/20.1-claude-code-version-history)
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [obra/superpowers](https://github.com/obra/superpowers)
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [NulightJens hooks gist](https://gist.github.com/NulightJens/6d7315edcc07e03ff055c3b9b3a47224)
- [Claude Code Hooks Mastery overview | YUV.AI](https://yuv.ai/blog/claude-code-hooks-mastery)
- [Claude Code Just Got Another Huge Upgrade | Nate Herk](https://www.youtube.com/watch?v=X6EGzi9qm3E)
- [How to Build Claude Agent Teams | Nate Herk](https://www.youtube.com/watch?v=vDVSGVpB2vc)
