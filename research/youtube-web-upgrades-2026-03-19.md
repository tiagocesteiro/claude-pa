# YouTube Research: Web Design & Dev Upgrades for Claude Code
*Date: 2026-03-19 | Researcher: Claude Code agent*

---

## Summary — Top 5 Actionable Upgrades

1. **Figma MCP + Claude Code** — The highest-signal gap. Multiple high-engagement videos show Claude reading Figma designs directly via MCP server and generating pixel-accurate components. This is the fastest path to going from design intent to working code without redescribing layouts.
2. **Motion (Framer Motion v11+)** — Renamed library, now tighter React/Next.js integration. Scroll-triggered animations, layout transitions, and stagger effects are table stakes for premium-feeling UIs. Already works with Tailwind.
3. **GSAP + ScrollTrigger** — For landing pages specifically, GSAP produces the "Awwwards-level" scroll storytelling that Motion can't fully replicate. The JS Mastery 2-hour course has 1M+ views — clear signal this is the animation standard.
4. **AI Design System workflow (Claude + Figma)** — Build a token-based design system in Figma, then use Claude Code + Figma MCP to keep code in sync. Replaces ad-hoc styling decisions with a structured system.
5. **Three.js / Spline for hero sections** — 3D web elements (product renders, interactive heroes) are a 2026 trend with significant engagement. Spline is the low-friction entry point; Three.js/R3F for full control.

---

## Findings by Category

### Animation / Motion

| Tool | What it does | Why it matters | URL |
|------|-------------|----------------|-----|
| **GSAP + ScrollTrigger** | JavaScript animation engine with scroll-linked timeline control | Industry standard for scroll storytelling. 1M+ view course from JS Mastery. Works alongside React. | https://www.youtube.com/watch?v=AW1yfBKRMKc |
| **Motion (Framer Motion v11)** | React animation library — layout animations, scroll-linked, gestures | Native React/Next.js integration, easiest path to polished UI transitions. PedroTech 1hr course Dec 2025. | https://www.youtube.com/watch?v=9-fO_2xTpgY |
| **GSAP ScrollTrigger card flip** | Scroll-driven card flip animation | Good reference for product catalog interactions (relevant to PrintPal) | https://www.youtube.com/watch?v=_F1t2Ux-znk |
| **Micro-interactions (11 patterns)** | Button ripples, hover glows, state feedback | Kole Jain's video — 60K views, free Figma file. Highest signal-to-noise ratio on micro-UX. | https://www.youtube.com/watch?v=ld1zhQMXxXU |
| **Awwwards portfolio stack** | GSAP + Three.js + React combo | 169K views, small channel = extremely high engagement (25x ratio). Shows the winning stack. | https://www.youtube.com/watch?v=_BZZkFzuLQs |

**Notable course:** JS Mastery "Creative Frontend Course" — GSAP + Three.js + React, 9.75 hours, 179K views (Dec 2025). The definitive reference for the full creative stack.
https://www.youtube.com/watch?v=ATdaYQw0ptk

---

### AI Tools (Design-to-Code)

| Tool/Workflow | What it does | Why it matters | URL |
|---------------|-------------|----------------|-----|
| **Figma MCP Server** | Claude Code reads Figma file structure directly via MCP | Replaces manual design description. Claude sees component names, styles, and layout. Highest-engagement category. | https://www.youtube.com/watch?v=mBJNfze9H0I |
| **Figma → Claude Code pipeline** | Design in Figma → read via MCP → generate Next.js components | "Stop wasting dev time on frontend" — 47K views, 4.28x engagement ratio. Setup takes ~20 min. | https://www.youtube.com/watch?v=BOl05zmQjOg |
| **Claude + Figma design system** | Build design tokens in Figma, sync to code via Claude | 173K views, 15.6x engagement — highest ratio across all searches. The workflow is: tokens in Figma → AI-generated component stubs → code review. | https://www.youtube.com/watch?v=nafNPuElCtY |
| **Figma Code Connect + MCP** | Figma's native dev mode for linking components to real code | Official Figma channel. Bridges design system and component library without manual mapping. | https://www.youtube.com/watch?v=A4mqzgFbmjI |
| **Claude Code "steal designs"** | Use Claude to reverse-engineer and rebuild premium site designs | Practical workflow for rapid UI cloning and adaptation | https://www.youtube.com/watch?v=AaO6ujcx6TY |

---

### Design Systems & CSS

| Tool/Approach | What it does | Why it matters | URL |
|---------------|-------------|----------------|-----|
| **CSS style solutions breakdown** | Theo's comparison of CSS Modules, Tailwind, vanilla-extract, etc. | 113K views — clarifies when Tailwind is the right call vs. when to reach for something else. Tailwind 4 is covered. | https://www.youtube.com/watch?v=lIUp8bdKiq4 |
| **Figma Variables → Design Tokens** | Figma's variable system for color, spacing, typography scales | UI Collective full course (81K views). The foundation for any serious design system. Directly feeds the MCP workflow. | https://www.youtube.com/watch?v=L-tpK7Eeuow |
| **"Design Systems are a Waste of Time Now"** | Argues AI makes ad-hoc component generation faster than maintaining a system | Counter-perspective from Malewicz (66K views). Worth watching to calibrate when to invest in a system. | https://www.youtube.com/watch?v=6_t66Ef0Llk |

**2026 design trends** (recurring across multiple videos):
- Flat design is out; depth, texture, and layered shadow systems are in
- "Bento grid" layouts replacing traditional card grids
- Bold typography as a primary design element
- Dark mode by default, not as an afterthought
- Source: https://www.youtube.com/watch?v=bT1tG_E8g-4 and https://www.youtube.com/watch?v=waHuVF3XuMA

---

### 3D / Immersive

| Tool | What it does | Why it matters | URL |
|------|-------------|----------------|-----|
| **Three.js + React (R3F)** | 3D graphics in React via React Three Fiber | 1.07M views on JS Mastery 3D portfolio course. The clear standard for interactive 3D web. | https://www.youtube.com/watch?v=E-fdPfRxkzQ |
| **Spline** | No-code 3D design tool with React embed | Easier entry than Three.js. Good for hero animations and product showcases. Comparison vs Three.js vs Babylon available. | https://www.youtube.com/watch?v=rhY8NXgAesI |
| **freeCodeCamp Three.js + Blender** | Full pipeline: model in Blender, display in Three.js | 98K views. Relevant for 3D product showcases (e.g., showing 3D printed objects on PrintPal). | https://www.youtube.com/watch?v=yhtdkuw9mbM |

---

### Other Notable

- **"5 Ways To Build Beautiful Websites Using Claude Code"** (AI LABS, 76K views, Dec 2025) — Practical prompting patterns for better UI output from Claude Code. https://www.youtube.com/watch?v=VGYsHicpp34
- **Kole Jain "7 UI/UX mistakes"** (345K views, 7.47x engagement) — Highest engagement ratio in the micro-interaction search. Worth watching for what NOT to do. https://www.youtube.com/watch?v=AH_ugxmLeUM
- **"The Only 5 Web Design Skills That Matter (2026)"** (301K views, 4.48x) — Self-Made Web Designer. High engagement on a small channel = genuinely useful signal. https://www.youtube.com/watch?v=vbFn0C-pvis

---

## Gaps in Tiago's Current Stack

These appear repeatedly across results and are not covered by installed skills/tools:

1. **Figma MCP Server** — Not set up. Multiple high-engagement videos show this is becoming the standard workflow for Claude-assisted frontend. Setup is ~20 min; payoff is significant for any new page/component work.

2. **GSAP / ScrollTrigger** — No animation library beyond CSS. For landing pages (PrintPal homepage, smoothie pitch), scroll animations are the single biggest visual upgrade available. GSAP works alongside Tailwind and Next.js without friction.

3. **Motion (Framer Motion v11+)** — Not installed. The rebrand to "Motion" came with API improvements. For UI transitions within the app (modal opens, tab switches, list stagger), this is the standard React tool.

4. **Design Token System** — Emerald color + DM Sans font exist as ad-hoc values. No formal token layer. With Figma Variables + Figma MCP, this becomes the source of truth Claude can read directly.

5. **Spline or Three.js** — No 3D capability. Not urgent, but relevant for PrintPal's model previews and hero section differentiation.

---

## Recommended Next Skills to Build

Ranked by impact-to-effort ratio:

| Priority | Skill | What to build | Effort |
|----------|-------|---------------|--------|
| 1 | **figma-mcp** | MCP server config + workflow for Claude reading Figma files | Low (config + SKILL.md) |
| 2 | **gsap-animations** | GSAP + ScrollTrigger patterns for Next.js landing pages | Medium (code examples + prompts) |
| 3 | **motion-react** | Motion (Framer Motion) patterns for in-app transitions | Low-medium |
| 4 | **design-tokens** | Figma Variables setup + token-to-Tailwind mapping workflow | Medium |
| 5 | **spline-3d** | Spline embed patterns for hero sections in Next.js | Low |

**Immediate action**: Set up the Figma MCP server. It's the highest-leverage upgrade and directly improves every future frontend session with Claude Code.

---

## Sources

All data from YouTube search results (yt-search script, 2026-03-19). View counts and engagement ratios used as quality signals. Engagement ratio = views ÷ subscribers; values above 1.0x indicate high relative resonance.

Key channels to follow: JavaScript Mastery (1.23M subs, consistently high-quality), Kole Jain (46K, high engagement ratio), The Design Project (11K, 15x engagement on design system video), PedroTech (281K, React animation specialist).
