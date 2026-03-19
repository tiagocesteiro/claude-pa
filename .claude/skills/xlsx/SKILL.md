---
name: xlsx
description: "Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or .tsv file (e.g., adding columns, computing formulas, formatting, charting, cleaning messy data); create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Trigger especially when the user references a spreadsheet file by name or path — even casually (like \"the xlsx in my downloads\") — and wants something done to it or produced from it. Also trigger for cleaning or restructuring messy tabular data files (malformed rows, misplaced headers, junk data) into proper spreadsheets. The deliverable must be a spreadsheet file. Do NOT trigger when the primary deliverable is a Word document, HTML report, standalone Python script, database pipeline, or Google Sheets API integration, even if tabular data is involved."
license: Proprietary. LICENSE.txt has complete terms
---

# XLSX Skill

## Output Requirements

### All Excel Files

- Use consistent professional font (Arial, Times New Roman) unless instructed otherwise
- Zero formula errors (#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?) — non-negotiable
- When modifying existing files: exactly match format, style, and conventions

### Financial Models — Color Coding

- **Blue text (0,0,255)**: Hardcoded inputs users will change
- **Black text (0,0,0)**: All formulas and calculations
- **Green text (0,128,0)**: Links from other worksheets in same workbook
- **Red text (255,0,0)**: External links to other files
- **Yellow background (255,255,0)**: Key assumptions needing attention

### Number Formatting

- Years: text strings ("2024" not "2,024")
- Currency: `$#,##0` with units in headers ("Revenue ($mm)")
- Zeros: use `"-"` format including percentages
- Percentages: `0.0%`
- Multiples: `0.0x`
- Negatives: parentheses (123) not minus -123

## Critical: Use Formulas, Not Hardcoded Values

```python
# WRONG
total = df['Sales'].sum()
sheet['B10'] = total  # hardcoded

# CORRECT
sheet['B10'] = '=SUM(B2:B9)'
sheet['C5'] = '=(C4-C2)/C2'
sheet['D20'] = '=AVERAGE(D2:D19)'
```

## Workflow

1. **Choose tool**: pandas for data analysis, openpyxl for formulas/formatting
2. **Create/Load**: create new or load existing
3. **Modify**: add data, formulas, formatting
4. **Save**
5. **Recalculate (MANDATORY if using formulas)**:
   ```bash
   python scripts/recalc.py output.xlsx
   ```
6. **Verify and fix errors** — if `status` is `errors_found`, fix and recalculate again

## Creating New Files (openpyxl)

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active
sheet['A1'] = 'Hello'
sheet['B2'] = '=SUM(A1:A10)'
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet.column_dimensions['A'].width = 20
wb.save('output.xlsx')
```

## Editing Existing Files (openpyxl)

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active
sheet['A1'] = 'New Value'
wb.save('modified.xlsx')
```

**Warning**: `data_only=True` + save replaces formulas with values permanently.

## Reading and Analysis (pandas)

```python
import pandas as pd

df = pd.read_excel('file.xlsx')
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)
df.to_excel('output.xlsx', index=False)
```

## Formula Verification Checklist

- [ ] Test 2-3 sample references before building full model
- [ ] Column mapping confirmed (Excel col 64 = BL, not BK)
- [ ] Row offset: Excel rows are 1-indexed (DataFrame row 5 = Excel row 6)
- [ ] NaN handling: check with `pd.notna()`
- [ ] Division by zero: check denominators (#DIV/0!)
- [ ] All cell references verified (#REF!)

## recalc.py Output

```json
{
  "status": "success",
  "total_errors": 0,
  "total_formulas": 42,
  "error_summary": {
    "#REF!": { "count": 2, "locations": ["Sheet1!B5"] }
  }
}
```
