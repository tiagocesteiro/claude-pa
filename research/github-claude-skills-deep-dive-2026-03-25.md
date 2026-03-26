---
title: "GitHub Deep Dive: Claude Code Skills, Hooks, Slash Commands & Extensions"
date: 2026-03-25
tags: [research, claude-code, skills, hooks, slash-commands, subagents, github]
project: general
status: raw
---

## Summary

The GitHub ecosystem for Claude Code extensions has exploded. There are now multiple curated "awesome" lists, 1000+ community skills, specialized hook repos, 100+ subagent collections, and at least one officially accepted plugin framework (obra/superpowers). The most actionable finds for Tiago: the n8n-skills package (directly useful), the obra/superpowers methodology, session-tracking commands, a handful of hook scripts for safety/productivity, and several agent collections with subagents for research, Supabase, Vercel, and Next.js workflows. Note: Tiago already has 40+ skills installed — the focus here is on gaps and high-value additions.

---

## Already Installed (Tiago's `.claude/skills/`)

40 skills currently installed. Notable ones already covered:
- `defuddle`, `playwright-cli`, `yt-search`, `reddit-intel` — research stack
- `notebooklm`, `obsidian-cli`, `obsidian-markdown`, `obsidian-bases` — knowledge management
- `deploy-to-vercel`, `vercel-cli`, `vercel-composition-patterns`, `vercel-react-best-practices` — Vercel
- `supabase-postgres-best-practices` — database
- `next-best-practices`, `next-cache-components`, `next-upgrade` — Next.js
- `skill-creator`, `skill-detector`, `skill-guard` — meta skills
- `pptx`, `pdf`, `docx`, `xlsx` — document generation
- `reddit-intel-workspace`, `yt-search-workspace` — workspace variants

**Gaps identified:** n8n workflow building, session tracking, hooks (none installed), research agents, subagent orchestration.

---

## 1. Collections & Indexes

### hesreallyhim/awesome-claude-code
- URL: https://github.com/hesreallyhim/awesome-claude-code
- The canonical community index. Curated list of skills, hooks, slash-commands, agent orchestrators, applications, and plugins. 1000+ issues/PRs. Actively maintained daily.
- Also has: `hesreallyhim/a-list-of-claude-code-agents` (community-submitted subagents), `hesreallyhim/awesome-claude-code-output-styles-that-i-really-like`
- Start here for discovery. The repo also has `.claude/commands/` with working examples.

### rohitg00/awesome-claude-code-toolkit
- URL: https://github.com/rohitg00/awesome-claude-code-toolkit
- Most comprehensive single repo: 135 agents, 35 curated skills (+400,000 via SkillKit), 42 commands, 150+ plugins, 19 hooks, 15 rules, 7 templates, 8 MCP configs
- Auto-configures hooks, MCPs, and skills by scanning 95+ project types
- Install: clone and run setup script; scans your project and selects from 28+ hooks automatically

### VoltAgent/awesome-agent-skills
- URL: https://github.com/VoltAgent/awesome-agent-skills
- 1000+ agent skills from official dev teams and community, cross-compatible: Claude Code, Codex, Gemini CLI, Cursor
- Useful for portability if working across tools

### travisvn/awesome-claude-skills
- URL: https://github.com/travisvn/awesome-claude-skills
- Curated list focused specifically on Claude Skills (not just hooks/commands)

### ComposioHQ/awesome-claude-skills
- URL: https://github.com/ComposioHQ/awesome-claude-skills
- Another curated skills list; maintained by Composio integration team

### davepoon/buildwithclaude
- URL: https://github.com/davepoon/buildwithclaude
- Single hub: 117 specialized AI agents, 175 slash commands, 28 event-driven hooks, 26 reusable skills; covers Claude Code, Claude Desktop, Agent SDK, OpenClaw
- Good breadth reference

### zebbern/claude-code-guide
- URL: https://github.com/zebbern/claude-code-guide
- Beginner to power user guide; covers skills setup, agents, commands with practical examples
- Good onboarding reference

---

## 2. Skills by Category

### n8n / Automation

**czlonkowski/n8n-skills** — TOP PRIORITY FOR TIAGO
- URL: https://github.com/czlonkowski/n8n-skills
- 7 skills that teach Claude how to build production-ready n8n workflows
- Skills: n8n Expression Syntax, n8n MCP Tools Expert, n8n Workflow Patterns, n8n Validation Expert, n8n Node Configuration, n8n Code JavaScript, n8n Code Python
- Pairs with `czlonkowski/n8n-mcp` MCP server (gives access to all 1,239 n8n nodes)
- Install: `git clone https://github.com/czlonkowski/n8n-skills.git` then copy `skills/*` to `~/.claude/skills/`
- Practical value: direct relevance — Tiago builds n8n automations daily; this would make Claude a competent n8n pair programmer
- Note: MCP component is optional; skills alone add value without the MCP

**theNetworkChuck/n8n-claude-code-guide**
- URL: https://github.com/theNetworkChuck/n8n-claude-code-guide
- Connect n8n to Claude Code via SSH for bidirectional automation
- Less relevant unless you want n8n triggering Claude Code sessions

### Software Development Methodology

**obra/superpowers** — HIGH VALUE
- URL: https://github.com/obra/superpowers
- Agentic skills framework with disciplined TDD methodology: brainstorm → spec → plan → implement → review
- 20+ skills including: systematic-debugging, test-driven-development, requesting-code-review, writing-skills
- Three main commands: `/superpowers:brainstorm`, `/superpowers:write-plan`, `/superpowers:execute-plan`
- Officially accepted into Anthropic Claude Code plugin marketplace (Jan 15, 2026)
- Also: `obra/superpowers-lab` (experimental), `obra/superpowers-skills` (community-editable), `obra/superpowers-marketplace`
- Install: registered as a Claude Code Plugin; run `/plugins add superpowers` or clone manually
- Practical value: disciplines Claude on larger-scoped tasks — less random jumping to code, more structured delivery

**obra/superpowers-skills (community)**
- URL: https://github.com/obra/superpowers-skills
- Community-contributed skills for the superpowers framework; growing library

### Research & Analysis

**VoltAgent/awesome-claude-code-subagents — research-analyst agent**
- URL: https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/10-research-analysis/research-analyst.md
- Specialized subagent for research and analysis tasks
- Part of a 100+ subagent collection organized in 10 categories

**anthropics/skills (official)**
- URL: https://github.com/anthropics/skills
- Official Anthropic skills repo; includes skill-creator (already installed), continuous-learning, and domain skills
- Also: `anthropics/claude-plugins-official` — official plugin collection

### Coding Quality & Review

**levnikolaevich/claude-code-skills**
- URL: https://github.com/levnikolaevich/claude-code-skills
- Agile pipeline with multi-model AI review, project bootstrap, documentation generation, codebase audits, performance optimization
- Includes 3 custom MCP servers: hex-line (hash-verified editing), hex-graph (code knowledge graph), hex-ssh (remote SSH)
- Install: clone and follow README; MCP servers require separate setup

**citriac/claude-skills**
- URL: https://github.com/citriac/claude-skills
- System automation, content distribution, cloud ops, SEO, data analysis skills

### Session & Project Tracking

**iannuttall/claude-sessions** — HIGH VALUE
- URL: https://github.com/iannuttall/claude-sessions
- Custom slash commands for session tracking: `session-start`, `session-update`, `session-end`, `session-current`, `session-list`
- Stores sessions in `sessions/[YYYY-MM-DD-HHMM-name].md` format; tracks `.current-session`
- Install: copy `commands/` and `sessions/` folders to project root
- Practical value: solves context continuity across sessions — especially useful for long-running projects like PrintPal and Smoothie Machine

### Configuration / Project Bootstrap

**erik-opg/claude-setup**
- URL: https://github.com/erik-opg/claude-setup
- Token-optimized Claude Code configuration with agents, skills, commands, and plan-based continuity
- Focus on reducing token waste while maintaining structured workflows

**alirezarezvani/claude-code-skill-factory**
- URL: https://github.com/alirezarezvani/claude-code-skill-factory
- Open-source toolkit for building and deploying production-ready Claude Skills, agents, slash commands at scale
- Generates structured skill templates, automates workflow integration
- Also: `alirezarezvani/claude-skills` (192+ skills for Claude Code, Codex, Gemini CLI, Cursor, and 8 more agents)

### Output Styles

**hesreallyhim/awesome-claude-code-output-styles-that-i-really-like**
- URL: https://github.com/hesreallyhim/awesome-claude-code-output-styles-that-i-really-like
- Collection of output style configs that change how Claude formats responses
- Practical value: useful for consistent external-facing content (reports, pitches)

### Subagent Collections

**VoltAgent/awesome-claude-code-subagents**
- URL: https://github.com/VoltAgent/awesome-claude-code-subagents
- 100+ subagents across 10 categories:
  - 01-core-development (backend, frontend, fullstack, mobile)
  - 02-language-specialists (TypeScript, Python)
  - 03-infrastructure (DevOps, cloud, Kubernetes)
  - 04-quality-security (testing, security auditing)
  - 05-data-ai (ML, data engineering)
  - 06-developer-experience (tooling, docs)
  - 07-specialized-domains (blockchain, IoT, fintech)
  - 08-business-product (PM, business analysis)
  - 09-meta-orchestration (multi-agent coordination, agent-installer)
  - 10-research-analysis
- Install: copy individual `.md` files to `.claude/agents/`

**userFRM/agent-dispatch** — CLEVER PATTERN
- URL: https://github.com/userFRM/agent-dispatch
- Lightweight skill: compact keyword index (2k tokens) that routes tasks to specialized subagents on demand
- Downloads agents as needed mid-session instead of pre-loading 130+ agents
- Practical value: solves agent bloat; discover and invoke without polluting context

**wshobson/agents**
- URL: https://github.com/wshobson/agents
- Intelligent automation and multi-agent orchestration for Claude Code; 112 specialized agents + 16 orchestrators

---

## 3. Slash Commands

### wshobson/commands
- URL: https://github.com/wshobson/commands
- 57 production-ready slash commands: 15 workflows + 42 tools
- Workflows: feature-development, oauth2-auth, api-first-development, intelligent-issue-resolution, performance-optimization, security-assessment, compliance-verification, security-hardening
- Invoked: `/workflows:feature-development`, `/tools:security-scan`
- Install: copy `commands/` to `.claude/commands/`

### qdhenry/Claude-Command-Suite
- URL: https://github.com/qdhenry/Claude-Command-Suite
- 216+ slash commands, 12 skills, 54 agents; covers code review, testing, deployment, media processing, GitHub-Linear sync

### artemgetmann/claude-slash-commands
- URL: https://github.com/artemgetmann/claude-slash-commands
- Small, curated collection; copy to `~/.claude/commands/`

### iannuttall/claude-sessions (see above)
- Session management commands — most immediately useful

### cassler/awesome-claude-code-setup
- URL: https://github.com/cassler/awesome-claude-code-setup
- 19 slash commands, 17 shell tools, NLP analysis; claims 50-80% token savings via optimized prompting

---

## 4. Hook Scripts

### Hook Event Types Reference (as of v2.1.x, March 2026)
All hooks live in `.claude/hooks/` as scripts (Python preferred, shell works).

**Blocking hooks** (can approve/deny Claude actions):
- `PreToolUse` — fires before any tool; block dangerous commands
- `PostToolUse` — fires after tool; auto-format, log
- `PostToolUseFailure` — fires on tool error
- `Stop` / `SubagentStop` — fires when Claude/subagent finishes
- `UserPromptSubmit` — intercept/validate user prompts
- `TaskCompleted` — when a task completes

**Command hooks** (run scripts, no blocking):
- `SessionStart` / `SessionEnd` — setup/teardown
- `SubagentStart` — when subagent spawns
- `Notification` — Claude sends a notification
- `PostCompact` / `PreCompact` — around context compaction (new in v2.1.x)
- `Elicitation` / `ElicitationResult` — intercept responses
- `InstructionsLoaded` / `ConfigChange` — on config changes

### disler/claude-code-hooks-mastery — BEST REFERENCE
- URL: https://github.com/disler/claude-code-hooks-mastery
- All hook events implemented as standalone UV Python scripts
- Full list: notification, permission_request, post_tool_use, post_tool_use_failure, pre_compact, pre_tool_use, session_end, session_start, setup, stop, subagent_start, subagent_stop, user_prompt_submit
- Features: TTS audio feedback, dangerous-command blocking, prompt injection scanning, builder/validator agent pattern, JSON event logging
- Type: CLI (copy `.claude/hooks/` contents to your own project)
- Practical value: reference implementation — copy the hooks you want, tweak constants

### karanb192/claude-code-hooks
- URL: https://github.com/karanb192/claude-code-hooks
- Simpler collection focused on: file protection (block edits to .env, package-lock.json, .git/), dangerous command blocking, auto-format TypeScript via Prettier post-edit
- Configurable `SAFETY_LEVEL` constant in each hook
- Install: clone into `.claude/hooks/`

### decider/claude-hooks
- URL: https://github.com/decider/claude-hooks
- Enforce clean code practices and automate workflows; validation hooks, quality checks, notifications

### disler/claude-code-hooks-multi-agent-observability
- URL: https://github.com/disler/claude-code-hooks-multi-agent-observability
- Real-time monitoring dashboard for multi-agent Claude Code sessions via hook event tracking
- Practical value: useful once running multiple subagents on PrintPal or other complex tasks

### johnlindquist/claude-hooks
- URL: https://github.com/johnlindquist/claude-hooks
- TypeScript-powered hook system — write hooks with full type safety and auto-completion
- Practical value: better for TS-native projects; overkill for simple Python hooks

### NulightJens hooks gist (3 hooks)
- URL: https://gist.github.com/NulightJens/6d7315edcc07e03ff055c3b9b3a47224
- Three drop-in hooks: bash command safety net, audio alert on focus-needed, auto-research loop trigger
- Practical value: focus alert hook alone is useful for long async sessions

---

## 5. Notable Other Tools

### Parry (prompt injection scanner)
- Part of hesreallyhim/awesome-claude-code collection, by Dmytro Onypko
- Hook that scans tool inputs and outputs for injection attacks, secrets, and data exfiltration
- Practical value: security hardening for any project handling user-supplied content

### Claude Scientific Skills (K-Dense)
- Listed in hesreallyhim/awesome-claude-code
- Skills for research, science, engineering, analysis, finance, writing
- Potentially useful as research agent supplements

### AgentSys (in hesreallyhim collection)
- Workflow automation system: automates task-to-production workflows, PR management, code cleanup, performance investigation, drift detection, multi-agent code review
- Practical value: advanced — useful when PrintPal codebase grows

### Claude Code PM (Ran Aroussi, in hesreallyhim collection)
- Comprehensive project management workflow with specialized agents, slash commands, strong docs
- Practical value: overkill for solo freelancer; worth revisiting if team grows

---

## 6. Recommended Additions for Tiago

Priority order based on relevance to active projects:

| # | Tool | Type | Why | URL |
|---|---|---|---|---|
| 1 | czlonkowski/n8n-skills | Skills (7) | Tiago builds n8n daily; makes Claude a proper n8n pair programmer | https://github.com/czlonkowski/n8n-skills |
| 2 | obra/superpowers | Skills framework | Disciplines Claude on larger tasks; spec-first methodology | https://github.com/obra/superpowers |
| 3 | iannuttall/claude-sessions | Slash commands | Session continuity across PrintPal, Smoothie, n8n sessions | https://github.com/iannuttall/claude-sessions |
| 4 | disler/claude-code-hooks-mastery | Hook scripts | Reference + copy: dangerous-command blocker, session logger | https://github.com/disler/claude-code-hooks-mastery |
| 5 | karanb192/claude-code-hooks | Hook scripts | .env protection, file guard hooks — quick safety wins | https://github.com/karanb192/claude-code-hooks |
| 6 | VoltAgent/awesome-claude-code-subagents | Subagents | Research-analyst, PM, backend, frontend agents for delegation | https://github.com/VoltAgent/awesome-claude-code-subagents |
| 7 | userFRM/agent-dispatch | Skill | Route to 130+ agents on demand without preloading them all | https://github.com/userFRM/agent-dispatch |
| 8 | wshobson/commands | Slash commands (57) | feature-development, security-scan, performance-optimization | https://github.com/wshobson/commands |
| 9 | hesreallyhim/awesome-claude-code | Index | Bookmark; weekly check for new skills/hooks | https://github.com/hesreallyhim/awesome-claude-code |
| 10 | rohitg00/awesome-claude-code-toolkit | Toolkit | Auto-hook setup for new projects; 135 agents available | https://github.com/rohitg00/awesome-claude-code-toolkit |

---

## Sources

- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit)
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [obra/superpowers](https://github.com/obra/superpowers)
- [obra/superpowers-lab](https://github.com/obra/superpowers-lab)
- [obra/superpowers-skills](https://github.com/obra/superpowers-skills)
- [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)
- [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
- [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability)
- [karanb192/claude-code-hooks](https://github.com/karanb192/claude-code-hooks)
- [decider/claude-hooks](https://github.com/decider/claude-hooks)
- [johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks)
- [iannuttall/claude-sessions](https://github.com/iannuttall/claude-sessions)
- [wshobson/commands](https://github.com/wshobson/commands)
- [wshobson/agents](https://github.com/wshobson/agents)
- [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite)
- [userFRM/agent-dispatch](https://github.com/userFRM/agent-dispatch)
- [anthropics/skills](https://github.com/anthropics/skills)
- [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)
- [alirezarezvani/claude-code-skill-factory](https://github.com/alirezarezvani/claude-code-skill-factory)
- [levnikolaevich/claude-code-skills](https://github.com/levnikolaevich/claude-code-skills)
- [citriac/claude-skills](https://github.com/citriac/claude-skills)
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- [cassler/awesome-claude-code-setup](https://github.com/cassler/awesome-claude-code-setup)
- [davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude)
- [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)
- [erik-opg/claude-setup](https://github.com/erik-opg/claude-setup)

## Gaps / Caveats

- Could not read GitHub READMEs via defuddle (returned empty); relied on search summaries and secondary sources. Actual skill file counts and exact install commands should be verified from the repos directly before installing.
- SkillKit (400,000 skills) referenced in rohitg00 toolkit — nature/quality of that volume is unverified; likely AI-generated bulk.
- Hook compatibility: some repos may target older Claude Code versions; verify hook event names against current docs at code.claude.com/docs/en/hooks before use.
- `czlonkowski/n8n-skills` specifies "Claude Pro plan required for Skills access" — verify whether this still applies or if it's a local install pattern.
