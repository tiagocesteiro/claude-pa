---
name: doc-coauthoring
description: Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structured content. This workflow helps users efficiently transfer context, refine content through iteration, and verify the doc works for readers. Trigger when user mentions writing docs, creating proposals, drafting specs, or similar documentation tasks.
---

# Doc Co-Authoring Workflow

Collaborative document creation through three structured stages.

## Stage 1: Context Gathering

User provides background; Claude asks clarifying questions to close knowledge gaps. Users can info-dump stream-of-consciousness, link documents, or point to team channels.

## Stage 2: Refinement & Structure

Build the document section-by-section:
1. Brainstorm 5-20 options per section
2. User curates preferred direction
3. Check for gaps
4. Draft section
5. Iterative refinement via surgical edits (not full rewrites)

During refinement, users provide feedback without directly editing ("Remove X bullet - duplicates Y") — this helps Claude learn their stylistic preferences for subsequent sections.

Use artifacts when available to scaffold document structure with placeholders.

## Stage 3: Reader Testing

A fresh Claude instance (without prior conversation context) tests the document by answering predicted reader questions — surfacing blind spots before others encounter them.

## Final Step

User performs their own review to verify facts and confirm the document achieves intended impact.

## Rules

- Prioritize quality over speed
- Never rush stages
- User can adjust or skip the structured process at any time
