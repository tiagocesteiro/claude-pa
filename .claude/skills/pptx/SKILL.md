---
name: pptx
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions \"deck,\" \"slides,\" \"presentation,\" or references a .pptx filename, regardless of what they plan to do with the content afterward. If a .pptx file needs to be opened, created, or touched, use this skill."
license: Proprietary. LICENSE.txt has complete terms
---

# PPTX Skill

## Quick Reference

| Task | Guide |
|------|-------|
| Read/analyze content | `python -m markitdown presentation.pptx` |
| Edit or create from template | Read `editing.md` |
| Create from scratch | Read `pptxgenjs.md` |

## Reading Content

```bash
python -m markitdown presentation.pptx  # text extraction
python scripts/thumbnail.py presentation.pptx  # visual overview
python scripts/office/unpack.py presentation.pptx unpacked/  # raw XML
```

## Design Principles

**Don't create boring slides.** Plain bullets on a white background won't impress anyone.

### Before Starting

- **Pick a bold, content-informed color palette** specific to the topic
- **Dominance over equality**: one color dominates (60-70%), 1-2 supporting, one accent
- **Dark/light contrast**: dark for title + conclusion, light for content ("sandwich") — or commit to dark throughout
- **Commit to a visual motif**: one distinctive element repeated across all slides

### Color Palettes

| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| Midnight Executive | `1E2761` | `CADCFC` | `FFFFFF` |
| Forest & Moss | `2C5F2D` | `97BC62` | `F5F5F5` |
| Coral Energy | `F96167` | `F9E795` | `2F3C7E` |
| Warm Terracotta | `B85042` | `E7E8D1` | `A7BEAE` |
| Charcoal Minimal | `36454F` | `F2F2F2` | `212121` |

### For Each Slide

Every slide needs a visual element (image, chart, icon, or shape). Text-only slides are forgettable.

**Layout options**: two-column, icon + text rows, 2x2/2x3 grid, half-bleed image

**Typography**:

| Element | Size |
|---------|------|
| Slide title | 36-44pt bold |
| Section header | 20-24pt bold |
| Body text | 14-16pt |

### Avoid

- Repeating the same layout across slides
- Centering body text
- Defaulting to blue
- Text-only slides
- **Accent lines under titles** — hallmark of AI-generated slides

## QA (Required)

Assume there are problems. Your job is to find them.

```bash
python -m markitdown output.pptx
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum"
```

Use subagents for visual QA — convert to images first:

```bash
python -m markitdown output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

## Dependencies

- `pip install "markitdown[pptx]"` — text extraction
- `npm install -g pptxgenjs` — creating from scratch
- LibreOffice (`soffice`) — PDF conversion
- Poppler (`pdftoppm`) — PDF to images
