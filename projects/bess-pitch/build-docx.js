const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  PageBreak, ShadingType, LevelFormat, convertInchesToTwip,
  UnderlineType, Footer, Header, PageNumber, PageNumberElement, NumberFormat,
  VerticalAlign, TableLayoutType,
} = require("docx");
const fs = require("fs");

// ─── COLOURS ────────────────────────────────────────────────────────────────
const NAVY   = "0D1B2A";
const TEAL   = "00C9A7";
const MID    = "1B3A5C";
const LIGHT  = "EBF5FB";
const MUTED  = "8BA3B8";
const WARN   = "F5A623";
const GREEN  = "27AE60";
const WHITE  = "FFFFFF";
const BLACK  = "000000";
const GREY   = "F2F2F2";
const DARK_TEXT = "1A2636";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const twip = convertInchesToTwip;
const dxa  = (cm) => Math.round(cm * 567); // cm to DXA

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.CLEAR, color: NAVY, fill: NAVY },
    run: { color: WHITE, bold: true, size: 32, font: "Calibri" },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: MID, font: "Calibri" })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL } },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: TEAL, font: "Calibri" })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: DARK_TEXT, font: "Calibri", ...opts })],
    spacing: { after: 120 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: DARK_TEXT, font: "Calibri" })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function bold(text) { return new TextRun({ text, bold: true, size: 20, font: "Calibri", color: DARK_TEXT }); }
function teal(text) { return new TextRun({ text, bold: true, size: 20, font: "Calibri", color: TEAL }); }
function warn(text) { return new TextRun({ text, size: 20, font: "Calibri", color: WARN }); }
function muted(text) { return new TextRun({ text, size: 18, font: "Calibri", color: MUTED }); }
function code(text) { return new TextRun({ text, size: 18, font: "Courier New", color: MID }); }

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function note(text) {
  return new Paragraph({
    children: [new TextRun({ text: "ℹ  " + text, size: 18, color: MID, italics: true, font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: LIGHT, fill: LIGHT },
    spacing: { before: 120, after: 160 },
    indent: { left: dxa(0.4), right: dxa(0.4) },
  });
}

function warn_box(text) {
  return new Paragraph({
    children: [new TextRun({ text: "⚠  " + text, size: 18, color: "7B5C00", font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: "FFF3CD", fill: "FFF3CD" },
    spacing: { before: 120, after: 160 },
    indent: { left: dxa(0.4), right: dxa(0.4) },
  });
}

// Simple table helper
function makeTable(headers, rows, colWidths) {
  const headerCells = headers.map((h, i) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: h, bold: true, size: 18, color: WHITE, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
    })],
    width: { size: colWidths[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: NAVY, fill: NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  }));

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const isHighlight = typeof cell === "string" && (cell.startsWith("**") || cell.includes("€"));
      const text = typeof cell === "string" ? cell.replace(/\*\*/g, "") : cell;
      const fillColor = ri % 2 === 0 ? WHITE : GREY;
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: String(text),
            size: 18,
            font: "Calibri",
            color: DARK_TEXT,
            bold: String(text).startsWith("+") || String(text).startsWith("€") || typeof cell === "string" && cell.includes("**"),
          })],
        })],
        width: { size: colWidths[ci], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: fillColor, fill: fillColor },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      });
    }),
  }));

  return new Table({
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
    layout: TableLayoutType.FIXED,
    width: { size: 9000, type: WidthType.DXA },
    margins: { top: 120, bottom: 200 },
  });
}

// ─── DOCUMENT ────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 20, color: DARK_TEXT } },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { bold: true, size: 32, color: WHITE, font: "Calibri" },
        paragraph: {
          spacing: { before: 400, after: 200 },
          shading: { type: ShadingType.CLEAR, color: NAVY, fill: NAVY },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { bold: true, size: 26, color: MID, font: "Calibri" },
        paragraph: { spacing: { before: 300, after: 160 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { bold: true, size: 22, color: TEAL, font: "Calibri" },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
    ],
  },
  sections: [
    {
      // ── PAGE SETUP ──
      properties: {
        page: {
          size: { width: twip(8.27), height: twip(11.69) }, // A4
          margin: { top: twip(1.0), bottom: twip(1.0), left: twip(1.2), right: twip(1.0) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "BESS Optimizer — Plano de Negócio 2026", size: 16, color: MUTED, font: "Calibri" }),
                new TextRun({ text: "    |    Confidencial", size: 16, color: WARN, font: "Calibri" }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "© 2026 BESS Optimizer — Documento confidencial para investidores    ", size: 16, color: MUTED, font: "Calibri" }),
                new TextRun({ children: [new PageNumberElement()] , size: 16, color: MUTED, font: "Calibri" }),
              ],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: MID } },
            }),
          ],
        }),
      },

      children: [

        // ──────────────────────────────────────────────────────
        // CAPA
        // ──────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: "", size: 20 })],
          spacing: { before: 1200, after: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "BESS OPTIMIZER", bold: true, size: 64, color: NAVY, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Portugal & Ibéria", bold: true, size: 40, color: TEAL, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Otimização de Armazenamento de Energia com IA", size: 24, color: MID, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Plano de Negócio — 2026", size: 22, color: MUTED, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "CONFIDENCIAL — Apenas para Investidores", bold: true, size: 20, color: WARN, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.CLEAR, color: "FFF3CD", fill: "FFF3CD" },
          spacing: { before: 0, after: 200 },
          indent: { left: dxa(3), right: dxa(3) },
        }),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 1. SUMÁRIO EXECUTIVO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "1. Sumário Executivo", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("O Negócio"),
        body("A BESS Optimizer é uma empresa portuguesa de software e serviços energéticos que gere baterias de armazenamento de energia (BESS) de terceiros utilizando algoritmos de Inteligência Artificial, maximizando as suas receitas em múltiplos mercados elétricos ibéricos em simultâneo."),
        new Paragraph({
          children: [
            new TextRun({ text: "Não compramos baterias. ", bold: true, size: 20, color: TEAL, font: "Calibri" }),
            new TextRun({ text: "Gerimos baterias que já existem — e capturamos uma percentagem das receitas geradas.", size: 20, color: DARK_TEXT, font: "Calibri" }),
          ],
          spacing: { after: 200 },
        }),

        heading2("A Oportunidade"),
        bullet("O quadro regulatório para agregadores independentes abriu em fevereiro de 2025 (primeira autorização histórica)"),
        bullet("Concurso de 750 MVA de armazenamento standalone para 2026, impulsionado por €400M de investimento público pós-blackout ibérico"),
        bullet("A EDP vai instalar 180 MW de baterias em Carregado (BigBATT, operacional em março de 2027)"),
        bullet("Não existe nenhuma empresa nativa portuguesa neste mercado — os únicos operadores são estrangeiros (IGNIS espanhola, Entrix alemã)"),
        bullet("O mercado global VPP cresce para €39–46 mil milhões em 2035 (CAGR 21–25%)"),

        heading2("O Modelo"),
        body("Cobramos 10–25% das receitas geradas pelo algoritmo para o proprietário da bateria — sem custo fixo, sem risco para o cliente. Escala para modelo Tolling à medida que construímos track record."),

        heading2("Benchmark de Mercado"),
        note("A empresa alemã enspired (verificado por KPMG) gera em média €166.753/MW/ano em 2025. Estimativa conservadora para Ibéria: €80.000–€120.000/MW/ano. Com 15% de revenue share, a nossa receita: €12.000–€18.000/MW/ano."),

        heading2("Pedido de Investimento"),
        makeTable(
          ["Fase", "Montante", "Objetivo"],
          [
            ["Pré-seed (imediato)", "€350.000–€400.000", "Equipa + processo regulatório + algoritmo MVP"],
            ["Seed (12 meses)", "€900.000–€1.200.000", "Go-live no primeiro ativo + escalar 50–100 MW"],
          ],
          [2800, 2600, 3600]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("Projeções Financeiras (conservadoras)"),
        makeTable(
          ["Ano", "MW sob Gestão", "Receita", "EBITDA"],
          [
            ["2026", "0 (shadow trading)", "€0–€30K", "-€285K a -€315K"],
            ["2027", "42 MW (avg 24 MW)", "€346K", "-€177K"],
            ["2028", "170 MW (avg 108 MW)", "€1,6M", "+€777K"],
          ],
          [1500, 2500, 2000, 3000]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 2. VISÃO E MISSÃO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "2. Visão, Missão e Proposta de Valor", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("Visão"),
        body("Ser o operador de referência de ativos de armazenamento de energia em Portugal e Ibéria — a empresa que os proprietários de baterias escolhem para maximizar as suas receitas de mercado."),

        heading2("Missão"),
        body("Tornar cada bateria instalada em Portugal economicamente ótima, combinando inteligência artificial com profundo conhecimento dos mercados energéticos ibéricos."),

        heading2("Proposta de Valor — Para os Proprietários de BESS"),
        bullet("Sem investimento inicial: modelo de revenue share alinhado com resultados"),
        bullet("Mais receita do que conseguiriam sozinhos: algoritmo opera em 3 camadas de mercado em simultâneo"),
        bullet("Sem risco tecnológico: gerimos toda a integração SCADA, certificações regulatórias e operação 24/7"),
        bullet("Transparência total: dashboard em tempo real com performance, receitas e estado dos ativos"),
        bullet("Proteção do ativo: gestão ativa do estado de carga, degradação e ciclos"),

        heading2("Diferenciação Competitiva"),
        makeTable(
          ["Dimensão", "Nós", "IGNIS (ES)", "Entrix (DE)"],
          [
            ["Origem", "Portugal", "Espanha", "Alemanha"],
            ["Presença local", "Sim — Lisboa", "Remota", "Remota"],
            ["Foco em PT", "Primário", "Secundário", "Secundário"],
            ["Conhecimento REN", "Profundo", "Limitado", "Limitado"],
            ["Velocidade regulatória PT", "Máxima", "Dependente", "Dependente"],
          ],
          [2500, 2000, 2000, 2500]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 3. ANÁLISE DE MERCADO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "3. Análise de Mercado", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("3.1 TAM — Total Addressable Market"),
        makeTable(
          ["Métrica", "Valor"],
          [
            ["VPP Global 2025", "€6,3–7,7 mil milhões"],
            ["VPP Global 2035", "€39–46 mil milhões"],
            ["CAGR 2025–2035", "21–25%"],
            ["Europa VPP 2025", "€1,5–2,6 mil milhões"],
            ["BESS europeu sob contratos de flexibilidade (2025)", "~24 GWh (3× vs 2024)"],
          ],
          [4000, 5000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("3.2 SAM — Pipeline de Armazenamento em Portugal"),
        makeTable(
          ["Projeto", "Empresa", "Capacidade", "Estado", "Ano"],
          [
            ["Casal da Cortiça", "Infraventus", "12 MVA / 24 MWh", "Operacional", "Jun 2025"],
            ["Leilão 750 MVA", "Vários", "750 MVA standalone", "Concurso 2026", "2027–28"],
            ["BigBATT", "EDP", "180 MW / 360 MWh", "Em construção", "Mar 2027"],
            ["Sophia site", "Lightsource bp", "300 MWh", "Planeado", "2027"],
            ["Pego Hybrid", "Endesa", "168,6 MW / 337 MWh", "Planeado", "2027"],
            ["PRR — Akuo", "Akuo", "80 MW", "Pipeline", "2027"],
            ["PRR — Iberdrola", "Iberdrola", "80 MW", "Pipeline", "2027"],
            ["PRR — Galp", "Galp", "55 MW", "Pipeline", "2026"],
            ["Meta PNEC", "—", "1.500 MW", "Meta nacional", "2030"],
          ],
          [2000, 1600, 2000, 1700, 1700]
        ),
        new Paragraph({ spacing: { before: 160 } }),
        body("Pipeline português total visível (2026–2028): > 1.400 MW"),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("3.3 SOM — Mercado Acessível em 3 Anos"),
        bullet("Objetivo realista (2028): 150–200 MW sob gestão"),
        bullet("Receita própria projetada: €1,5M–€2,5M/ano"),
        bullet("Lógica: 10–15 ativos de 10–20 MW cada"),
        bullet("Portugal tem ~15–20 promotores/donos de BESS identificáveis; objetivo: converter 5–8 em clientes"),

        heading2("3.4 Dinâmicas de Mercado Favoráveis"),
        bullet("Intervalos 15 minutos (Set 2025): quadruplica as oportunidades de arbitragem intraday"),
        bullet("Crescimento dos ancilares: custo subiu 162% em 2024 (€7,66/MWh vs €2,92/MWh) — maior remuneração para fornecedores"),
        bullet("mFRR novo: adoptado em março 2024, integrado na plataforma europeia MARI em novembro 2024 — menos competição"),
        bullet("€400M de investimento público pós-blackout ibérico — momentum político"),
        bullet("Curtailments crescentes de solar — baterias que absorvem excedentes são remuneradas"),

        heading2("3.5 Concorrência"),
        makeTable(
          ["Empresa", "HQ", "Portfolio", "Presença PT"],
          [
            ["enspired", "Áustria", ">1,6 GW", "Espanha (via Nexus) — PT não confirmado"],
            ["Entrix", "Alemanha", "Pipeline >7 GW (via Kyon)", "Anunciou PT Out 2025 — remoto"],
            ["Next Kraftwerke (RWE)", "Alemanha", "Maior VPP Europa", "Não confirmado PT"],
            ["IGNIS Energía", "Espanha", "—", "1.º agregador independente PT (Fev 2025)"],
            ["Capalo AI", "Finlândia", ">200 MW / >1 GWh", "Báltico apenas"],
            ["[Esta empresa]", "Portugal", "0 → 150+ MW", "Lisboa — nativo"],
          ],
          [2000, 1500, 2500, 3000]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 4. TECNOLOGIA
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "4. Tecnologia — Arquitetura e Stack", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("4.1 Visão Geral"),
        body("O sistema opera como um cérebro central de otimização com três camadas principais:"),
        bullet("Camada 1 — Ingestão de Dados: OMIE, REN/REE, meteorologia, BMS da bateria"),
        bullet("Camada 2 — Motor de Previsão: XGBoost + Transformer para previsão de preços 24–72h"),
        bullet("Camada 3 — Motor de Decisão (Deep Reinforcement Learning): política ótima de carga/descarga"),
        bullet("Camada 4 — Execução: licitação OMIE automática + SCADA → BMS em <100ms"),

        heading2("4.2 Motor de Previsão de Preços"),
        body("Arquitectura: Ensemble XGBoost + Temporal Fusion Transformer (TFT)"),
        body("Inputs: histórico OMIE, produção solar/eólica, meteorologia, hora, sazonalidade, preços gás/CO₂"),
        body("Output: distribuição probabilística de preços para as próximas 24–72 horas (intervalos 15 min)"),
        body("Performance target: MAE < €5/MWh para day-ahead ibérico"),
        body("Ferramentas: Python · XGBoost · PyTorch · Darts"),

        heading2("4.3 Motor de Decisão — Deep Reinforcement Learning"),
        body("Por que DRL e não MILP clássico? O DRL aprende uma política ótima através de milhões de simulações, lidando nativamente com incerteza e complexidade multi-mercado. Estudos publicados mostram +58% de melhoria vs MILP em arbitragem de energia."),
        body("Algoritmo: PPO (Proximal Policy Optimization) via Stable-Baselines3"),
        bullet("Estado (State): SoC da bateria, preços futuros previstos, hora, compromissos de mercado"),
        bullet("Ação (Action): % potência para carregar / descarregar / reservar para ancilares"),
        bullet("Recompensa: receita OMIE + receita ancilares — penalidade degradação — penalidade não-conformidade"),
        bullet("Treino: simulações em 2+ anos de dados históricos ibéricos; reteino semanal"),

        heading2("4.4 Integração SCADA e Protocolos Industriais"),
        makeTable(
          ["Protocolo", "Uso", "Fabricantes"],
          [
            ["IEC 61850", "BESS de grade utility", "CATL, BYD, Saft, ABB"],
            ["MODBUS TCP", "Sistemas mais simples / legado", "SMA, Fronius, Victron"],
            ["IEC 60870-5-104", "Telecontrol para REN", "Interface SCADA REN"],
            ["OpenDNP3", "Protocolo americano", "Schneider Electric"],
          ],
          [2000, 3000, 4000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("4.5 Stack Tecnológico Completo"),
        makeTable(
          ["Camada", "Tecnologia", "Justificação"],
          [
            ["Linguagem", "Python 3.12", "Standard em ML/energia"],
            ["RL", "Stable-Baselines3 · PPO", "Biblioteca RL standard (investigação + indústria)"],
            ["Forecasting", "XGBoost · PyTorch · Darts", "Ensemble robusto para séries temporais energéticas"],
            ["Dados mercado", "OMIEData · entsoe-py", "Packages open-source para dados ibéricos"],
            ["Time-series DB", "InfluxDB", "Standard indústria para métricas em tempo real"],
            ["Streaming", "Apache Kafka", "Dados de mercado e telemetria em tempo real"],
            ["SCADA/BMS", "pyiec61850 · pymodbus", "Libraries Python para protocolos industriais"],
            ["Cloud", "AWS (EC2 + S3 + RDS)", "Infra escalável com presença em Lisboa"],
            ["Monitoring", "Grafana + InfluxDB", "Dashboards operacionais 24/7"],
            ["Alertas", "PagerDuty + Telegram", "Alertas críticos para equipa de turno"],
            ["Backend API", "FastAPI (Python)", "API interna e dashboard cliente"],
            ["Dashboard", "React + TypeScript", "Interface cliente — performance e relatórios"],
            ["CI/CD", "GitHub Actions", "Deploy automático e testes"],
          ],
          [2000, 2500, 4500]
        ),

        heading2("4.6 Roadmap Técnico — 12 Meses"),
        heading3("Fase 0 — Meses 1–2: Fundação de Dados"),
        bullet("Setup infraestrutura cloud (AWS)"),
        bullet("Pipeline OMIE histórico + live via OMIEData"),
        bullet("Base de dados InfluxDB + dashboards internos"),
        heading3("Fase 1 — Meses 3–5: Algoritmo Central"),
        bullet("Modelo XGBoost de previsão day-ahead (MAE target <€6/MWh)"),
        bullet("Ambiente de simulação Gymnasium com dados ibéricos 2022–2025"),
        bullet("Treino inicial do agente PPO + framework de backtesting"),
        heading3("Fase 2 — Meses 6–8: Integração com Ativo Real"),
        bullet("Conector IEC 61850 para BMS do ativo piloto (Infraventus)"),
        bullet("Shadow trading ao vivo — sistema operacional em paralelo"),
        bullet("Dashboard de performance para cliente (versão alpha)"),
        heading3("Fase 3 — Meses 9–12: Go-Live"),
        bullet("Primeiro despacho live no mercado day-ahead OMIE"),
        bullet("Qualificação FCR + aFRR com REN"),
        bullet("Monitorização 24/7 operacional (Grafana + PagerDuty)"),
        bullet("Integração de segundo ativo"),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 5. MODELO DE NEGÓCIO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "5. Modelo de Negócio e Unit Economics", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("5.1 Estruturas Comerciais"),
        makeTable(
          ["Modelo", "Fee", "Risco", "Fase"],
          [
            ["Revenue Share", "10–25% das receitas", "Dono do ativo assume risco de mercado", "Arranque (0–24 meses)"],
            ["Tolling", "Toll fixo ao dono + toda a receita para nós", "Otimizador assume todo o risco/upside", "Escala (24–48 meses)"],
            ["Floor Price", "Garantia mínima + partilha do excedente", "Equilibrado", "Clientes com financiamento bancário"],
            ["SaaS", "Licença anual €100K–€500K", "Zero risco de trading", "Futuro (36+ meses)"],
          ],
          [1800, 2500, 2500, 2200]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("5.2 Unit Economics (Revenue Share, Base)"),
        makeTable(
          ["Fonte de Receita", "Revenue/MW/ano", "Confiança"],
          [
            ["Arbitragem spot (OMIE)", "€30.000–€50.000", "Média"],
            ["FCR", "€15.000–€25.000", "Baixa (sem dados PT verificados)"],
            ["aFRR / mFRR", "€15.000–€30.000", "Baixa (produto novo em PT)"],
            ["Total estimado para o ativo", "€60.000–€105.000", "Conservador vs enspired €166K (DE)"],
          ],
          [3000, 2500, 3500]
        ),
        new Paragraph({ spacing: { before: 120 } }),
        makeTable(
          ["Cenário", "Revenue/MW/ano para nós (15%)", "Custo marginal/MW/ano", "Margem bruta"],
          [
            ["Pessimista (€60K × 15%)", "€9.000", "€11.000", "-€2.000 (1.º ano)"],
            ["Base (€85K × 15%)", "€12.750", "€9.000", "€3.750 (29%)"],
            ["Otimista (€105K × 15%)", "€15.750", "€7.000", "€8.750 (56%)"],
          ],
          [3000, 2500, 2500, 2000]
        ),
        warn_box("A perda no cenário pessimista no 1.º ano de cada ativo é recuperada nos seguintes (custo de integração é one-time). Contratos de 3+ anos são sempre positivos em todos os cenários."),

        heading2("5.3 Análise de Breakeven"),
        bullet("Equipa 4 FTE (overheads ~€350K/ano) → breakeven a ~28 MW"),
        bullet("Equipa 6 FTE (overheads ~€480K/ano) → breakeven a ~38 MW"),
        bullet("Equipa 8 FTE (overheads ~€650K/ano) → breakeven a ~51 MW"),
        note("Com equipa enxuta de 4–5 pessoas, o breakeven operacional é atingível com 30–40 MW — equivalente a 3–4 ativos de 10 MW."),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 6. GO-TO-MARKET
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "6. Go-to-Market — Primeiros Clientes e Pipeline", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("6.1 Primeiro Cliente Target — Infraventus (Casal da Cortiça)"),
        makeTable(
          ["Atributo", "Detalhe"],
          [
            ["Ativo", "12 MVA / 24 MWh — standalone merchant"],
            ["Estado", "Operacional desde junho 2025 — único standalone merchant de grande escala em Portugal"],
            ["Urgência", "Alta — já a participar no mercado; provavelmente a deixar receita na mesa"],
            ["Acesso", "Via Macedo Vitorino (assessoraram o projeto) ou LinkedIn"],
            ["Proposta", "Revenue share sobre melhoria demonstrada em shadow trading de 60 dias"],
            ["Potencial", "12 MW × €12.750 = ~€153.000/ano de receita para nós"],
          ],
          [2500, 6500]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("6.2 Pipeline de Clientes"),
        bullet("Tier 1 (2026): Infraventus + outros proprietários de BESS standalone operacionais"),
        bullet("Tier 2 (2027): Winners do leilão 750 MVA — estes projetos precisarão de otimizador desde o dia 1"),
        bullet("Tier 3 (2027+): EDP BigBATT (180 MW), Galp, Iberdrola PT, Akuo"),

        heading2("6.3 Estratégia de Vendas — Shadow Trading como Proof"),
        body("Antes de ter qualquer cliente, usamos dados históricos OMIE para fazer shadow trading retroativo:"),
        bullet("Simular performance histórica do ativo do cliente com o nosso algoritmo"),
        bullet("Comparar receita simulada vs receita real (ou benchmark de mercado)"),
        bullet("Apresentar: \"Com o nosso algoritmo, o seu ativo teria gerado €X a mais nos últimos 6 meses\""),
        bullet("Propor: 60 dias de shadow trading ao vivo sem compromisso, sem custos"),
        body("Este approach elimina o risco percebido para o cliente e é o argumento de venda mais poderoso disponível."),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 7. REGULATÓRIO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "7. Processo Regulatório — Passo a Passo", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        warn_box("O processo regulatório é o caminho crítico do negócio. Sem concluir todos os passos (9–15 meses), não é possível fazer live trading. Deve começar no Mês 1."),

        heading2("Timeline Regulatória"),
        makeTable(
          ["Passo", "Entidade", "Duração", "Custo estimado"],
          [
            ["1. Constituição empresa + NIF + CAE", "Conservatória + AT", "2–4 semanas", "€500–€2.000"],
            ["2. Registo DGEG (comercializador)", "DGEG — dgeg.gov.pt", "2–4 meses", "€5.000–€15.000"],
            ["3. Registo ERSE (agregador AGR)", "ERSE — erse.pt", "1–3 meses (após DGEG)", "€5.000–€10.000"],
            ["4. Registo OMIE (agente de mercado)", "OMIE — omie.es", "1–2 meses + garantia", "€2.000–€5.000 + garantia"],
            ["5. Qualificação REN (FCR/aFRR/mFRR)", "REN — mercado@ren.pt", "3–6 meses", "€10.000–€25.000"],
            ["TOTAL", "—", "9–15 meses", "€25.000–€60.000 (legal fees)"],
          ],
          [3000, 2200, 1800, 2000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("Contactos Regulatórios Chave"),
        makeTable(
          ["Entidade", "Propósito", "Contacto"],
          [
            ["DGEG", "Registo comercializador de mercado", "info@dgeg.gov.pt | +351 210 924 600"],
            ["ERSE", "Registo agregador independente (código AGR)", "erse@erse.pt | +351 217 892 700"],
            ["OMIE", "Registo agente de mercado ibérico", "info@omie.es | +34 915 228 200"],
            ["REN — Mercados", "Qualificação técnica FCR/aFRR/mFRR", "mercado@ren.pt | +351 210 013 200"],
          ],
          [2000, 3000, 4000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("Advogados de Energia Recomendados"),
        makeTable(
          ["Escritório", "Especialização", "Porquê"],
          [
            ["Macedo Vitorino", "DL 15/2022, storage, ERSE — Chambers Band 1", "Assessoraram Casal da Cortiça; expertise mais específico em storage PT"],
            ["PLMJ", "DL 15/2022, aggregators — Legal 500 Tier 1", "Experiência em demand aggregation e projetos EDP"],
            ["GA_P", "Regulação ERSE — Legal 500 Tier 1", "Confirmado \"deep knowledge of energy sector\""],
            ["Cuatrecasas", "Cross-border Ibéria", "Ideal para expansão simultânea PT + ES"],
          ],
          [2000, 3200, 3800]
        ),
        note("Referência verificada: IGNIS Energía SL registou-se como comercializador DGEG em 13 de março de 2023 (posição 130 na lista pública). Código ERSE: AGR0265EE."),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 8. EQUIPA
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "8. Equipa e Estrutura Organizacional", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("8.1 Equipa Mínima Viável — Ano 1"),
        makeTable(
          ["Papel", "Perfil", "Salário Bruto PT", "Início"],
          [
            ["CEO / Business Dev", "Fundador — rede setorial, regulatório, BD", "Diferido / mínimo €36K", "Mês 1"],
            ["CTO / ML Engineer", "Sénior, 5+ anos RL/forecasting", "€65.000–€80.000", "Mês 1"],
            ["Energy Markets Specialist", "Ex-REN, ex-EDP — mercados ibéricos", "€55.000–€75.000", "Mês 4–6"],
            ["Full-Stack Developer", "Python/FastAPI + React — 3+ anos", "€45.000–€60.000", "Mês 6–8"],
          ],
          [2500, 2800, 2200, 1500]
        ),
        note("TSU patronal: +23,75% sobre salário bruto. Custo total Ano 1 estimado: €220.000."),

        heading2("8.2 Onde Recrutar"),
        bullet("CTO/ML: IST (Lisboa), FEUP (Porto), LinkedIn 'machine learning + energy + Portugal', PyData Lisboa"),
        bullet("Energy Markets Specialist: ex-REN (departamento mercados), ex-EDP Trading, ex-Galp Energy Solutions"),
        bullet("Developer: ItJobs.pt, LinkedIn, feiras IST/FEUP"),
        bullet("Salários verificados (Damia Group 2025): ML Engineer sénior €60K–€84K/ano"),

        heading2("8.3 Advisors Estratégicos"),
        body("Complementar a equipa com 2–3 advisors (remuneração: opções sobre capital, sem salário):"),
        bullet("Regulatory advisor: ex-diretor DGEG ou ERSE — acesso e credibilidade regulatória"),
        bullet("REN insider: ex-responsável de mercados REN — acelera qualificação técnica"),
        bullet("Energy investor: VC ou family office com portfolio energético — deal flow de promotores BESS"),

        heading2("8.4 Plano de Crescimento"),
        makeTable(
          ["Ano", "Headcount", "Novos Papéis"],
          [
            ["2026", "4 FTE", "CEO + CTO + Energy Specialist + Developer"],
            ["2027", "7 FTE", "+ Data Engineer + Customer Success + ML Engineer Jr"],
            ["2028", "11 FTE", "+ Operations Lead + Sales Manager + 2× ML Engineers"],
          ],
          [1500, 1500, 6000]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 9. ROADMAP
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "9. Roadmap de Implementação — Mês a Mês", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        makeTable(
          ["Período", "Prioridades", "Marcos"],
          [
            ["Meses 1–2\n(Fundação)", "Constituir empresa + advogados\nSubmissão DGEG\nOnboarding CTO\nPipeline OMIE histórico", "Empresa legal. Processo regulatório iniciado."],
            ["Meses 3–4\n(Algoritmo)", "Modelo de forecasting XGBoost\nAmbiente simulação Gymnasium\nFollow-up DGEG\nShadow trading retroativo Infraventus", "MAE <€8/MWh. Pitch inicial a Infraventus."],
            ["Meses 5–6\n(Primeiro cliente)", "DGEG aprovado → Submissão ERSE\nOnboarding Energy Specialist\nAgente DRL com performance consistente\nNDA + acesso dados Infraventus", "Shadow trading ao vivo acordado com 1.º cliente."],
            ["Meses 7–8\n(Integração)", "Conector IEC 61850 para Infraventus\nOnboarding Developer\nShadow trading 60 dias ao vivo\nPreparação OMIE + pré-qualificação REN", "Dados reais do BMS a chegar. 30 dias shadow trading."],
            ["Meses 9–10\n(Go-Live)", "OMIE aprovado → Primeiras licitações\nGo-live day-ahead com Infraventus\nTestes FCR com REN\nMonitorização 24/7 operacional", "Primeiras receitas reais. Track record iniciado."],
            ["Meses 11–12\n(Operação plena)", "FCR + aFRR live\nContrato assinado com 2.º cliente\nSeed Round em negociação\nDashboard cliente v2", "Receita recorrente ~€10–15K/mês. Seed Round em curso."],
            ["Meses 13–18\n(Escala)", "Fechar Seed Round\nQualificação mFRR\n2.º e 3.º ativos live\nInício expansão Espanha", "40+ MW sob gestão. Seed Round fechado."],
          ],
          [2000, 3500, 3500]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 10. FINANCEIRO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "10. Projeções Financeiras", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        warn_box("Nota metodológica: projeções baseadas em benchmarks verificados (enspired/KPMG, dados ERSE 2024) com desconto conservador de 40% para o mercado ibérico. Revenue/MW/ano é a variável com maior incerteza (±40%)."),

        heading2("10.1 P&L — 3 Anos"),
        makeTable(
          ["Item", "2026", "2027", "2028"],
          [
            ["MW sob gestão (fim de ano)", "12 MW", "42 MW", "170 MW"],
            ["MW médio no ano", "~3 MW", "24 MW", "108 MW"],
            ["Receita de trading", "€0–€30K", "€306K", "€1.377K"],
            ["Integrações one-time", "€0", "€40K", "€100K"],
            ["Contratos Tolling", "€0", "€0", "€150K"],
            ["RECEITA TOTAL", "€0–€30K", "€346K", "€1.627K"],
            ["Pessoal", "€220K", "€420K", "€680K"],
            ["Legal / Regulatório", "€45K", "€20K", "€30K"],
            ["Cloud e infra", "€15K", "€30K", "€60K"],
            ["Escritório + viagens", "€22K", "€38K", "€55K"],
            ["Outros", "€13K", "€15K", "€25K"],
            ["TOTAL CUSTOS", "€315K", "€523K", "€850K"],
            ["EBITDA", "-€285K a -€315K", "-€177K", "+€777K"],
          ],
          [3000, 2000, 2000, 2000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("10.2 Cash Flow Mensal — Ano 1"),
        makeTable(
          ["Mês", "Entrada", "Saída", "Saldo Mês", "Saldo Acumulado"],
          [
            ["Janeiro", "€350.000 (pré-seed)", "€20.000", "+€330.000", "€330.000"],
            ["Fevereiro", "€0", "€22.000", "-€22.000", "€308.000"],
            ["Março", "€0", "€22.000", "-€22.000", "€286.000"],
            ["Abril", "€0", "€25.000", "-€25.000", "€261.000"],
            ["Maio", "€0", "€28.000", "-€28.000", "€233.000"],
            ["Junho", "€0", "€30.000", "-€30.000", "€203.000"],
            ["Julho", "€0", "€33.000", "-€33.000", "€170.000"],
            ["Agosto", "€0", "€33.000", "-€33.000", "€137.000"],
            ["Setembro", "€5.000", "€33.000", "-€28.000", "€109.000"],
            ["Outubro", "€8.000", "€33.000", "-€25.000", "€84.000"],
            ["Novembro", "€10.000", "€33.000", "-€23.000", "€61.000"],
            ["Dezembro", "€12.000", "€33.000", "-€21.000", "€40.000"],
          ],
          [1500, 2000, 1800, 2000, 2700]
        ),
        note("Saldo de €40K em dezembro exige que a Seed Round esteja em negociação avançada — momento ideal, com 3 meses de receita real como proof."),

        heading2("10.3 Análise de Sensibilidade"),
        makeTable(
          ["Cenário", "Revenue/MW", "Breakeven (MW)", "EBITDA Ano 3"],
          [
            ["Pessimista (-40%)", "€7.650/MW/ano", "~75 MW", "+€200K"],
            ["Base", "€12.750/MW/ano", "~38 MW (6 FTE)", "+€777K"],
            ["Otimista (+30%)", "€16.575/MW/ano", "~28 MW", "+€1.400K"],
          ],
          [2000, 2500, 2500, 2000]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 11. INVESTIMENTO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "11. Necessidade de Investimento e Use of Funds", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("11.1 Pré-Seed — €350.000–€400.000"),
        makeTable(
          ["Categoria", "Valor", "Detalhe"],
          [
            ["Pessoal (CEO + CTO — 12 meses)", "€155.000", "CEO mínimo + CTO €72K gross + TSU"],
            ["Energy Specialist (8 meses)", "€55.000", "Desde mês 5"],
            ["Advogados de energia (Ano 1)", "€50.000", "DGEG + ERSE + OMIE + REN"],
            ["Cloud e infraestrutura", "€15.000", "AWS — 12 meses"],
            ["Escritório + ops + viagens", "€22.000", "Cowork Lisboa + BD"],
            ["Buffer (20%)", "€59.000", "Imprevistos regulatórios"],
            ["TOTAL", "€356.000", "~€380K arredondado com buffer"],
          ],
          [3000, 1800, 4200]
        ),
        body("O que valida: processo DGEG/ERSE em curso · algoritmo MVP com backtesting · shadow trading ao vivo · receitas reais nos primeiros 3 meses de trading"),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("11.2 Seed Round — €900.000–€1.200.000"),
        makeTable(
          ["Categoria", "Valor", "Detalhe"],
          [
            ["Pessoal (7 FTE — 12 meses)", "€350.000", "Equipa completa crescida"],
            ["Garantias financeiras OMIE/REN", "€100.000–€200.000", "Colateral bloqueado — não é burn"],
            ["Expansão para Espanha (CNMC + REE)", "€50.000", "Registo + adaptação regulatória"],
            ["Contratação Data Eng + CS", "€80.000", "2 novos FTE no Ano 2"],
            ["Cloud, BD, infra escalada", "€50.000", "Suporte 40+ MW"],
            ["Operações, BD, marketing", "€70.000", "BD Ibéria + conteúdo de mercado"],
            ["Buffer", "€100.000", "20% segurança"],
            ["TOTAL", "€800.000–€900.000", "Seed arredondado €900K–€1,2M"],
          ],
          [3000, 2200, 3800]
        ),
        warn_box("As garantias financeiras OMIE/REN (€100K–€200K) são colateral bloqueado, não gasto operacional. Com linha de garantia bancária, o burn operacional real é reduzido proporcionalmente."),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 12. RISCO
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "12. Gestão de Risco", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("12.1 Matriz de Riscos"),
        makeTable(
          ["Risco", "Prob.", "Impacto", "Mitigação"],
          [
            ["Atraso regulatório >15 meses", "Média", "Alto", "Advogado sénior desde Mês 1; contacto proativo com DGEG/ERSE/REN"],
            ["1.º cliente não assina", "Média", "Alto", "Shadow trading como proof; pipeline de 3 targets simultâneos"],
            ["Revenue/MW 40% abaixo", "Média", "Médio", "Cenário pessimista ainda viável a 75 MW; expansão Espanha"],
            ["Algoritmo underperforma", "Baixa-Média", "Alto", "Shadow trading obrigatório 3+ meses; never go live sem validação"],
            ["Capital trading insuficiente", "Média", "Alto", "Linha de garantia bancária; volumes graduais"],
            ["Key person risk (CTO)", "Média", "Alto", "ESOP agressivo; documentação técnica desde início"],
            ["Concorrente nativo surge", "Baixa", "Médio", "Vantagem 9–15 meses; certificações são barreira real"],
          ],
          [2500, 1000, 1200, 4300]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("12.2 KPIs de Alerta Precoce"),
        makeTable(
          ["KPI", "Frequência", "Alerta (threshold)"],
          [
            ["Saldo de caixa", "Semanal", "< 3 meses de runway"],
            ["Revenue/MW real vs projetado", "Mensal", "< 70% do projetado"],
            ["Pipeline MW", "Mensal", "< 2× objetivo de final de ano"],
            ["Performance algoritmo (Sharpe ratio)", "Semanal", "< 0,8 (benchmark: 1,2+)"],
            ["Progresso regulatório", "Bi-semanal", "Atraso > 4 semanas vs timeline"],
            ["Uptime do sistema", "Diário", "< 99,5%"],
          ],
          [3000, 1800, 4200]
        ),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // 13. SAÍDA
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "13. Estratégia de Saída", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("13.1 Cenários de Exit"),
        makeTable(
          ["Cenário", "Compradores Prováveis", "Timeline", "Múltiplo Estimado"],
          [
            ["Aquisição por utility", "EDP, Galp, Endesa, Iberdrola", "3–5 anos", "5–10× receita / 15–25× EBITDA"],
            ["Fusão com comparável EU", "Capalo AI, enspired, Entrix", "3–4 anos", "Baseado em avaliação conjunta"],
            ["Série B+ como empresa independente", "VCs energia / infra", "5–7 anos", "Baseado em múltiplo de crescimento"],
          ],
          [2200, 2500, 1800, 2500]
        ),
        note("Estimativa de exit (Ano 4, receita €3M): Revenue múltiplo 7× = €21M. EBITDA múltiplo 20× (EBITDA €1,5M) = €30M."),

        heading2("13.2 O Que Maximiza o Valor de Saída"),
        bullet("Dados proprietários: histórico de licitações único — aumenta múltiplo"),
        bullet("Certificações regulatórias: intransferíveis — comprador poupa 12+ meses"),
        bullet("Contratos de longo prazo: visibilidade de receita 3–5 anos = múltiplo mais alto"),
        bullet("Portfolio diversificado: 10+ ativos = sem concentração de cliente"),
        bullet("Track record verificado: resultados auditados por terceiros (modelo enspired/KPMG)"),
        pageBreak(),

        // ──────────────────────────────────────────────────────
        // ANEXOS
        // ──────────────────────────────────────────────────────
        new Paragraph({ text: "14. Anexos", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),

        heading2("A. Benchmark enspired (KPMG Verified)"),
        makeTable(
          ["Período", "Revenue/MW", "Ciclos/dia", "Nota"],
          [
            ["2024 média", "€116.000/MW", "—", "Alemanha"],
            ["2025 média", "€166.753/MW", "1,06", "+43% YoY"],
            ["2025 top performers", "€224.955/MW", "—", "Top quartil"],
            ["Dezembro 2025", "€62.549/MW", "1,06", "Mês fraco (sazonalidade)"],
            ["Estimativa Ibéria (desconto 40%)", "€100.000–€133.000/MW", "—", "Estimativa de trabalho"],
          ],
          [2200, 2200, 1600, 3000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("B. Recursos Open-Source"),
        makeTable(
          ["Recurso", "Propósito"],
          [
            ["OMIEData (github.com/acruzgarcia/OMIEData)", "Dados OMIE históricos e live"],
            ["entsoe-py (github.com/EnergieID/entsoe-py)", "Dados ENTSO-E transparência"],
            ["Stable-Baselines3 (stable-baselines3.readthedocs.io)", "Algoritmos RL (PPO, SAC, etc.)"],
            ["Gymnasium (gymnasium.farama.org)", "Ambientes de simulação RL"],
            ["Darts (unit8co.github.io/darts)", "Time-series forecasting"],
            ["pymodbus (pymodbus.readthedocs.io)", "MODBUS TCP em Python"],
            ["pyiec61850 (libiec61850.com)", "IEC 61850 em Python/C"],
          ],
          [5000, 4000]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        heading2("C. Glossário"),
        makeTable(
          ["Termo", "Definição"],
          [
            ["BESS", "Battery Energy Storage System — Sistema de armazenamento de energia em bateria"],
            ["VPP", "Virtual Power Plant — Agregação de múltiplos ativos geridos como central virtual"],
            ["OMIE", "Operador del Mercado Ibérico de Energía — bolsa de eletricidade ibérica"],
            ["REN", "Redes Energéticas Nacionais — TSO (operador de rede de transporte) de Portugal"],
            ["FCR", "Frequency Containment Reserve — Reserva de contenção de frequência (resposta em segundos)"],
            ["aFRR", "Automatic Frequency Restoration Reserve — Reserva automática de restauração de frequência"],
            ["mFRR", "Manual Frequency Restoration Reserve — adoptado em Portugal em março 2024"],
            ["SoC", "State of Charge — Estado de carga da bateria (0–100%)"],
            ["DRL", "Deep Reinforcement Learning — Aprendizagem por reforço profunda"],
            ["SCADA", "Supervisory Control and Data Acquisition — Sistema de supervisão e controlo industrial"],
            ["DGEG", "Direção-Geral de Energia e Geologia — Autoridade reguladora de energia (Portugal)"],
            ["ERSE", "Entidade Reguladora dos Serviços Energéticos — Regulador dos mercados (Portugal)"],
            ["Revenue Share", "Modelo em que o otimizador cobra uma % das receitas geradas"],
            ["Tolling", "Modelo em que o otimizador paga taxa fixa ao dono e retém toda a receita"],
            ["Shadow Trading", "Operação simulada em paralelo — sem execução de ordens reais"],
            ["MAE", "Mean Absolute Error — Métrica de avaliação de modelos de previsão"],
            ["PPO", "Proximal Policy Optimization — Algoritmo RL para políticas contínuas"],
          ],
          [2000, 7000]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          children: [muted("Documento preparado com base em research de mercado realizado em março de 2026.")],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [muted("Fontes: ERSE, DGEG, OMIE, enspired (KPMG verified), Macedo Vitorino, ESS News, Legal 500, Damia Group 2025.")],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [muted("Estimativas financeiras são projeções de trabalho — incerteza significativa na variável revenue/MW/ano.")],
          alignment: AlignmentType.CENTER,
        }),
      ],
    },
  ],
});

// ─── SAVE ────────────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("d:\\Claude - PA\\projects\\bess-pitch\\BESS-Optimizer-Plano-de-Negocio-2026.docx", buffer);
  console.log("Docx saved.");
}).catch(err => { console.error(err); process.exit(1); });
