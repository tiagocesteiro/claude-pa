---
name: internal-comms
description: A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).
license: Complete terms in LICENSE.txt
---

# Internal Communications Skill

Write internal communications using company-preferred formats.

## Communication Types Supported

- **3P updates** (Progress, Plans, Problems)
- Company newsletters
- FAQ responses
- Status reports
- Leadership updates
- Project updates
- Incident reports

## Process

1. Identify what kind of communication is needed
2. Load the matching guideline from the examples directory
3. Follow the specific formatting and tone instructions

## Available Templates

- `examples/3p-updates.md` — team progress/plans/problems updates
- `examples/company-newsletter.md` — organization-wide newsletters
- `examples/faq-answers.md` — FAQ responses
- `examples/general-comms.md` — fallback for other communication types

If the communication type doesn't match existing guidelines, ask for clarification on the desired format.
