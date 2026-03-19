---
name: docx
description: "Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc', 'word document', '.docx', or requests to produce professional documents with formatting like tables of contents, headings, page numbers, or letterheads. Also use when extracting or reorganizing content from .docx files, inserting or replacing images in documents, performing find-and-replace in Word files, working with tracked changes or comments, or converting content into a polished Word document. If the user asks for a 'report', 'memo', 'letter', 'template', or similar deliverable as a Word or .docx file, use this skill. Do NOT use for PDFs, spreadsheets, Google Docs, or general coding tasks unrelated to document generation."
license: Proprietary. LICENSE.txt has complete terms
---

# DOCX Skill

Create, read, edit, and manipulate Word documents (.docx files).

## Key Capabilities

**Document Creation** (via `docx-js` JavaScript library):
- Explicit page sizing (A4 default; US Letter requires configuration)
- Custom styles, heading hierarchy, table of contents
- Tables with dual-width specifications, images with type declarations
- Headers, footers, hyperlinks, footnotes, multi-column layouts

**Document Editing** (unpack XML → edit → repack):
- Tracked changes (insertions/deletions) with author attribution
- Comments and replies via `comment.py` utility
- Smart quote entities for professional typography

**Content Extraction**:
- Pandoc for text with tracked changes preservation
- XML unpacking for granular analysis

## Critical Rules

- **Page sizing**: Always set explicitly; landscape requires portrait dimensions with internal swapping
- **Tables**: Require both `columnWidths` array AND individual cell widths in DXA units; must sum correctly
- **Bullets/numbering**: Never use unicode characters; use `LevelFormat.BULLET` configuration
- **Whitespace**: Never use `\n`; separate content into distinct Paragraph elements
- **Images**: Type parameter mandatory (png, jpg, gif, etc.)
- **Shading**: Use `ShadingType.CLEAR`, never SOLID
- **TOC**: Use HeadingLevel only; custom styles break table generation
- **PageBreak**: Must nest inside Paragraph element

## Validation

The `pack.py` script auto-repairs invalid `durableId` values and missing `xml:space="preserve"` attributes, but cannot fix malformed XML or schema violations.
