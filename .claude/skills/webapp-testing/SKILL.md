---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
license: Complete terms in LICENSE.txt
---

# Web Application Testing Toolkit

Test local web applications using Playwright.

## Key Components

- `scripts/with_server.py` — manages server lifecycle for single or multiple servers

## Decision Tree

1. Is the content static HTML? → Read directly
2. Is it dynamic (requires JS execution)? → Use server management

## Core Approach

**Always** wait for `page.wait_for_load_state('networkidle')` before inspection on dynamic apps.

## Automation Pattern

1. Navigate with proper waits
2. Capture screenshots or inspect DOM to identify selectors
3. Execute actions using discovered elements

```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

Supports multiple simultaneous servers for complex apps with separate backend and frontend.

## Best Practices

- Treat bundled scripts as complete solutions via their `--help` output
- Use `sync_playwright()` for synchronous operations
- Use descriptive selectors and appropriate waits
- Reference example files for common patterns (element discovery, console logging)
