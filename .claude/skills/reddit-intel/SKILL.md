---
name: reddit-intel
description: >
  Mine Reddit for community opinions, market insights, pain points, and trends on any topic.
  Use this skill whenever the user wants to know what people think about something, wants to
  research a topic using Reddit as a source, or asks to "search Reddit", "find Reddit discussions",
  "what does Reddit say about X", "mine Reddit for opinions", "gather community feedback",
  "find pain points around X", "research X on Reddit", or "what are people saying about X".
  Also use this when the user is doing market research, validating a business idea, checking
  competitor sentiment, or wants raw unfiltered opinions from real people — not a web summary.
  Produces a structured intelligence report saved as a markdown file.
---

# Reddit Intel

Mine Reddit discussions via Perplexity search (which indexes Reddit deeply).
Runs 4 targeted searches, extracts community signal, and saves a structured report.

Uses a bundled script — no API key setup needed beyond what's already in your env.

---

## Workflow

### Step 1 — Parse the Request

Extract:
- **Topic/query** — what to research (e.g. "3D printing marketplace", "n8n vs Zapier")
- **Subreddit** — if the user mentioned a specific community (add it to queries)
- **Time scope** — default to past year

If ambiguous, ask one focused question before proceeding.

---

### Step 2 — Run 4 Perplexity Searches

Use Bash to run the bundled script 4 times in sequence. The script path is:
`d:/Claude - PA/.claude/skills/reddit-intel/scripts/perplexity_search.py`

Run these 4 queries (replace TOPIC with the actual topic):

```bash
python "d:/Claude - PA/.claude/skills/reddit-intel/scripts/perplexity_search.py" \
  "reddit TOPIC community opinions experiences 2024 2025"

python "d:/Claude - PA/.claude/skills/reddit-intel/scripts/perplexity_search.py" \
  "reddit TOPIC problems complaints pain points frustrated"

python "d:/Claude - PA/.claude/skills/reddit-intel/scripts/perplexity_search.py" \
  "reddit TOPIC recommendations worth it review experience"

python "d:/Claude - PA/.claude/skills/reddit-intel/scripts/perplexity_search.py" \
  "reddit TOPIC vs alternative compared switched"
```

Each call returns JSON: `{"text": "...", "citations": [...]}`.
Collect all 4 results.

---

### Step 3 — Analyze for Signal

Read all 4 responses. Extract **signal**, not summaries:

**What counts as signal:**
- A pain point mentioned across multiple responses (frustration, gap, failure)
- A strong opinion with apparent community agreement
- A recurring question that reveals unmet needs
- A specific product/service mentioned positively or negatively with reasons
- A surprising insight that challenges assumptions

**What to skip:**
- Single one-off opinions with no corroboration
- Off-topic tangents

Group similar points. Three people saying the same thing = one insight, not three bullets.

---

### Step 4 — Write the Report

Save to the **current working directory** as:
`reddit-intel-{slug}-{date}.md`

Where `{slug}` = topic with spaces as hyphens (lowercase), `{date}` = YYYY-MM-DD.

```markdown
## Reddit Intelligence: "{topic}"

**Date:** YYYY-MM-DD | **Searches:** 4 | **Source:** Reddit via Perplexity

---

### Pain Points
- [insight] *(seen across multiple discussions)*

### Common Opinions
- [opinion]

### Recurring Questions
- "[question]"

### Product & Competitor Mentions
- **[Name]** — [sentiment and why]

### Notable Quotes
> "[verbatim quote from a Reddit user]" — r/subreddit

### Active Communities
- r/subreddit — [what they discuss here]

---

*Source: Reddit discussions via Perplexity | {date}*
```

Fill every section. If genuinely empty, write `— None identified.`

---

### Step 5 — Respond to User

1. State where the report was saved
2. Give a **3–5 bullet inline summary** of the most important findings
3. Note the main subreddits where this topic is active

---

## Tips

Specific queries work better:
- Good: `"local 3d printing service"`, `"smoothie vending machine business"`
- Weak: `"3d printing"`, `"vending"`

For niche topics, add the subreddit: `"r/3Dprinting local marketplace"`

For very recent sentiment, add: `"2025 reddit"`
