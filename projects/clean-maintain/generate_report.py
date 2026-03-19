from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import PageBreak

OUTPUT = "d:/Claude - PA/projects/clean-maintain/Clean-Maintain-Business-Plan.pdf"

# Colors
DARK = HexColor("#1a1a1a")
ACCENT = HexColor("#16a34a")  # green
LIGHT_BG = HexColor("#f0fdf4")
MID_GRAY = HexColor("#6b7280")
BORDER = HexColor("#d1fae5")
TABLE_HEADER = HexColor("#dcfce7")

W, H = A4

styles = getSampleStyleSheet()

def style(name, **kwargs):
    return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

# Define styles
S = {
    "title": style("title", fontSize=26, textColor=DARK, fontName="Helvetica-Bold",
                   spaceAfter=4, leading=30),
    "subtitle": style("subtitle", fontSize=13, textColor=MID_GRAY, fontName="Helvetica",
                      spaceAfter=2),
    "date": style("date", fontSize=10, textColor=MID_GRAY, fontName="Helvetica",
                  spaceAfter=16),
    "h1": style("h1", fontSize=15, textColor=ACCENT, fontName="Helvetica-Bold",
                spaceBefore=18, spaceAfter=6),
    "h2": style("h2", fontSize=12, textColor=DARK, fontName="Helvetica-Bold",
                spaceBefore=12, spaceAfter=4),
    "body": style("body", fontSize=10, textColor=DARK, fontName="Helvetica",
                  leading=15, spaceAfter=4),
    "body_gray": style("body_gray", fontSize=10, textColor=MID_GRAY, fontName="Helvetica",
                       leading=15, spaceAfter=4),
    "bullet": style("bullet", fontSize=10, textColor=DARK, fontName="Helvetica",
                    leading=15, spaceAfter=3, leftIndent=12, bulletIndent=0),
    "note": style("note", fontSize=9, textColor=MID_GRAY, fontName="Helvetica-Oblique",
                  leading=13, spaceAfter=4),
    "callout_text": style("callout_text", fontSize=11, textColor=DARK, fontName="Helvetica",
                          leading=16),
    "footer": style("footer", fontSize=8, textColor=MID_GRAY, fontName="Helvetica",
                    alignment=TA_CENTER),
}

def b(text): return f"<b>{text}</b>"
def i(text): return f"<i>{text}</i>"
def c(text, color): return f'<font color="{color}">{text}</font>'

def cell(text, bold=False, color=DARK, size=9):
    """Wrap a string in a Paragraph so markup is rendered."""
    if isinstance(text, Paragraph):
        return text
    s = ParagraphStyle("cell", parent=styles["Normal"], fontSize=size,
                       fontName="Helvetica-Bold" if bold else "Helvetica",
                       textColor=color, leading=13, wordWrap="CJK")
    return Paragraph(str(text), s)

def table(data, col_widths, header_rows=1):
    # Convert all string cells to Paragraphs so markup renders correctly
    parsed = []
    for r_idx, row in enumerate(data):
        parsed_row = []
        for item in row:
            if isinstance(item, str):
                is_header = r_idx < header_rows
                parsed_row.append(cell(item, bold=False))
            else:
                parsed_row.append(item)
        parsed.append(parsed_row)
    data = parsed
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), DARK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#f9fafb")]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

def callout(text):
    data = [[Paragraph(text, S["callout_text"])]]
    t = Table(data, colWidths=[W - 40*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 1.5, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=6)

def header_banner(title_text, sub_text):
    data = [[
        Paragraph(title_text, ParagraphStyle("bt", fontSize=22, textColor=white,
                                              fontName="Helvetica-Bold", leading=26)),
        ""
    ], [
        Paragraph(sub_text, ParagraphStyle("bs", fontSize=11, textColor=HexColor("#bbf7d0"),
                                            fontName="Helvetica", leading=14)),
        ""
    ]]
    t = Table(data, colWidths=[W - 40*mm, 0])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (0, 0), 18),
        ("BOTTOMPADDING", (0, 0), (0, 0), 2),
        ("TOPPADDING", (0, 1), (0, 1), 2),
        ("BOTTOMPADDING", (0, 1), (0, 1), 18),
        ("SPAN", (0, 0), (-1, 0)),
        ("SPAN", (0, 1), (-1, 1)),
    ]))
    return t

# Build content
story = []

# --- COVER ---
story.append(Spacer(1, 18*mm))
story.append(Paragraph("Clean & Maintain", S["title"]))
story.append(Paragraph("Gym Ergometer Cleaning & Maintenance Service", S["subtitle"]))
story.append(Paragraph("Business Plan — March 2026", S["date"]))
story.append(hr())
story.append(Spacer(1, 4))
story.append(callout(
    f"{b('The opportunity:')} No Concept2-specialized maintenance service exists in Portugal. "
    "The UK has Rowgear (£70/machine). The USA has Erg Doctor. Lisbon has nothing equivalent. "
    "16 CrossFit boxes + ~150-200 boutique studios are the target market."
))
story.append(Spacer(1, 8))

# Summary table
summary_data = [
    [b("Service"), b("Market"), b("Competitors"), b("Starter Cost"), b("Revenue Model")],
    [
        "Ergometer maintenance\n+ free weight\nrust restoration",
        "16 CrossFit boxes\n~150-200 boutique\nstudios in Lisbon",
        "None for Concept2\nergs in Portugal\n(FFitness targets\nbig gym chains)",
        "€175-280 kit\n+ drill (optional\n€50-95)",
        "Retainer\n€15-25/machine/mo\nor per visit\n€80-150"
    ],
]
story.append(table(summary_data, [None, None, None, None, None]))

# --- SECTION 1: MARKET ---
story.append(Spacer(1, 6))
story.append(Paragraph("1. Market Overview", S["h1"]))
story.append(hr())

market_data = [
    [b("Segment"), b("Count (Lisbon)"), b("Notes")],
    ["CrossFit affiliated boxes", "16", "High erg density — 5-12 ergs per box on average"],
    ["Boutique fitness studios", "~150-200", "Rowing/ski studios growing; estimate, not verified"],
    ["Condo / corporate gyms", "Unknown", "Lower erg count but less price-sensitive"],
    ["Total gyms (Greater Lisbon)", "~589", "28% of Portugal's ~2,370 total (companydata.com)"],
]
story.append(table(market_data, [90, 80, None]))
story.append(Spacer(1, 6))

story.append(Paragraph("Known CrossFit Boxes in Lisbon", S["h2"]))
boxes = [
    "Matchbox CrossFit", "XXI CrossFit", "Off Limits CrossFit Rato",
    "The Bakery CrossFit", "Trend CrossFit", "Quimera Fitness (QSC Fitness)",
    "~10 others in the Wodily affiliate directory"
]
for box in boxes:
    story.append(Paragraph(f"- {box}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Competitors", S["h2"]))
comp_data = [
    [b("Company"), b("Focus"), b("Pricing"), b("Gap")],
    ["FFitness (Lisbon)", "Large cardio/resistance fleets\n(Technogym, FFittech brand)", "From €69.90+VAT/month", "Not CrossFit-focused.\nNo erg specialist."],
    ["Technogym Portugal", "Their own equipment only", "Contact-based", "Brand-locked.\nIgnores CrossFit."],
    ["Rowgear (UK)", "Concept2 specialists", "£70/machine", "UK only. No Portugal."],
    ["Erg Doctor (USA)", "Concept2 + Assault Bikes", "Not public", "USA only."],
]
story.append(table(comp_data, [85, None, 90, 90]))
story.append(Paragraph(
    i("No Concept2-specialized maintenance company identified in Portugal. This is the gap to own."),
    S["note"]
))

# --- SECTION 2: SERVICE MENU ---
story.append(PageBreak())
story.append(Paragraph("2. Service Menu & Pricing", S["h1"]))
story.append(hr())

story.append(Paragraph("Tier 1 — Deep Clean", S["h2"]))
t1 = [
    ["Full exterior wipe-down (frame, seat, footrests, handles, straps)"],
    ["Monorail cleaning with non-abrasive scouring pad + glass cleaner"],
    ["Fan blade and crevice brushing (Assault/Echo Bikes)"],
    ["Disinfection of all contact surfaces (70% isopropanol)"],
    ["Visual inspection + written service report with before/after photos"],
]
for row in t1:
    story.append(Paragraph(f"- {row[0]}", S["bullet"]))

tier1_price = [
    [b("Pricing"), b("Price")],
    ["Per machine (one-off)", "€25-35/machine"],
    ["Monthly retainer", "€15/machine/month"],
]
story.append(Spacer(1, 4))
story.append(table(tier1_price, [None, 100]))

story.append(Spacer(1, 8))
story.append(Paragraph("Tier 2 — Clean + Maintenance  " + c("(Recommended)", "#16a34a"), S["h2"]))
t2 = [
    "Everything in Tier 1, plus:",
    "Chain lubrication (Concept2: mineral oil or 3-IN-ONE, every 50h of use)",
    "Flywheel dust removal (vacuum inside mesh cage)",
    "Hardware tightness check (Allen key set + pedal wrench)",
    "SkiErg cord inspection (check for twisting)",
    "Strap and footrest condition check",
    "Firmware check via Concept2 Utility app",
    "Detailed service report: condition rating, recommended follow-ups",
]
for item in t2:
    story.append(Paragraph(f"- {item}", S["bullet"]))

tier2_price = [
    [b("Pricing"), b("Price")],
    ["Per machine (one-off)", "€50-70/machine"],
    ["Monthly retainer", "€20-25/machine/month"],
    [b("Example: 8 ergs on retainer"), b("€160-200/month")],
]
story.append(Spacer(1, 4))
story.append(table(tier2_price, [None, 120]))

story.append(Spacer(1, 8))
story.append(Paragraph("Tier 3 — Full Service + Rust Restoration", S["h2"]))
t3 = [
    "Everything in Tier 2, plus:",
    "Barbell rust removal (vinegar soak, wire brush, re-oil)",
    "Kettlebell sanding + re-oiling",
    "Dumbbell restoration (rubber or cast iron)",
    "Deep rust treatment with wire wheel",
    "Surface refinishing to protect against future corrosion",
]
for item in t3:
    story.append(Paragraph(f"- {item}", S["bullet"]))

tier3_price = [
    [b("Pricing"), b("Price")],
    ["Barbells", "€15-25/bar (depending on rust severity)"],
    ["Kettlebells", "€8-15/bell"],
    ["Dumbbells", "€5-10/pair"],
    ["Free weights add-on to retainer", "+€30-50/month"],
]
story.append(Spacer(1, 4))
story.append(table(tier3_price, [None, 180]))

story.append(Spacer(1, 8))
story.append(Paragraph("Example Package — Typical CrossFit Box", S["h2"]))
story.append(callout(
    f"5 rowers + 1 ski erg + 1 bike erg + 1 Assault Bike + 15 barbells<br/><br/>"
    f"8 ergs @ Tier 2 retainer (€20/machine): {b('€160/month')}<br/>"
    f"Barbell maintenance add-on: {b('€40/month')}<br/>"
    f"<br/>{b('Total: ~€200/month')} | Annual value: €2,400<br/><br/>"
    f"{i('Replacing one Concept2 RowErg = ~€1,100. Preventive maintenance pays for itself.')}"
))

# --- SECTION 3: MAINTENANCE PROTOCOLS ---
story.append(PageBreak())
story.append(Paragraph("3. Maintenance Protocols", S["h1"]))
story.append(hr())

story.append(Paragraph("Concept2 RowErg / SkiErg / BikeErg — Per Visit Checklist", S["h2"]))
steps = [
    "Wipe full exterior — frame, monorail, seat, footrests, straps, handles",
    "Monorail: glass cleaner or diluted Simple Green on non-abrasive scouring pad",
    "Monitor: dry cloth ONLY — no liquids, no spray",
    "Chain: 1 tsp mineral oil on paper towel, wipe full chain length (every 50h of use)",
    "Flywheel: vacuum dust from inside mesh cage (every 250h or quarterly for busy boxes)",
    "Hardware: check all bolts and screws for tightness (Allen key + pedal wrench)",
    "SkiErg: inspect cord for twisting — untwist by turning handle opposite direction",
    "Disinfect all contact surfaces with 70% isopropanol or diluted bleach",
]
for s in steps:
    story.append(Paragraph(f"{steps.index(s)+1}. {s}", S["bullet"]))

story.append(Spacer(1, 8))
story.append(Paragraph("Maintenance Frequency by Task", S["h2"]))
freq_data = [
    [b("Task"), b("Frequency"), b("Skill Level")],
    ["Exterior wipe-down + disinfection", "Every use / every visit", "Low"],
    ["Chain lubrication", "Every 50h of use (~weekly in busy box)", "Low"],
    ["Flywheel dust removal", "Every 250h (~quarterly)", "Medium"],
    ["Hardware tightness check", "Monthly", "Low"],
    ["SkiErg cord inspection", "Monthly", "Low"],
    ["Foot stretcher / strap inspection", "Monthly", "Low"],
    ["Shock cord replacement", "As needed", "Medium"],
    ["PM5 firmware / battery", "As needed", "Low"],
    ["Barbell rust restoration", "As needed", "Medium"],
    ["Kettlebell sanding + re-oiling", "As needed", "Low-Medium"],
]
story.append(table(freq_data, [None, 130, 70]))

story.append(Spacer(1, 8))
story.append(Paragraph("What to NEVER Use on Concept2 Equipment", S["h2"]))
never = [
    "WD-40 on chains — solvent, strips lubrication, attracts dirt",
    "Alcohol on microfiber suede grips — degrades adhesive, causes peeling",
    "Direct spray of any liquid on monitors or electronics",
    "Undiluted bleach on the monorail",
    "Steam directly on flywheel housing, bearings, or electronics",
    "Coarse abrasives on any surface",
]
for n in never:
    story.append(Paragraph(f"- {c('X', '#dc2626')}  {n}", S["bullet"]))

# --- SECTION 4: STARTER KIT ---
story.append(PageBreak())
story.append(Paragraph("4. Starter Kit", S["h1"]))
story.append(hr())
story.append(Paragraph(
    "Everything needed to start servicing Concept2 ergs professionally. "
    "Available at Leroy Merlin or Amazon.pt.",
    S["body"]
))

kit_data = [
    [b("Item"), b("Purpose"), b("Est. Cost (EUR)")],
    ["Simple Green concentrate 1L", "Frame + surface cleaning (diluted)", "€10-15"],
    ["70% isopropanol spray 500ml", "Disinfection of contact surfaces", "€5-8"],
    ["White vinegar 2L", "Rust soak for barbells/kettlebells", "€3-5"],
    ["Mild dish soap", "General wipe-downs", "€2-3"],
    ["Mineral oil 500ml", "Concept2 chain lubrication (official rec.)", "€5-8"],
    ["3-IN-ONE oil 200ml", "Chain + barbell maintenance", "€6-8"],
    ["WD-40 (small can)", "Surface rust loosening only — NOT for chains", "€5-7"],
    ["Microfiber cloths x20", "All wipe-downs", "€10-15"],
    ["Stiff nylon brushes x3", "Knurling cleaning, chain", "€6-10"],
    ["Brass wire brush", "Light rust, knurling", "€5-8"],
    ["Steel wire brush", "Heavy rust removal", "€5-8"],
    ["Non-abrasive scouring pads x10", "Monorail cleaning", "€3-5"],
    ["Soft detail brushes x3", "Fan blades, crevices", "€5-8"],
    ["Magic erasers x10", "Kettlebell handles, surfaces", "€5-8"],
    ["Allen key set 2-10mm", "Hardware tightening", "€10-15"],
    ["15mm pedal wrench", "BikeErg pedal bolts", "€8-12"],
    ["Sandpaper assortment 240+400 grit", "Rust sanding on barbells/kettlebells", "€5-8"],
    ["Shop vac / handheld vac", "Flywheel dust removal (narrow nozzle)", "€30-50"],
    ["Flashlight / headlamp", "Flywheel cage inspection", "€10-15"],
    ["Spray bottles x3", "Diluted cleaner preparation", "€5-8"],
    ["Nitrile gloves (box of 50)", "Hand protection", "€8-12"],
    ["Plastic cling film", "Wrap barbells for vinegar rust soak", "€3-5"],
    ["Carry bag or toolbox", "Transport to client sites", "€15-30"],
    [b("TOTAL"), "", b("€175-280")],
]
story.append(table(kit_data, [None, None, 90]))
story.append(Paragraph(
    "Optional: corded drill + wire wheel attachment for heavy rust — add €50-95 if not already owned.",
    S["note"]
))

story.append(Spacer(1, 8))
story.append(Paragraph("Advanced Tools (Phase 2 — Once You Have 3+ Regular Clients)", S["h2"]))
adv_data = [
    [b("Tool"), b("Use"), b("Cost"), b("Verdict")],
    [
        "Portable air compressor",
        "Blow dust out of flywheel cages (faster than vacuum alone).\nBest used as blow + vacuum combo.",
        "€40-80",
        "Add in Phase 2.\nShop vac alone is fine to start."
    ],
    [
        "Steam cleaner",
        "Floor stands, rubber mats, Assault Bike frame.\nNOT for chain, monitors, or flywheel housing.",
        "€50-150",
        "Only if adding floor/mat cleaning. Not needed for erg service."
    ],
]
story.append(table(adv_data, [90, None, 60, 110]))

# --- SECTION 5: ACTION PLAN ---
story.append(PageBreak())
story.append(Paragraph("5. Action Plan", S["h1"]))
story.append(hr())

story.append(Paragraph("Phase 1 — March 2026 (Current)", S["h2"]))
p1 = [
    "Buy starter kit (~€175-280) at Leroy Merlin or Amazon.pt",
    "Practice on own equipment or volunteer at a local CrossFit box — document before/after",
    "Draft outreach message and contact 5 CrossFit boxes in Lisbon",
    "Offer 2-3 free demo visits — document with before/after photos",
    "Build case study from demo visits",
]
for i, item in enumerate(p1):
    story.append(Paragraph(f"{i+1}. {item}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Phase 2 — April 2026", S["h2"]))
p2 = [
    "Close first monthly retainer contract (target: €120-200/month, 1 CrossFit box)",
    "Use service report template for every visit — builds professionalism and trust",
    "Register NIF if not already active (portaldasfinancas.gov.pt) — free",
    "Register CAE 81220 + 33190 if operating commercially",
    "Add air compressor to kit (once doing 3+ boxes regularly)",
]
for i, item in enumerate(p2):
    story.append(Paragraph(f"{i+1}. {item}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Phase 3 — May 2026+", S["h2"]))
p3 = [
    "Expand to barbell and kettlebell rust restoration as paid add-on",
    "Target boutique studios and condo gyms (higher value per visit, less price-sensitive)",
    "Build social proof — Instagram before/after transformations spread in tight-knit CrossFit communities",
    "Consider floor maintenance add-on (Phase 4) — only after erg service is proven",
]
for i, item in enumerate(p3):
    story.append(Paragraph(f"{i+1}. {item}", S["bullet"]))

story.append(Spacer(1, 8))
story.append(Paragraph("Risks & Mitigations", S["h2"]))
risk_data = [
    [b("Risk"), b("Mitigation")],
    ["Low awareness — gyms don't know they need this",
     "Free demo visit removes the commitment barrier entirely"],
    ["Pricing resistance",
     "Start per-visit, convert to retainer once trust is built"],
    ["Equipment variety (non-Concept2 brands)",
     "Start Concept2-only, expand to Assault/Echo Bikes as you learn them"],
    ["Liability if something breaks during service",
     "Document machine condition before + after every single visit"],
    ["Seasonal slow periods (summer gym closures)",
     "Target condo/corporate gyms that operate year-round"],
]
story.append(table(risk_data, [None, None]))

# --- SECTION 6: FINANCIALS ---
story.append(PageBreak())
story.append(Paragraph("6. Revenue Projections", S["h1"]))
story.append(hr())

story.append(Paragraph("Conservative Scenario (Month 6)", S["h2"]))
fin_data = [
    [b("Clients"), b("Ergs/Client"), b("Rate/Erg/Month"), b("Monthly Revenue")],
    ["3 CrossFit boxes", "8 avg", "€20", "€480"],
    ["1 boutique studio", "4 avg", "€22", "€88"],
    ["Free weights add-on (2 clients)", "—", "€40 flat", "€80"],
    [b("Total"), "", "", b("€648/month")],
]
story.append(table(fin_data, [None, 70, 100, 110]))
story.append(Paragraph(
    "Starter kit (~€250) is recovered after ~1 month with first client.",
    S["note"]
))

story.append(Spacer(1, 6))
story.append(Paragraph("Growth Scenario (Month 12)", S["h2"]))
fin_grow = [
    [b("Clients"), b("Ergs/Client"), b("Rate/Erg/Month"), b("Monthly Revenue")],
    ["8 CrossFit boxes", "8 avg", "€20", "€1,280"],
    ["4 boutique studios", "4 avg", "€22", "€352"],
    ["Free weights add-on (6 clients)", "—", "€40 flat", "€240"],
    [b("Total"), "", "", b("€1,872/month")],
]
story.append(table(fin_grow, [None, 70, 100, 110]))
story.append(Paragraph(
    "UK benchmark (Rowgear): £70/machine per service with 12-month warranty on work. "
    "Portuguese pricing adjusted downward but the model is proven.",
    S["note"]
))

# --- FOOTER ---
story.append(Spacer(1, 16))
story.append(hr())
story.append(Paragraph("Clean & Maintain — Confidential Business Plan | March 2026", S["footer"]))

# Build PDF
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=20*mm,
    rightMargin=20*mm,
    topMargin=20*mm,
    bottomMargin=20*mm,
)
doc.build(story)
print(f"PDF created: {OUTPUT}")
