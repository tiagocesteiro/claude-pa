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

OUTPUT = "d:/Claude - PA/projects/clean-maintain/Clean-Maintain-Plano-de-Negocio.pdf"

# Colors
DARK = HexColor("#1a1a1a")
ACCENT = HexColor("#16a34a")
LIGHT_BG = HexColor("#f0fdf4")
MID_GRAY = HexColor("#6b7280")
BORDER = HexColor("#d1fae5")
TABLE_HEADER = HexColor("#dcfce7")

W, H = A4

styles = getSampleStyleSheet()

def style(name, **kwargs):
    return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

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
def it(text): return f"<i>{text}</i>"
def c(text, color): return f'<font color="{color}">{text}</font>'

def cell(text, bold=False, color=DARK, size=9):
    if isinstance(text, Paragraph):
        return text
    s = ParagraphStyle("cell", parent=styles["Normal"], fontSize=size,
                       fontName="Helvetica-Bold" if bold else "Helvetica",
                       textColor=color, leading=13, wordWrap="CJK")
    return Paragraph(str(text), s)

def table(data, col_widths, header_rows=1):
    parsed = []
    for r_idx, row in enumerate(data):
        parsed_row = []
        for item in row:
            if isinstance(item, str):
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

# Build content
story = []

# --- CAPA ---
story.append(Spacer(1, 18*mm))
story.append(Paragraph("Clean &amp; Maintain", S["title"]))
story.append(Paragraph("Servico de Limpeza e Manutencao de Ergometros", S["subtitle"]))
story.append(Paragraph("Plano de Negocio - Marco 2026", S["date"]))
story.append(hr())
story.append(Spacer(1, 4))
story.append(callout(
    f"{b('A oportunidade:')} Nao existe nenhuma empresa especializada em manutencao de "
    "equipamento Concept2 em Portugal. O Reino Unido tem a Rowgear (70 libras/maquina). "
    "Os EUA tem a Erg Doctor. Lisboa nao tem nada equivalente. "
    "16 boxes de CrossFit + ~150-200 estudios boutique sao o mercado-alvo."
))
story.append(Spacer(1, 8))

# Tabela resumo
summary_data = [
    [b("Servico"), b("Mercado"), b("Concorrentes"), b("Custo Inicial"), b("Modelo de Receita")],
    [
        "Manutencao de\nergometros + restauro\nde pesos livres",
        "16 boxes CrossFit\n~150-200 estudios\nboutique em Lisboa",
        "Nenhum para ergs\nConcept2 em Portugal\n(FFitness foca em\ngrandes ginasios)",
        "Kit 175-280 EUR\n+ berbequim\n(opcional 50-95 EUR)",
        "Retainer\n15-25 EUR/maq/mes\nou por visita\n80-150 EUR"
    ],
]
story.append(table(summary_data, [None, None, None, None, None]))

# --- SECAO 1: MERCADO ---
story.append(Spacer(1, 6))
story.append(Paragraph("1. Analise de Mercado", S["h1"]))
story.append(hr())

market_data = [
    [b("Segmento"), b("Quantidade (Lisboa)"), b("Notas")],
    ["Boxes CrossFit afiliadas", "16", "Alta densidade de ergs - media de 5 a 12 por box"],
    ["Estudios boutique de fitness", "~150-200", "Estudios de remo/ski em crescimento; estimativa"],
    ["Ginasios de condominio/empresa", "Desconhecido", "Menos ergs mas menos sensiveis ao preco"],
    ["Total de ginasios (Grande Lisboa)", "~589", "28% do total nacional ~2.370 (companydata.com)"],
]
story.append(table(market_data, [100, 90, None]))
story.append(Spacer(1, 6))

story.append(Paragraph("Boxes CrossFit Conhecidas em Lisboa", S["h2"]))
boxes = [
    "Matchbox CrossFit", "XXI CrossFit", "Off Limits CrossFit Rato",
    "The Bakery CrossFit", "Trend CrossFit", "Quimera Fitness (QSC Fitness)",
    "~10 outras no diretorio de afiliados Wodily"
]
for box in boxes:
    story.append(Paragraph(f"- {box}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Concorrentes", S["h2"]))
comp_data = [
    [b("Empresa"), b("Foco"), b("Preco"), b("Lacuna")],
    ["FFitness (Lisboa)", "Grandes frotas de cardio/resistencia\n(Technogym, marca FFittech)", "A partir de 69,90 EUR+IVA/mes", "Nao focada em CrossFit.\nSem especialista em ergs."],
    ["Technogym Portugal", "Apenas o seu proprio equipamento", "Por contacto", "Ligada a marca.\nIgnora o CrossFit."],
    ["Rowgear (Reino Unido)", "Especialistas Concept2", "70 libras/maquina", "Apenas no RU."],
    ["Erg Doctor (EUA)", "Concept2 + Assault Bikes", "Nao publico", "Apenas nos EUA."],
]
story.append(table(comp_data, [85, None, 95, 90]))
story.append(Paragraph(
    it("Nenhuma empresa especializada em manutencao de ergs Concept2 identificada em Portugal. Esta e a lacuna a preencher."),
    S["note"]
))

# --- SECAO 2: MENU DE SERVICOS ---
story.append(PageBreak())
story.append(Paragraph("2. Menu de Servicos e Precos", S["h1"]))
story.append(hr())

story.append(Paragraph("Nivel 1 - Limpeza Profunda", S["h2"]))
t1 = [
    "Limpeza completa do exterior (estrutura, assento, apoios de pes, pegas, correias)",
    "Limpeza do carril com esfregao nao abrasivo + limpador de vidros",
    "Escovagem das pas do ventilador e fendas (Assault/Echo Bikes)",
    "Desinfetar todas as superficies de contacto (isopropanol a 70%)",
    "Inspecao visual + relatorio escrito com fotos antes/depois",
]
for item in t1:
    story.append(Paragraph(f"- {item}", S["bullet"]))

tier1_price = [
    [b("Preco"), b("Valor")],
    ["Por maquina (pontual)", "25-35 EUR/maquina"],
    ["Retainer mensal", "15 EUR/maquina/mes"],
]
story.append(Spacer(1, 4))
story.append(table(tier1_price, [None, 120]))

story.append(Spacer(1, 8))
story.append(Paragraph("Nivel 2 - Limpeza + Manutencao  " + c("(Recomendado)", "#16a34a"), S["h2"]))
t2 = [
    "Tudo do Nivel 1, mais:",
    "Lubrificacao da corrente (Concept2: oleo mineral ou 3-IN-ONE, a cada 50h de uso)",
    "Remocao de po do volante (aspirar dentro da grelha da carcaca)",
    "Verificacao do aperto dos parafusos (jogo de chaves Allen + chave de pedais 15mm)",
    "Inspecao do cabo do SkiErg (verificar torcoes)",
    "Verificacao das correias e apoios de pes",
    "Verificacao de firmware via app Concept2 Utility",
    "Relatorio detalhado: classificacao de estado, recomendacoes para proxima visita",
]
for item in t2:
    story.append(Paragraph(f"- {item}", S["bullet"]))

tier2_price = [
    [b("Preco"), b("Valor")],
    ["Por maquina (pontual)", "50-70 EUR/maquina"],
    ["Retainer mensal", "20-25 EUR/maquina/mes"],
    [b("Exemplo: 8 ergs em retainer"), b("160-200 EUR/mes")],
]
story.append(Spacer(1, 4))
story.append(table(tier2_price, [None, 140]))

story.append(Spacer(1, 8))
story.append(Paragraph("Nivel 3 - Servico Completo + Restauro de Ferrugem", S["h2"]))
t3 = [
    "Tudo do Nivel 2, mais:",
    "Remocao de ferrugem de barbells (mergulho em vinagre, escova de arame, lubrificacao)",
    "Lixagem e lubrificacao de kettlebells",
    "Restauro de halterios (borracha ou ferro fundido)",
    "Tratamento intensivo de ferrugem com rebarbadora de disco",
    "Acabamento de superficie para proteger contra corrosao futura",
]
for item in t3:
    story.append(Paragraph(f"- {item}", S["bullet"]))

tier3_price = [
    [b("Preco"), b("Valor")],
    ["Barbells", "15-25 EUR/barra (conforme gravidade da ferrugem)"],
    ["Kettlebells", "8-15 EUR/kettlebell"],
    ["Halterios", "5-10 EUR/par"],
    ["Add-on pesos livres ao retainer", "+30-50 EUR/mes"],
]
story.append(Spacer(1, 4))
story.append(table(tier3_price, [None, 200]))

story.append(Spacer(1, 8))
story.append(Paragraph("Exemplo de Pacote - Box CrossFit Tipica", S["h2"]))
story.append(callout(
    f"5 remos + 1 ski erg + 1 bike erg + 1 Assault Bike + 15 barbells<br/><br/>"
    f"8 ergs no Nivel 2 (20 EUR/maquina): {b('160 EUR/mes')}<br/>"
    f"Add-on manutencao de barbells: {b('40 EUR/mes')}<br/>"
    f"<br/>{b('Total: ~200 EUR/mes')} | Valor anual: 2.400 EUR<br/><br/>"
    f"{it('Substituir um Concept2 RowErg custa ~1.100 EUR. A manutencao preventiva paga-se a si propria.')}"
))

# --- SECAO 3: PROTOCOLOS DE MANUTENCAO ---
story.append(PageBreak())
story.append(Paragraph("3. Protocolos de Manutencao", S["h1"]))
story.append(hr())

story.append(Paragraph("Concept2 RowErg / SkiErg / BikeErg - Checklist por Visita", S["h2"]))
steps = [
    "Limpar todo o exterior - estrutura, carril, assento, apoios de pes, correias, pegas",
    "Carril: limpador de vidros ou Simple Green diluido com esfregao nao abrasivo",
    "Monitor: pano seco APENAS - sem liquidos, sem spray",
    "Corrente: 1 colher de cha de oleo mineral num papel, esfregar toda a corrente (a cada 50h de uso)",
    "Volante: aspirar o po do interior da carcaca de malha (a cada 250h ou trimestralmente em boxes movimentadas)",
    "Parafusos: verificar o aperto de todos os parafusos (chaves Allen + chave de pedais)",
    "SkiErg: inspecionar cabo para torcoes - destor cer rodando a pega na direcao oposta",
    "Desinfetar todas as superficies de contacto com isopropanol a 70% ou lixivia diluida",
]
for idx, s in enumerate(steps):
    story.append(Paragraph(f"{idx+1}. {s}", S["bullet"]))

story.append(Spacer(1, 8))
story.append(Paragraph("Frequencia de Manutencao por Tarefa", S["h2"]))
freq_data = [
    [b("Tarefa"), b("Frequencia"), b("Nivel de Dificuldade")],
    ["Limpeza exterior + desinfetar", "Cada uso / cada visita", "Baixo"],
    ["Lubrificacao da corrente", "A cada 50h de uso (~semanal em box movimentada)", "Baixo"],
    ["Remocao de po do volante", "A cada 250h (~trimestralmente)", "Medio"],
    ["Verificacao de parafusos", "Mensalmente", "Baixo"],
    ["Inspecao do cabo do SkiErg", "Mensalmente", "Baixo"],
    ["Inspecao de correias e apoios", "Mensalmente", "Baixo"],
    ["Substituicao do cabo elastico", "Conforme necessario", "Medio"],
    ["Firmware/bateria do PM5", "Conforme necessario", "Baixo"],
    ["Restauro de ferrugem em barbells", "Conforme necessario", "Medio"],
    ["Lixagem e lubrificacao de kettlebells", "Conforme necessario", "Baixo-Medio"],
]
story.append(table(freq_data, [None, 140, 80]))

story.append(Spacer(1, 8))
story.append(Paragraph("O Que NUNCA Usar em Equipamento Concept2", S["h2"]))
never = [
    "WD-40 nas correntes - solvente, remove a lubrificacao e atrai sujidade",
    "Alcool nas pegas de camurca microfibra - degrada o adesivo, provoca descamacao",
    "Spray direto de qualquer liquido nos monitores ou eletronicos",
    "Lixivia nao diluida no carril",
    "Vapor diretamente na carcaca do volante, rolamentos ou eletronicos",
    "Abrasivos grosseiros em qualquer superficie",
]
for n in never:
    story.append(Paragraph(f"- {c('X', '#dc2626')}  {n}", S["bullet"]))

# --- SECAO 4: KIT INICIAL ---
story.append(PageBreak())
story.append(Paragraph("4. Kit Inicial", S["h1"]))
story.append(hr())
story.append(Paragraph(
    "Tudo o que e necessario para comecar a dar servico a ergs Concept2 de forma profissional. "
    "Disponivel no Leroy Merlin ou Amazon.pt.",
    S["body"]
))

kit_data = [
    [b("Item"), b("Finalidade"), b("Custo Est. (EUR)")],
    ["Simple Green concentrado 1L", "Limpeza de estrutura e superficies (diluido)", "10-15 EUR"],
    ["Spray de isopropanol 70% 500ml", "Desinfetar superficies de contacto", "5-8 EUR"],
    ["Vinagre branco 2L", "Mergulho anti-ferrugem para barbells/kettlebells", "3-5 EUR"],
    ["Detergente liquido suave", "Limpeza geral", "2-3 EUR"],
    ["Oleo mineral 500ml", "Lubrificacao da corrente Concept2 (rec. oficial)", "5-8 EUR"],
    ["Oleo 3-IN-ONE 200ml", "Corrente + manutencao de barbells", "6-8 EUR"],
    ["WD-40 (lata pequena)", "Apenas para soltar ferrugem superficial - NAO para correntes", "5-7 EUR"],
    ["Panos de microfibra x20", "Todas as limpezas", "10-15 EUR"],
    ["Escovas de nylon rigidas x3", "Limpeza do knurling, corrente", "6-10 EUR"],
    ["Escova de arame de latao", "Ferrugem leve, knurling", "5-8 EUR"],
    ["Escova de arame de aco", "Remocao de ferrugem intensa", "5-8 EUR"],
    ["Esfregoes nao abrasivos x10", "Limpeza do carril", "3-5 EUR"],
    ["Escovas de detalhe suaves x3", "Pas do ventilador, fendas", "5-8 EUR"],
    ["Esponjas magicas x10", "Pegas de kettlebells, superficies", "5-8 EUR"],
    ["Jogo de chaves Allen 2-10mm", "Aperto de parafusos", "10-15 EUR"],
    ["Chave de pedais 15mm", "Pedais do BikeErg", "8-12 EUR"],
    ["Lixa sortida 240+400", "Lixagem de ferrugem em barbells/kettlebells", "5-8 EUR"],
    ["Aspirador de mao/pequeno", "Remocao de po do volante (bico estreito)", "30-50 EUR"],
    ["Lanterna / frontal", "Inspecao da carcaca do volante", "10-15 EUR"],
    ["Frascos de spray x3", "Preparacao de limpadores diluidos", "5-8 EUR"],
    ["Luvas de nitrilo (caixa 50)", "Protecao das maos", "8-12 EUR"],
    ["Pelicula aderente", "Embrulhar barbells para mergulho em vinagre", "3-5 EUR"],
    ["Mala ou caixa de ferramentas", "Transporte para clientes", "15-30 EUR"],
    [b("TOTAL"), "", b("175-280 EUR")],
]
story.append(table(kit_data, [None, None, 95]))
story.append(Paragraph(
    "Opcional: berbequim com disco de arame para ferrugem intensa - adicionar 50-95 EUR se nao possuir.",
    S["note"]
))

story.append(Spacer(1, 8))
story.append(Paragraph("Ferramentas Avancadas (Fase 2 - A partir de 3 Clientes Regulares)", S["h2"]))
adv_data = [
    [b("Ferramenta"), b("Utilizacao"), b("Custo"), b("Avaliacao")],
    [
        "Compressor de ar portatil",
        "Soprar po da carcaca do volante (mais rapido que so aspirar).\nMelhor usar soprar + aspirar em combinacao.",
        "40-80 EUR",
        "Adicionar na Fase 2.\nSo o aspirador chega para comecar."
    ],
    [
        "Limpador a vapor",
        "Bases de chao, tapetes de borracha, estrutura do Assault Bike.\nNAO usar na corrente, monitores ou carcaca do volante.",
        "50-150 EUR",
        "So se adicionar limpeza de tapetes/chao. Nao necessario para servico de ergs."
    ],
]
story.append(table(adv_data, [95, None, 65, 110]))

# --- SECAO 5: PLANO DE ACAO ---
story.append(PageBreak())
story.append(Paragraph("5. Plano de Acao", S["h1"]))
story.append(hr())

story.append(Paragraph("Fase 1 - Marco 2026 (Atual)", S["h2"]))
p1 = [
    "Comprar o kit inicial (~175-280 EUR) no Leroy Merlin ou Amazon.pt",
    "Praticar no proprio equipamento ou voluntariar numa box local - documentar antes/depois",
    "Preparar mensagem de contacto e contactar 5 boxes CrossFit em Lisboa",
    "Oferecer 2-3 visitas de demonstracao gratuitas - documentar com fotos antes/depois",
    "Construir caso de estudo a partir das visitas de demonstracao",
]
for idx, item in enumerate(p1):
    story.append(Paragraph(f"{idx+1}. {item}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Fase 2 - Abril 2026", S["h2"]))
p2 = [
    "Fechar primeiro contrato de retainer mensal (objetivo: 120-200 EUR/mes, 1 box CrossFit)",
    "Usar o modelo de relatorio de servico em cada visita - cria profissionalismo e confianca",
    "Registar NIF se ainda nao ativo (portaldasfinancas.gov.pt) - gratuito",
    "Registar CAE 81220 + 33190 se a operar comercialmente",
    "Adicionar compressor de ar ao kit (quando tiver 3+ boxes regularmente)",
]
for idx, item in enumerate(p2):
    story.append(Paragraph(f"{idx+1}. {item}", S["bullet"]))

story.append(Spacer(1, 6))
story.append(Paragraph("Fase 3 - Maio 2026+", S["h2"]))
p3 = [
    "Expandir para restauro de ferrugem em barbells e kettlebells como add-on pago",
    "Visar estudios boutique e ginasios de condominio (maior valor por visita, menos sensiveis ao preco)",
    "Construir prova social - fotos antes/depois no Instagram propagam-se nas comunidades CrossFit",
    "Considerar add-on de manutencao de chao (Fase 4) - apenas apos o servico de ergs estar consolidado",
]
for idx, item in enumerate(p3):
    story.append(Paragraph(f"{idx+1}. {item}", S["bullet"]))

story.append(Spacer(1, 8))
story.append(Paragraph("Riscos e Mitigacoes", S["h2"]))
risk_data = [
    [b("Risco"), b("Mitigacao")],
    ["Baixa consciencializacao - ginasios nao sabem que precisam disto",
     "Visita de demonstracao gratuita elimina completamente a barreira de compromisso"],
    ["Resistencia ao preco",
     "Comecar por visita pontual, converter para retainer depois de construir confianca"],
    ["Variedade de equipamento (marcas nao-Concept2)",
     "Comecar apenas com Concept2, expandir para Assault/Echo Bikes progressivamente"],
    ["Responsabilidade se algo se danificar durante o servico",
     "Documentar o estado da maquina antes e depois de cada visita sem excecao"],
    ["Periodos de baixa sazonal (fecho de ginasios no verao)",
     "Visar ginasios de condominio/empresa que funcionam durante todo o ano"],
]
story.append(table(risk_data, [None, None]))

# --- SECAO 6: PROJECOES FINANCEIRAS ---
story.append(PageBreak())
story.append(Paragraph("6. Projecoes de Receita", S["h1"]))
story.append(hr())

story.append(Paragraph("Cenario Conservador (Mes 6)", S["h2"]))
fin_data = [
    [b("Clientes"), b("Ergs/Cliente"), b("Taxa/Erg/Mes"), b("Receita Mensal")],
    ["3 boxes CrossFit", "8 media", "20 EUR", "480 EUR"],
    ["1 estudio boutique", "4 media", "22 EUR", "88 EUR"],
    ["Add-on pesos livres (2 clientes)", "-", "40 EUR fixo", "80 EUR"],
    [b("Total"), "", "", b("648 EUR/mes")],
]
story.append(table(fin_data, [None, 75, 100, 110]))
story.append(Paragraph(
    "O kit inicial (~250 EUR) e recuperado ao fim de ~1 mes com o primeiro cliente.",
    S["note"]
))

story.append(Spacer(1, 6))
story.append(Paragraph("Cenario de Crescimento (Mes 12)", S["h2"]))
fin_grow = [
    [b("Clientes"), b("Ergs/Cliente"), b("Taxa/Erg/Mes"), b("Receita Mensal")],
    ["8 boxes CrossFit", "8 media", "20 EUR", "1.280 EUR"],
    ["4 estudios boutique", "4 media", "22 EUR", "352 EUR"],
    ["Add-on pesos livres (6 clientes)", "-", "40 EUR fixo", "240 EUR"],
    [b("Total"), "", "", b("1.872 EUR/mes")],
]
story.append(table(fin_grow, [None, 75, 100, 110]))
story.append(Paragraph(
    "Referencia do mercado (Rowgear, RU): 70 libras/maquina por servico com garantia de 12 meses. "
    "Os precos portugueses foram ajustados para baixo mas o modelo esta provado.",
    S["note"]
))

# --- RODAPE ---
story.append(Spacer(1, 16))
story.append(hr())
story.append(Paragraph("Clean &amp; Maintain - Plano de Negocio Confidencial | Marco 2026", S["footer"]))

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
print(f"PDF criado: {OUTPUT}")
