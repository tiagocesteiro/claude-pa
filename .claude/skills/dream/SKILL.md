---
name: dream
description: Memory consolidation for Tiago's persistent memory system. Run this skill whenever the user says "dream", "consolidate memory", "clean up memory", "memory consolidation", or asks to organize/prune/update the memory files. Also run proactively at the end of long or productive sessions to capture new learnings before context is lost.
---

# Dream — Memory Consolidation

A reflective pass to synthesize recent learnings into organized, persistent memory files. Run this at the end of productive sessions, or whenever memory files feel stale or bloated.

## Memory System

- **Directory**: `C:\Users\tiago\.claude\projects\d--Claude---PA\memory\`
- **Index**: `MEMORY.md` — lean pointer file only; keep under 25 lines
- **Memory files**: one topic per file, with YAML frontmatter

### File format

```markdown
---
name: Short name
description: One-line description (used to decide relevance in future conversations)
type: user | feedback | project | reference
---

Content here. For feedback/project types:
- Lead with the rule or fact
- **Why:** reason behind it
- **How to apply:** when this kicks in
```

### Memory types

| Type | What to save |
|------|-------------|
| `user` | Tiago's role, preferences, expertise, how to work with him |
| `feedback` | Corrections and confirmed approaches — things that should persist |
| `project` | Current status, goals, decisions for active projects |
| `reference` | Pointers to external systems, tools, or resources |

### What NOT to save

- Code patterns, file paths, architecture — derive from the codebase
- Git history / who changed what — `git log` is authoritative
- Debugging recipes — the fix is in the code
- Anything already in CLAUDE.md
- Ephemeral task details from the current session

## The Four Phases

### 1. Orient

Read the full memory system to understand what exists:
- Read `MEMORY.md` to see the current index
- Skim each linked memory file to understand scope and freshness

### 2. Gather Signal

Identify what needs attention:
- **New learnings from this session** — preferences revealed, corrections made, project decisions taken
- **Stale entries** — project statuses that have advanced, relative dates ("next Thursday") that should be absolute
- **Bloat** — MEMORY.md has content that belongs in a dedicated file
- **Gaps** — meaningful context from this session not yet captured
- **Duplicates** — same fact in two places

### 3. Consolidate

Write or update memory files:
- Update existing files rather than creating duplicates — check for overlap first
- Convert relative dates to absolute (e.g., "next sprint" → "2026-04-07")
- Remove facts that were contradicted in this session
- For project memories: update status, next steps, and any new decisions
- For feedback memories: lead with the rule, add Why + How to apply

### 4. Prune and Index

Keep `MEMORY.md` lean:
- One line per memory file: `- [filename.md](filename.md) — one-sentence description`
- Remove pointers to files that no longer exist
- Add pointers to newly created files
- Target: under 25 lines total

## Rules

- **Absolute dates**: always convert relative to absolute before saving
- **Verify before asserting**: a memory naming a file/function is a claim from a past moment — verify it still exists before acting on it
- **No duplication**: if the fact is already in CLAUDE.md or derivable from the code, don't save it
- **Update, don't append**: find the right existing file and update it rather than creating a new one for the same topic
