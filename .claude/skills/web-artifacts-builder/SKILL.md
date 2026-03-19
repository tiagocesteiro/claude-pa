---
name: web-artifacts-builder
description: Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.
license: Complete terms in LICENSE.txt
---

# Web Artifacts Builder

Build powerful frontend claude.ai artifacts.

**Stack**: React 18 + TypeScript + Vite + Parcel + Tailwind CSS + shadcn/ui

## Workflow

1. Initialize: `bash scripts/init-artifact.sh <project-name>`
2. Develop by editing generated files
3. Bundle: `bash scripts/bundle-artifact.sh` → produces `bundle.html`
4. Share `bundle.html` with user as artifact
5. (Optional) Test with Playwright or Puppeteer

## Step 1: Initialize

```bash
bash scripts/init-artifact.sh <project-name>
cd <project-name>
```

Creates a fully configured project with React + TypeScript, Tailwind CSS 3.4.1, shadcn/ui theming, path aliases (`@/`), 40+ shadcn/ui components, all Radix UI dependencies, and Parcel config.

## Step 3: Bundle

```bash
bash scripts/bundle-artifact.sh
```

Produces `bundle.html` — self-contained artifact with all JS, CSS, and dependencies inlined.

Requirements: `index.html` must exist in project root.

## Design & Style

**Avoid "AI slop"**: No excessive centered layouts, purple gradients, uniform rounded corners, or Inter font.

Choose intentional, distinctive aesthetic directions.

## References

- shadcn/ui components: https://ui.shadcn.com/docs/components
