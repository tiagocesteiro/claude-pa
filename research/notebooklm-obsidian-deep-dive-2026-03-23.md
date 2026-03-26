---
title: NotebookLM + Obsidian — Power Tools for a Solo Founder AI Assistant
date: 2026-03-23
tags: [research, tools, workflow, notebooklm, obsidian, ai-assistant]
status: complete
---

# NotebookLM + Obsidian — Power Tools for an AI Assistant Workflow

> Research for: Tiago's executive assistant setup at `d:/Claude - PA/`
> Goal: Identify concrete improvements to leverage both tools more effectively.

---

## 1. NotebookLM — What It Actually Does Well

### Best Use Cases (ranked by relevance to a solo founder)

| Use Case | Why it works | Output format to use |
|---|---|---|
| **Competitive research synthesis** | Load 10+ competitor URLs, research reports, news — ask cross-cutting questions | Briefing doc + Data table |
| **Decision support** | Feed in all research for a specific decision (e.g., machine supplier choice) | Report (briefing-doc format) |
| **Supplier/market landscape** | Dump multiple scraped pages, pricing PDFs, Reddit threads | Data table (CSV export) |
| **Learning dense material fast** | Upload docs you need to understand quickly | Audio podcast (deep-dive format) |
| **Business plan stress-testing** | Upload your own docs + competitor research, ask "what am I missing?" | Chat + save as note |
| **Weekly review synthesis** | Feed decision log, current priorities, recent research — ask for gaps | Report or chat |

### Source Structuring for Best Results

- **One notebook per project** — not one mega-notebook. Keeps AI answers grounded and relevant.
- **Mix source types** — combine your own markdown notes (business plan, unit economics) with external URLs (competitors, regulations). The AI cross-references them.
- **Pre-clean sources** — NotebookLM ingests Markdown natively. Export clean Obsidian notes (not raw vault files with broken wikilinks) for best indexing.
- **Add context as a source** — create a short `context.md` file explaining what the project is, who you are, and what questions matter. Upload it as the first source. This primes the AI.
- **Batch by theme** — don't mix smoothie research with 3D printing research in one notebook. Separate notebooks = sharper answers.

### Output Types — What to Use When

| Output | Best for | Time to generate |
|---|---|---|
| **Briefing doc** | Pre-meeting prep, investor one-pager synthesis | 5-15 min |
| **Study guide** | Getting up to speed on a new domain (e.g., food safety regs) | 5-15 min |
| **Audio podcast (deep-dive)** | Absorbing a large research dump while doing other things | 10-20 min |
| **Data table** | Extracting structured data (pricing, specs, regulations) from multiple docs | 5-15 min |
| **Mind map** | Instant — seeing concept relationships across sources | Instant |
| **Quiz** | Testing your own understanding of a domain | 5-15 min |
| **Chat + save-as-note** | Open-ended analysis, "what am I missing?", strategic Q&A | Instant |

### Technical Limits (current as of 2025-2026)

- **Source limits by plan**: Free: ~50 sources/notebook | Plus: 100 | Pro: 300 | Ultra: 600
- **Supported input types**: PDF, Markdown (.md), Word, text, Google Docs, YouTube URLs, web URLs, audio, video, images
- **Rate limiting**: Audio, video, quiz, flashcard, infographic generation can fail under rate limits. Reliable: reports, mind maps, data tables, chat.
- **Deep research mode**: Can autonomously find and import 20-50 web sources on a topic — very useful for initial competitive landscape mapping.
- **CLI has features the web UI lacks**: batch downloads, PPTX export, quiz/flashcard JSON export, slide revision by prompt, programmatic source management.

### Proven "Insane Workflow" (from user reports)
**Perplexity → NotebookLM pipeline:**
1. Use Perplexity to find sources and surface key data points.
2. Feed those sources + the Perplexity output into a NotebookLM notebook.
3. Use NotebookLM to synthesize, cross-reference, and generate structured outputs.
4. Export report or data table back to Obsidian.

This is already how the research subagent is partially structured — formalizing it further would compound the value.

---

## 2. Obsidian — Business OS Best Practices

### Folder Structure — PARA Method (most validated approach)

```
vault/
├── Projects/        # Active work with a deadline or goal
├── Areas/           # Ongoing responsibilities (freelance, health, finances)
├── Resources/       # Reference material by topic
├── Archives/        # Inactive projects, completed work
```

**Applied to this vault:**
```
d:/Claude - PA/
├── projects/        ← already correct (3d-printing, smoothie, clean-maintain)
├── context/         ← maps to "Areas" (ongoing: me, work, team)
├── research/        ← maps to "Resources" (reference by topic)
├── decisions/       ← decision log (currently flat file, could be notes)
├── archives/        ← already exists
├── templates/       ← correct
└── references/      ← correct
```

The existing structure is already close to PARA. Key gap: no "Dashboard" or hub note that ties it together.

### Most Powerful Features for a Solo Founder

#### Dataview (highest ROI plugin for business use)
Query your vault like a database. Examples directly applicable:

```dataview
TABLE status, date FROM "projects" SORT date DESC
```
```dataview
TASK WHERE !completed AND file.folder = "projects" SORT file.name ASC
```
```dataview
TABLE tags FROM "research" WHERE contains(tags, "smoothie") SORT file.ctime DESC
```

Dataview requires consistent frontmatter (YAML) in notes. This is the main reason to add frontmatter to all research reports — so they're queryable.

#### Bases (new native feature, 2025)
Obsidian's built-in database view (no plugin needed in newer versions). Create filtered, sortable tables from notes with matching properties. More stable than Dataview for simple use cases. Best for:
- Project status board
- Research index by topic/date
- Decision log as a table

#### Canvas
Visual thinking tool. Best uses:
- Business model diagram (linked to actual notes)
- Competitive landscape map
- Decision tree for "which idea to commit to"
- Mind map for a project phase

#### Templates + Templater plugin
Auto-generate consistent note structure. High-value templates to build:
- `research-report.md` — with frontmatter: title, date, tags, status, project
- `decision.md` — structured decision log entry
- `project-update.md` — weekly project status snapshot

#### Daily Notes (optional but useful for a solo founder)
- Morning: what are the 3 things that move the needle today?
- Evening: what actually got done, what's blocked?
- Links to relevant project notes automatically

#### Graph View
Best used for discovering unexpected connections between ideas. Not a daily tool — more useful when stuck or doing a quarterly review.

### Business Planning Patterns from Reddit/Community

- **Central "Hub" note per project** — one note that links to everything: status, README, research index, decisions, financials. Acts as the command center.
- **Kanban plugin** for client/deal pipeline (if needed for venues, suppliers)
- **Frontmatter-first discipline** — every note gets `tags`, `date`, `status`, `project` in YAML. This makes Dataview and Bases powerful.
- **Consistent tagging taxonomy** — e.g., `#research`, `#decision`, `#supplier`, `#competitor`, `#regulation` across all notes
- **Obsidian Git plugin** — already in use (vault is a git repo). Provides version history and backup.

---

## 3. NotebookLM + Obsidian Integration

### The Core Integration Loop

```
Research phase (Claude Code subagent)
  → Perplexity searches → save to research/*.md (Obsidian)

Synthesis phase (NotebookLM)
  → Upload research/*.md files as sources
  → Ask cross-cutting questions
  → Generate briefing doc / data table
  → Download output as .md

Storage phase (Obsidian)
  → Save NotebookLM output back to research/ or projects/
  → Link from project hub note
  → Queryable via Dataview
```

### Practical Integration Options

**Option A — Manual (works now, no setup)**
- Export relevant Obsidian notes (already .md files) → drag into NotebookLM as sources
- Download NotebookLM outputs → save back to `research/` folder

**Option B — Google Drive Sync**
- Install Google Drive desktop app → sync `d:/Claude - PA/` folder to Drive
- In NotebookLM: add sources directly from Google Drive without manual uploads
- Enables faster iteration without exporting

**Option C — CLI-Automated (already have the skill)**
```bash
# Create a project notebook and feed all research for that project
notebooklm create "3D Printing Marketplace — Research Synthesis"
notebooklm source add "d:/Claude - PA/research/3d-printing-*.md"
notebooklm source add "d:/Claude - PA/projects/3d-printing-marketplace/README.md"
notebooklm ask "What are the biggest risks and gaps in this business plan?"
notebooklm generate report --format briefing-doc
notebooklm download report "d:/Claude - PA/research/3d-printing-synthesis-$(date +%Y-%m-%d).md"
```

**Option D — Research Pipeline Integration**
After every research session (like this one), automatically:
1. Save report to `research/` (already doing this)
2. Trigger NotebookLM update for the relevant project notebook (could be automated with n8n)

---

## 4. Concrete Improvements for This Specific Setup

### High Impact, Low Effort

**1. Add frontmatter to all research reports (start now)**
Currently research files have no YAML frontmatter. Adding it makes them queryable:
```yaml
---
title: NotebookLM + Obsidian Deep Dive
date: 2026-03-23
tags: [research, tools, workflow]
project: meta
status: complete
---
```
Impact: enables Dataview/Bases dashboards, better NotebookLM indexing.

**2. Create one Hub note per active project**
`projects/3d-printing-marketplace/HUB.md` — links to README, all relevant research files, key decisions, active tasks. Used as the starting point for any NotebookLM notebook on that project.

**3. Create two standing NotebookLM notebooks (one per project)**
- "PrintPal — 3D Printing Marketplace" — add all research reports + project README
- "Smoothie Machine" — same

Re-add sources as new research is produced. Use `notebooklm ask` for strategic Q&A against the full knowledge base.

**4. Use `notebooklm ask --save-as-note` for strategic synthesis**
After loading a project notebook, run:
```bash
notebooklm ask "What are the 3 biggest open questions before I can validate this business?" --save-as-note --note-title "Open Questions — 2026-03-23"
```
Download and save to Obsidian. Better than just reading research — it forces synthesis.

### Medium Impact, Some Setup

**5. Research report template**
Create `templates/research-report.md` with consistent frontmatter. The research subagent uses it for every new report. This makes the entire `research/` folder queryable and feeds NotebookLM better.

**6. Dataview dashboard note**
Create `Dashboard.md` at the vault root:
```dataview
TABLE status, date, project FROM "research" SORT date DESC LIMIT 10
```
```dataview
TABLE status FROM "projects" SORT file.mtime DESC
```
One note that surfaces everything active at a glance.

**7. NotebookLM for competitor intelligence (specific use case)**
Load all competitor research reports into one notebook. Use deep research mode to pull in any new competitor URLs. Ask:
- "What features do all these competitors have that I don't?"
- "What's the weakest part of each competitor's offering?"
- "What market segments are underserved?"

This is more powerful than reading individual research reports.

### Lower Priority

**8. Canvas for business model visualization**
Create a Canvas file per project showing the business model, with nodes linked to actual notes. Good for quarterly review.

**9. Google Drive sync for frictionless NotebookLM uploads**
If the manual upload friction becomes a bottleneck, sync the vault to Drive and load sources directly. Not urgent yet.

**10. n8n webhook for automated research → NotebookLM pipeline**
When a new research report is saved to `research/`, automatically add it to the relevant NotebookLM notebook. Overkill for now, but a natural evolution.

---

## 5. What Should Change in the AI Assistant Workflow

### Immediate changes

1. **Frontmatter on all research reports** — standardize going forward. Template the subagent to include it.
2. **Project Hub notes** — create for both active projects. Link everything there.
3. **NotebookLM notebooks per project** — create now, seed with existing research. Use for strategic Q&A, not just reading.
4. **`--save-as-note` pattern** — when doing strategic analysis in NotebookLM, always save the chat output and import back to Obsidian.

### Workflow upgrade (Perplexity → NotebookLM → Obsidian loop)
```
1. Research subagent runs Perplexity searches
2. Saves report to research/ (Obsidian)
3. (When needed) Feeds report into project NotebookLM notebook
4. Asks strategic synthesis questions
5. Downloads briefing doc / key findings
6. Saves back to research/ with "synthesis" tag
7. Links from project Hub note
```

### What NotebookLM is better at than Claude Code subagent
- Cross-referencing 20+ documents simultaneously
- Generating podcast/audio from research (passive consumption)
- Producing structured outputs (briefing docs, data tables, mind maps) from large source sets
- Deep web research mode (autonomous source discovery)

### What the Claude Code subagent is better at
- Live web search with real-time data
- File system operations (read/write/organize the vault)
- Code execution, tool chaining
- Running specific CLI tools (Perplexity, yt-search, playwright)
- Saving and organizing outputs

The two tools are complementary, not redundant.

---

## Sources

- NotebookLM skill documentation: `.claude/skills/notebooklm/SKILL.md`
- Obsidian PARA method: https://digital-garden.ontheagilepath.net/getting-started-with-your-second-brain
- NotebookLM research workflows: https://effortlessacademic.com/googles-notebooklm-updates-in-2025-for-literature-review-and-study/
- Perplexity + NotebookLM hybrid workflow: https://www.youtube.com/watch?v=9gISKHTF0co
- Obsidian + NotebookLM integration guide: https://wanderloots.xyz/digital-garden/tutorials/how-i-use-notebook-lm-with-obsidian-practical-note-taking-ai/
- XDA Developers — Obsidian + NotebookLM pairing: https://www.xda-developers.com/obsidian-perfect-app-to-pair-with-notebooklm/
- NotebookLM web research features: https://case.edu/utech/about/utech-news/google-notebooklm-receives-major-updates
- Obsidian PKM implementation: https://joeir.substack.com/p/finding-my-flow-with-obsidian-as

---

## Gaps / Caveats

- NotebookLM source limits vary by plan — current plan tier not checked. Run `notebooklm list` to verify active notebooks.
- Google Drive sync approach (Option B) requires Drive desktop app — not tested in this setup.
- Dataview queries in this report are illustrative — exact syntax may need adjustment based on actual frontmatter field names used.
- NotebookLM audio/video generation is rate-limited and unreliable. Don't build workflows that depend on it being available on-demand.
- Reddit search results from Perplexity for Obsidian were synthesized from community patterns, not direct thread links (Perplexity did not return specific Reddit URLs for that query).
