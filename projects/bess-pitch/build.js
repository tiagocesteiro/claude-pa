const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

// ─── PALETTE ────────────────────────────────────────────────────────────────
const C = {
  dark:    "0D1B2A",
  mid:     "1B3A5C",
  accent:  "00C9A7",
  light:   "F0F4F8",
  white:   "FFFFFF",
  muted:   "8BA3B8",
  warn:    "F5A623",
  green:   "27AE60",
  code:    "0A2540",  // dark blue for code blocks
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
function addDarkBg(s) { s.addShape(pptx.ShapeType.rect, { x:0, y:0, w:"100%", h:"100%", fill:{color:C.dark} }); }
function addLightBg(s){ s.addShape(pptx.ShapeType.rect, { x:0, y:0, w:"100%", h:"100%", fill:{color:C.light} }); }
function addAccentBar(s, y=0.55){ s.addShape(pptx.ShapeType.rect, { x:0.5, y, w:0.06, h:0.5, fill:{color:C.accent} }); }
function sTitle(s, txt, x=0.7, y=0.45, w=11, col=C.white){ s.addText(txt, {x,y,w,h:0.6,fontSize:32,bold:true,color:col,fontFace:"Calibri"}); }
function sSub(s, txt, x=0.7, y=1.1, w=11, col=C.muted){ s.addText(txt, {x,y,w,h:0.4,fontSize:14,color:col,fontFace:"Calibri"}); }
function footer(s, dark=true){
  s.addShape(pptx.ShapeType.rect, {x:0,y:7.15,w:"100%",h:0.02,fill:{color: dark?"1B3A5C":"C8D8E8"}});
  s.addText("Confidencial — Apenas para Investidores", {x:0.5,y:7.2,w:8,h:0.25,fontSize:9,color:C.muted,fontFace:"Calibri"});
  s.addText("© 2026", {x:12.3,y:7.2,w:0.8,h:0.25,fontSize:9,color:C.muted,fontFace:"Calibri",align:"right"});
}

// ─── SLIDE 1: CAPA ──────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  s.addShape(pptx.ShapeType.rect, {x:0,y:0,w:0.35,h:"100%",fill:{color:C.accent}});
  s.addText("BESS Optimizer", {x:1.2,y:1.8,w:11,h:1.1,fontSize:54,bold:true,color:C.white,fontFace:"Calibri"});
  s.addText("Portugal & Ibéria", {x:1.2,y:2.9,w:8,h:0.6,fontSize:28,color:C.accent,fontFace:"Calibri"});
  s.addText("Otimização de Armazenamento de Energia com IA\nApresentação a Investidores — 2026", {x:1.2,y:3.7,w:9,h:0.9,fontSize:16,color:C.muted,fontFace:"Calibri",lineSpacingMultiple:1.4});
  s.addShape(pptx.ShapeType.rect, {x:9.5,y:3.3,w:3.3,h:1.8,fill:{color:C.mid},line:{color:C.accent,width:1.5}});
  s.addText("€39B", {x:9.5,y:3.5,w:3.3,h:0.7,fontSize:36,bold:true,color:C.accent,align:"center",fontFace:"Calibri"});
  s.addText("Mercado VPP Global\nem 2035", {x:9.5,y:4.2,w:3.3,h:0.7,fontSize:13,color:C.muted,align:"center",fontFace:"Calibri"});
  footer(s, true);
  s.addNotes(`Bem-vindos. Hoje vou apresentar uma oportunidade de negócio concreta no mercado de energia ibérico.

O tema é simples: existem cada vez mais baterias a ser instaladas em Portugal e Espanha — e os seus proprietários não sabem como maximizar as receitas. Nós resolvemos esse problema com inteligência artificial.

Pontos a sublinhar:
- O mercado global de VPP vale €39 mil milhões em 2035
- Portugal acabou de abrir o quadro regulatório para este tipo de negócio
- Ainda não existe nenhuma empresa portuguesa nativa neste espaço

Objetivo desta reunião: explicar o modelo, a tecnologia, e o que precisamos para arrancar.`);
}

// ─── SLIDE 2: O PROBLEMA ────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  addAccentBar(s);
  sTitle(s, "O Problema: Baterias a Perder Dinheiro");
  sSub(s, "Os proprietários de baterias em Portugal não têm como otimizar as suas receitas sozinhos");

  const boxes = [
    { icon: "⚡", title: "Mercados Complexos", body: "Arbitragem no mercado grossista (OMIE), serviços de equilíbrio (REN) e mecanismos de capacidade — em simultâneo." },
    { icon: "🤖", title: "IA Obrigatória", body: "Decisões de carga/descarga em tempo real exigem algoritmos de ML que nenhum operador local tem." },
    { icon: "📋", title: "Regulação Labiríntica", body: "Certificação técnica pela REN + registo DGEG/ERSE + participação no OMIE. Barreiras altas para novos operadores." },
    { icon: "🏁", title: "Mercado Sem Jogador Nativo", body: "Até março de 2026, nenhuma empresa portuguesa detém licença de agregador independente em Portugal." },
  ];
  boxes.forEach((b, i) => {
    const x = 0.5 + (i%2)*6.4, y = 1.7 + Math.floor(i/2)*2.5;
    s.addShape(pptx.ShapeType.rect, {x,y,w:5.9,h:2.1,fill:{color:C.mid},rectRadius:0.1});
    s.addText(b.icon+"  "+b.title, {x:x+0.2,y:y+0.2,w:5.5,h:0.45,fontSize:16,bold:true,color:C.accent,fontFace:"Calibri"});
    s.addText(b.body, {x:x+0.2,y:y+0.65,w:5.5,h:1.3,fontSize:13,color:C.light,fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.3});
  });
  footer(s, true);
  s.addNotes(`Este slide define o problema que estamos a resolver.

Os mercados de energia modernos têm três camadas de receita para uma bateria: arbitragem de preços (comprar barato, vender caro), serviços de equilíbrio de frequência (pago pela REN), e mecanismos de capacidade. Para capturar todas as três em simultâneo, é preciso um sistema de decisão em tempo real — o que nenhum promotor de energia em Portugal tem internamente.

Anedota útil: o primeiro BESS merchant de Portugal (Casal da Cortiça, 12 MVA) só entrou em operação em junho de 2025. O mercado é literalmente novo.

Mensagem principal: o problema não é técnico do lado do cliente — é que não existe ninguém a oferecer este serviço em Portugal de forma nativa.`);
}

// ─── SLIDE 3: A SOLUÇÃO ─────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightBg(s);
  addAccentBar(s, 0.55);
  sTitle(s, "A Solução: BESS Optimizer com IA", 0.7, 0.45, 11, C.dark);
  sSub(s, "Gerimos baterias de terceiros e maximizamos as suas receitas em todos os mercados", 0.7, 1.1, 11, C.muted);

  const steps = [
    { n:"01", title:"Conectar", body:"Ligamos a bateria via SCADA/telemetria em tempo real ao nosso sistema." },
    { n:"02", title:"Otimizar", body:"Algoritmo de Deep Reinforcement Learning decide carregar, descarregar ou aguardar." },
    { n:"03", title:"Monetizar", body:"Licitamos em OMIE + serviços de equilíbrio REN/REE em simultâneo." },
  ];
  steps.forEach((st, i) => {
    const x = 0.8 + i*4.1;
    s.addShape(pptx.ShapeType.ellipse, {x:x+1.3,y:1.8,w:1.4,h:1.4,fill:{color:C.dark}});
    s.addText(st.n, {x:x+1.3,y:1.85,w:1.4,h:1.3,fontSize:28,bold:true,color:C.accent,align:"center",fontFace:"Calibri"});
    s.addText(st.title, {x,y:3.35,w:4,h:0.5,fontSize:18,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addText(st.body, {x,y:3.9,w:4,h:1.1,fontSize:13,color:C.dark,align:"center",fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.3});
    if(i<2){
      s.addShape(pptx.ShapeType.rect, {x:x+3.8,y:2.35,w:0.5,h:0.05,fill:{color:C.accent}});
      s.addShape(pptx.ShapeType.rect, {x:x+4.1,y:2.28,w:0.05,h:0.2,fill:{color:C.accent}});
    }
  });
  s.addShape(pptx.ShapeType.rect, {x:2.5,y:5.4,w:8,h:1.4,fill:{color:C.dark},rectRadius:0.15});
  s.addText("Modelo de Receita:", {x:2.7,y:5.6,w:2.5,h:0.4,fontSize:14,bold:true,color:C.muted,fontFace:"Calibri"});
  s.addText("10–25% das receitas geradas  •  Sem necessidade de possuir baterias", {x:2.7,y:6.0,w:9.8,h:0.5,fontSize:15,color:C.accent,fontFace:"Calibri"});
  footer(s, false);
  s.addNotes(`Este slide dá uma visão de alto nível do que fazemos — os próximos dois slides aprofundam a tecnologia.

Ponto-chave a sublinhar para investidores não técnicos: nós NÃO compramos baterias. Gerimos baterias que já existem ou vão existir. O nosso produto é software e know-how de mercado.

O modelo de revenue share (10–25%) alinha incentivos: só ganhamos quando o cliente ganha mais do que ganharia sozinho.

Pergunta frequente: "Como é que garantem performance?" — resposta: shadow trading durante 3–6 meses antes de ir live. Mostramos ao cliente o que ganharíamos, e só depois assinamos contrato.`);
}

// ─── SLIDE 4: TECNOLOGIA — ARQUITETURA ──────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  addAccentBar(s);
  sTitle(s, "Tecnologia: Como Funciona");
  sSub(s, "Pipeline de dados em tempo real → previsão de preços → decisão ótima → execução automática");

  // 5-layer pipeline
  const layers = [
    { label: "Dados de Mercado",    sub: "OMIE API\nREN / REE feeds\nPrevisão meteorológica",       color: C.mid },
    { label: "Previsão de Preços",  sub: "XGBoost / Transformer\nHorizonte 24–72h\nAtualização a cada 15 min", color: "1A5276" },
    { label: "Motor de Decisão",    sub: "Deep Reinforcement Learning\nEstado da bateria + preços\nMilhões de simulações",  color: "0E6655" },
    { label: "Gestão de Ativos",    sub: "Estado de carga (SoC)\nDegradação / ciclos\nLimites térmicos",  color: "7D3C98" },
    { label: "Execução no Mercado", sub: "Licitação OMIE automática\nSCADA → BMS da bateria\nResposta em milissegundos", color: "B03A2E" },
  ];

  layers.forEach((l, i) => {
    const x = 0.3 + i * 2.55;
    s.addShape(pptx.ShapeType.rect, {x,y:1.75,w:2.35,h:4.8,fill:{color:l.color},rectRadius:0.1});
    s.addShape(pptx.ShapeType.rect, {x,y:1.75,w:2.35,h:0.5,fill:{color:C.accent},rectRadius:0.1});
    s.addText((i+1).toString(), {x,y:1.75,w:0.45,h:0.5,fontSize:14,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addText(l.label, {x:x+0.42,y:1.78,w:1.88,h:0.45,fontSize:12,bold:true,color:C.dark,fontFace:"Calibri"});
    s.addText(l.sub, {x:x+0.1,y:2.35,w:2.15,h:2.2,fontSize:11,color:C.light,fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.5});
    if(i<4){
      s.addShape(pptx.ShapeType.rect, {x:x+2.25,y:3.05,w:0.3,h:0.05,fill:{color:C.accent}});
    }
  });

  // Real-time badge
  s.addShape(pptx.ShapeType.rect, {x:0.3,y:6.75,w:12.6,h:0.55,fill:{color:C.mid},rectRadius:0.08});
  s.addText("⚡  Ciclo completo executado a cada 15 minutos  •  Decisão de despacho em < 100ms  •  Disponibilidade 99.9% (cloud)", {
    x:0.5,y:6.78,w:12.3,h:0.45,fontSize:12,color:C.accent,fontFace:"Calibri",align:"center"
  });
  footer(s, true);
  s.addNotes(`Este slide é o coração técnico da apresentação. Explicar cada camada brevemente:

1. DADOS DE MERCADO: Consumimos preços OMIE (day-ahead e intraday), sinais de equilíbrio da REN/REE, e previsão meteorológica (wind/solar afeta volatilidade de preços). Tudo via APIs públicas ou protocolos standard.

2. PREVISÃO DE PREÇOS: Modelo de machine learning (XGBoost ou Transformer) treinado em histórico OMIE. Prevê preços para as próximas 24–72 horas. Atualiza a cada 15 minutos com os dados mais recentes do mercado.

3. MOTOR DE DECISÃO (o mais importante): Deep Reinforcement Learning. Um agente treina em milhões de simulações de mercado para aprender a política ótima de carga/descarga. Supera métodos clássicos (MILP) em ~58% em estudos publicados. Considera o estado de carga da bateria, preços futuros previstos, e os constrangimentos físicos do ativo.

4. GESTÃO DE ATIVOS: Modela o estado físico da bateria em tempo real — estado de carga, temperatura, degradação. Protege o ativo do cliente contra sobre-ciclagem.

5. EXECUÇÃO: Liga ao BMS (Battery Management System) da bateria via protocolo IEC 61850 ou MODBUS. Envia comandos de carga/descarga. Simultaneamente, submete licitações automáticas no OMIE. Tudo em menos de 100 milissegundos.

Para investidores técnicos: mencionar que o código de forecasting pode usar a biblioteca OMIEData (open source, Python, GitHub) para dados históricos, e que o ambiente de simulação para treino RL pode ser construído em OpenAI Gym.`);
}

// ─── SLIDE 5: TECNOLOGIA — STACK & IMPLEMENTAÇÃO ────────────────────────────
{
  const s = pptx.addSlide();
  addLightBg(s);
  addAccentBar(s, 0.55);
  sTitle(s, "Stack Tecnológico & Implementação", 0.7, 0.45, 11, C.dark);
  sSub(s, "Ferramentas open-source + cloud standard — sem dependências proprietárias", 0.7, 1.1, 11, C.muted);

  // Left: tech stack table
  const stackRows = [
    { cat: "Algoritmo / IA",        tools: "Python · Stable-Baselines3 (RL) · XGBoost · PyTorch" },
    { cat: "Dados de Mercado",      tools: "OMIEData (Python) · API REN · API ENTSOE" },
    { cat: "Integração SCADA",      tools: "IEC 61850 · MODBUS TCP · OpenDNP3" },
    { cat: "Cloud & Infra",         tools: "AWS / Azure · Docker · Kubernetes · Terraform" },
    { cat: "Licitação Automática",  tools: "API OMIE (registo como agente de mercado)" },
    { cat: "Monitorização",         tools: "Grafana · InfluxDB · alertas Telegram/email" },
    { cat: "Dashboard Cliente",     tools: "FastAPI (backend) · React (frontend) · PostgreSQL" },
  ];

  s.addShape(pptx.ShapeType.rect, {x:0.5,y:1.65,w:6.0,h:0.45,fill:{color:C.dark},rectRadius:0.06});
  s.addText("Camada", {x:0.55,y:1.67,w:1.8,h:0.4,fontSize:12,bold:true,color:C.accent,fontFace:"Calibri"});
  s.addText("Ferramentas", {x:2.4,y:1.67,w:4.0,h:0.4,fontSize:12,bold:true,color:C.accent,fontFace:"Calibri"});

  stackRows.forEach((r, i) => {
    const y = 2.15 + i * 0.62;
    const bg = i%2===0 ? "E8EFF5" : C.light;
    s.addShape(pptx.ShapeType.rect, {x:0.5,y,w:6.0,h:0.58,fill:{color:bg}});
    s.addText(r.cat, {x:0.6,y:y+0.06,w:1.75,h:0.45,fontSize:11,bold:true,color:C.dark,fontFace:"Calibri"});
    s.addText(r.tools, {x:2.4,y:y+0.06,w:3.9,h:0.45,fontSize:11,color:"334455",fontFace:"Calibri"});
  });

  // Right: implementation timeline
  s.addText("Fases de Implementação", {x:7.0,y:1.6,w:6.0,h:0.45,fontSize:15,bold:true,color:C.dark,fontFace:"Calibri"});

  const phases = [
    { label: "Meses 1–2", color: C.accent, title: "Fundação de Dados",
      items: ["Integrar API OMIE (dados históricos e live)", "Pipeline de dados meteorológicos", "Base de dados de séries temporais (InfluxDB)"] },
    { label: "Meses 3–5", color: C.warn, title: "Algoritmo Central",
      items: ["Modelo de previsão de preços (XGBoost)", "Ambiente de simulação (OpenAI Gym)", "Treino do agente DRL (Stable-Baselines3 · PPO)"] },
    { label: "Meses 6–8", color: C.green, title: "Integração & Piloto",
      items: ["Conector SCADA/IEC 61850 para o 1.º ativo", "Shadow trading ao vivo (sem dinheiro real)", "Dashboard de performance para o cliente"] },
    { label: "Meses 9–12", color: "7B68EE, title: Go-Live",
      items: ["Go-live no OMIE + serviços de equilíbrio REN", "Monitorização 24/7 (Grafana + alertas)", "Onboarding de 2.º e 3.º ativos"] },
  ];

  // fix syntax - rebuild phases correctly
  const phasesFixed = [
    { label: "Meses 1–2", color: C.accent, title: "Fundação de Dados",
      items: ["Integrar API OMIE (histórico + live)", "Pipeline meteorológico", "InfluxDB para séries temporais"] },
    { label: "Meses 3–5", color: C.warn,   title: "Algoritmo Central",
      items: ["Forecasting XGBoost (24–72h)", "Ambiente simulação (OpenAI Gym)", "Treino DRL com Stable-Baselines3"] },
    { label: "Meses 6–8", color: C.green,  title: "Integração & Shadow",
      items: ["Conector IEC 61850 para 1.º ativo", "Shadow trading ao vivo (sem risco)", "Dashboard de performance cliente"] },
    { label: "Meses 9–12", color: "9B59B6", title: "Go-Live",
      items: ["Live no OMIE + equilíbrio REN", "Monitorização 24/7 Grafana", "Onboarding 2.º e 3.º ativos"] },
  ];

  phasesFixed.forEach((ph, i) => {
    const y = 2.1 + i * 1.2;
    s.addShape(pptx.ShapeType.rect, {x:7.0,y,w:1.2,h:1.05,fill:{color:ph.color},rectRadius:0.06});
    s.addText(ph.label, {x:7.0,y:y+0.06,w:1.2,h:0.42,fontSize:10,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addText(ph.title, {x:7.0,y:y+0.5,w:1.2,h:0.35,fontSize:9,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addShape(pptx.ShapeType.rect, {x:8.25,y,w:4.8,h:1.05,fill:{color:C.dark},rectRadius:0.06});
    ph.items.forEach((it, j) => {
      s.addText("•  "+it, {x:8.4,y:y+0.08+j*0.3,w:4.5,h:0.28,fontSize:11,color:C.light,fontFace:"Calibri"});
    });
  });

  // MVP cost badge
  s.addShape(pptx.ShapeType.rect, {x:0.5,y:6.5,w:12.5,h:0.65,fill:{color:C.dark},rectRadius:0.08});
  s.addText("Custo do MVP Tecnológico (equipa 2–3 pessoas, 9 meses):", {x:0.7,y:6.55,w:5.5,h:0.5,fontSize:12,bold:true,color:C.muted,fontFace:"Calibri"});
  s.addText("€90K – €160K", {x:6.3,y:6.55,w:2.8,h:0.5,fontSize:18,bold:true,color:C.accent,fontFace:"Calibri"});
  s.addText("Salários Lisboa: €45K–€75K/ano (ML Engineer)", {x:9.2,y:6.6,w:3.7,h:0.4,fontSize:11,color:C.muted,fontFace:"Calibri"});
  footer(s, false);
  s.addNotes(`Este slide responde à pergunta "mas como é que isso se faz na prática?"

STACK — pontos a sublinhar:
- Tudo open-source. Sem licenças proprietárias caras. Stable-Baselines3 é a biblioteca standard para RL em Python (usada em investigação académica e indústria).
- OMIEData é um package Python público (GitHub: acruzgarcia/OMIEData) que permite descarregar dados históricos e live do mercado ibérico. Já existe — não temos de construir.
- A integração SCADA usa protocolos industriais standard (IEC 61850, MODBUS). Qualquer bateria moderna suporta.
- Grafana + InfluxDB é o stack de monitorização de energia standard na indústria.

TIMELINE — 12 meses do código ao primeiro ativo live:
- Meses 1–2: dados e infraestrutura. Nenhum algoritmo funciona sem dados limpos.
- Meses 3–5: o algoritmo central. O ambiente de simulação permite treinar o agente sem risco.
- Meses 6–8: ligar ao mundo real. Shadow trading é crítico — mostramos ao cliente o que ganharíamos sem arriscar o seu ativo.
- Meses 9–12: go-live e escalar.

Para investidores preocupados com risco técnico: a maior incerteza não é o algoritmo (é um problema bem definido com literatura publicada) — é a integração SCADA com cada BMS específico, que varia por fabricante (SMA, CATL, Tesla Megapack). Estimamos 1–4 semanas de engenharia por ativo novo.`);
}

// ─── SLIDE 6: OPORTUNIDADE DE MERCADO ────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  addAccentBar(s);
  sTitle(s, "Oportunidade: Portugal em Janela Única");

  const stats = [
    { val:"750 MVA", label:"Concurso de armazenamento PT — 2026" },
    { val:"720 MWh", label:"BESS em pipeline ambiental em Portugal" },
    { val:"36 GW",   label:"Pipeline de armazenamento em Espanha" },
    { val:"1",       label:"Único agregador independente autorizado em PT (estrangeiro)" },
  ];
  stats.forEach((st, i) => {
    const y = 1.7 + i*1.3;
    s.addShape(pptx.ShapeType.rect, {x:0.5,y,w:5.5,h:1.1,fill:{color:C.mid},rectRadius:0.08});
    s.addText(st.val, {x:0.7,y:y+0.05,w:2.2,h:0.6,fontSize:28,bold:true,color:C.accent,fontFace:"Calibri"});
    s.addText(st.label, {x:0.7,y:y+0.58,w:5.0,h:0.4,fontSize:12,color:C.muted,fontFace:"Calibri"});
  });

  s.addText("Linha do Tempo Regulatória", {x:7,y:1.6,w:5.8,h:0.4,fontSize:14,bold:true,color:C.accent,fontFace:"Calibri"});
  const events = [
    { year:"Jan 2022", text:"DL 15/2022 — Quadro legal para agregadores independentes" },
    { year:"Jun 2025", text:"1.ª BESS merchant standalone em Portugal (Casal da Cortiça, 12 MVA)" },
    { year:"Fev 2025", text:"IGNIS: 1.º agregador independente autorizado pela REN" },
    { year:"Out 2025", text:"Entrix anuncia entrada em Portugal" },
    { year:"2026 H1", text:"Concurso 750 MVA + €400M investimento público" },
    { year:"Agora →", text:"Janela de oportunidade para player nativo português" },
  ];
  events.forEach((ev, i) => {
    const y = 2.1 + i*0.8;
    const isNow = ev.year.includes("→");
    s.addShape(pptx.ShapeType.ellipse, {x:7,y:y+0.1,w:0.18,h:0.18,fill:{color:isNow?C.accent:C.muted}});
    s.addShape(pptx.ShapeType.rect, {x:7.08,y:y+0.28,w:0.02,h:0.55,fill:{color:C.mid}});
    s.addText(ev.year, {x:7.3,y:y+0.02,w:1.5,h:0.3,fontSize:11,bold:true,color:isNow?C.accent:C.white,fontFace:"Calibri"});
    s.addText(ev.text, {x:7.3,y:y+0.3,w:5.2,h:0.4,fontSize:11,color:C.muted,fontFace:"Calibri",wrap:true});
  });
  footer(s, true);
  s.addNotes(`Este slide posiciona a oportunidade no tempo — é crucial para convencer investidores de que o timing é agora.

Argumentos principais:
- "O DL 15/2022 abriu a porta, mas a primeira empresa a entrar só o fez em fevereiro de 2025. Há menos de 14 meses que este mercado está tecnicamente aberto para independentes."
- "O primeiro BESS 100% merchant em Portugal só entrou em operação em junho de 2025. O mercado é literalmente bebé."
- "A Entrix (alemã) entrou em outubro de 2025. Se uma empresa alemã acha que vale a pena vir a Portugal, é sinal claro de que o mercado é real."
- "O governo português anunciou €400M para rede + BESS após instabilidade na rede ibérica. Há urgência política."

Sobre os números: 750 MVA no concurso de 2026 = centenas de ativos que vão precisar de otimização. Cada 1 MW de BESS gerido pode gerar €30K–80K/ano em receitas de mercado. Com 10% de revenue share = €3K–8K/MW/ano para nós.

Se nos perguntarem sobre o pipeline real em Portugal: existem menos de 20 promotores significativos de BESS em Portugal neste momento. O mercado de primeiros clientes é muito identificável.`);
}

// ─── SLIDE 7: MODELO DE NEGÓCIO ─────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightBg(s);
  addAccentBar(s, 0.55);
  sTitle(s, "Modelos de Negócio", 0.7, 0.45, 11, C.dark);
  sSub(s, "Quatro estruturas comerciais — arrancamos com Revenue Share, escalamos para Tolling", 0.7, 1.1, 11, C.muted);

  const models = [
    { name:"Revenue Share", tag:"Arranque", color:C.accent, body:"O otimizador fica com 10–25% do lucro gerado.\nAlinha incentivos. Risco de mercado com o dono do ativo." },
    { name:"Tolling",        tag:"Escala",   color:C.warn,   body:"Pagamos uma taxa fixa ao dono e ficamos com toda a receita.\nAlta margem mas exige capital de trading." },
    { name:"Floor Price",    tag:"Híbrido",  color:C.green,  body:"Garantimos receita mínima ao dono.\nPartilhamos o excedente — equilibra risco e incentivo." },
    { name:"SaaS",           tag:"Futuro",   color:C.muted,  body:"Licenciamos o algoritmo a operadores que gerem os próprios ativos.\nMenor margem, zero risco de trading." },
  ];
  models.forEach((m, i) => {
    const x = 0.5+(i%2)*6.4, y = 1.75+Math.floor(i/2)*2.5;
    s.addShape(pptx.ShapeType.rect, {x,y,w:5.9,h:2.1,fill:{color:C.dark},rectRadius:0.1});
    s.addShape(pptx.ShapeType.rect, {x,y,w:1.5,h:0.35,fill:{color:m.color},rectRadius:0.05});
    s.addText(m.tag, {x,y:y+0.03,w:1.5,h:0.3,fontSize:11,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addText(m.name, {x:x+0.2,y:y+0.45,w:5.5,h:0.45,fontSize:18,bold:true,color:C.white,fontFace:"Calibri"});
    s.addText(m.body, {x:x+0.2,y:y+0.95,w:5.4,h:1.0,fontSize:12,color:C.muted,fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.3});
  });
  footer(s, false);
  s.addNotes(`Este slide é sobre como fazemos dinheiro — importante para investidores perceberem a progressão.

Revenue Share (fase de arranque):
- Começamos aqui porque alinha incentivos e requer menos capital.
- O cliente não paga nada upfront — só recebe menos se nós ganharmos menos.
- Percentagem típica no mercado: 10–25% das receitas geradas pelo algoritmo.
- Risco para nós: se o algoritmo subperforma, ganhamos menos. Por isso o shadow trading é obrigatório antes.

Tolling (fase de escala):
- Pagamos uma taxa fixa mensal ao dono do ativo e ficamos com TODA a receita do mercado.
- Margens potencialmente muito altas, mas exige capital de working capital para pagar o toll antes de receber do mercado.
- Requer track record e confiança — não é para o arranque.

Floor Price (híbrido):
- Popular entre promotores de energia que querem bankability (financiamento bancário do projeto).
- Nós garantimos uma receita mínima — o banco do promotor fica mais confortável.

SaaS:
- Fase futura — quando tivermos algoritmo maduro e certificado.
- Vender licença a utilities ou grandes industriais que querem gerir os próprios ativos.

Número para memorizar: cada 10 MW de BESS sob gestão em revenue share gera ~€50K–150K/ano de receita para nós, sem custos marginais significativos.`);
}

// ─── SLIDE 8: VANTAGEM COMPETITIVA ──────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  addAccentBar(s);
  sTitle(s, "Vantagem Competitiva & Concorrência");

  s.addText("Os Nossos Moats", {x:0.5,y:1.5,w:5.5,h:0.4,fontSize:16,bold:true,color:C.accent,fontFace:"Calibri"});
  const moats = [
    { icon:"🔐", t:"Certificações Regulatórias", d:"6–18 meses para obter — barreira de entrada real" },
    { icon:"📊", t:"Dados Proprietários",        d:"Histórico de licitações melhora o algoritmo continuamente" },
    { icon:"⚙️", t:"Deep Reinforcement Learning",d:"+58% vs. métodos tradicionais em arbitragem" },
    { icon:"🇵🇹", t:"Player Nativo",              d:"Relações com REN/DGEG; agilidade regulatória local" },
  ];
  moats.forEach((m, i) => {
    const y = 2.0 + i*1.15;
    s.addShape(pptx.ShapeType.rect, {x:0.5,y,w:5.8,h:1.0,fill:{color:C.mid},rectRadius:0.08});
    s.addText(m.icon+"  "+m.t, {x:0.7,y:y+0.05,w:5.4,h:0.38,fontSize:14,bold:true,color:C.white,fontFace:"Calibri"});
    s.addText(m.d, {x:0.7,y:y+0.48,w:5.4,h:0.38,fontSize:12,color:C.muted,fontFace:"Calibri"});
  });

  s.addText("Landscape em Portugal/Ibéria", {x:6.8,y:1.5,w:6,h:0.4,fontSize:16,bold:true,color:C.accent,fontFace:"Calibri"});
  const headers = ["Empresa","Origem","Entrada PT","Nativo?"];
  const rows = [
    ["IGNIS Energía","Espanha","Fev 2025","✗"],
    ["Entrix","Alemanha","Out 2025","✗"],
    ["enspired","Áustria","Não confirmada","✗"],
    ["Axpo","Suíça","Presente","✗"],
    ["[Esta empresa]","Portugal","2026","✓"],
  ];
  const tw=[2.2,1.5,1.8,1.0], tx=[6.8,9.0,10.5,12.3];
  headers.forEach((h,i)=>{
    s.addShape(pptx.ShapeType.rect,{x:tx[i],y:2.0,w:tw[i],h:0.4,fill:{color:C.accent}});
    s.addText(h,{x:tx[i],y:2.0,w:tw[i],h:0.4,fontSize:11,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
  });
  rows.forEach((row,ri)=>{
    const rowBg = ri===4?C.accent:(ri%2===0?C.mid:C.dark);
    row.forEach((cell,ci)=>{
      s.addShape(pptx.ShapeType.rect,{x:tx[ci],y:2.4+ri*0.75,w:tw[ci],h:0.7,fill:{color:rowBg},line:{color:C.mid,width:0.5}});
      s.addText(cell,{x:tx[ci]+0.05,y:2.4+ri*0.75,w:tw[ci]-0.1,h:0.7,fontSize:ri===4?12:11,bold:ri===4,color:ri===4?C.dark:C.light,align:"center",fontFace:"Calibri"});
    });
  });
  footer(s, true);
  s.addNotes(`Atenção especial a este slide quando investidores perguntam "mas e a concorrência?"

Sobre os concorrentes:
- IGNIS (espanhola): entrou em fevereiro de 2025, foi a primeira. Mas é espanhola — não tem presença física em Portugal, sem escritório local, sem equipa dedicada ao mercado português.
- Entrix (alemã): anunciou Portugal em outubro de 2025. Mesma situação — operam remotamente de Munique.
- enspired e Axpo: presença não confirmada no mercado de otimização português.

O nosso diferencial não é sermos "mais baratos" — é sermos DAQUI:
- Processo regulatório com REN e DGEG é mais rápido com uma equipa que fala português e conhece as pessoas.
- Os promotores de BESS em Portugal preferem um parceiro local para contratos de longo prazo (5–10 anos).
- Capacidade de resposta imediata a problemas técnicos no ativo.

Sobre os moats: a certificação técnica pela REN é a barreira mais alta. IGNIS levou meses a obtê-la "a trabalhar lado a lado com a REN". Isso é uma barreira real que um novo entrante tem de repetir — e nós também temos de passar por ela, por isso é importante começar já.

Sobre os dados proprietários: cada mês de trading gera dados de licitações que nenhum concorrente tem. É um flywheel — quanto mais ativos gerimos, melhor fica o algoritmo, melhor é a proposta para novos clientes.`);
}

// ─── SLIDE 9: INVESTIMENTO ──────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightBg(s);
  addAccentBar(s, 0.55);
  sTitle(s, "Necessidade de Investimento", 0.7, 0.45, 11, C.dark);
  sSub(s, "Seed Round — 700K€ a 1,5M€ para 18 meses de runway", 0.7, 1.1, 11, C.muted);

  const items = [
    { label:"Equipa (4 pessoas)", low:175, high:240, color:C.dark },
    { label:"Tecnologia / MVP",   low:90,  high:160, color:C.mid },
    { label:"Capital de Trading", low:100, high:350, color:C.warn },
    { label:"Regulatório / Legal",low:25,  high:55,  color:C.green },
    { label:"Operações / Outros", low:55,  high:135, color:C.muted },
  ];
  const maxH=350, barW=1.2, chartH=3.2, chartY=1.8, chartX=0.6;
  items.forEach((item, i) => {
    const x = chartX + i*2.2;
    const highH = (item.high/maxH)*chartH, lowH = (item.low/maxH)*chartH;
    s.addShape(pptx.ShapeType.rect, {x,y:chartY+chartH-highH,w:barW,h:highH,fill:{color:item.color,transparency:40}});
    s.addShape(pptx.ShapeType.rect, {x,y:chartY+chartH-lowH,w:barW,h:lowH,fill:{color:item.color}});
    s.addText(`€${item.low}K–${item.high}K`, {x:x-0.1,y:chartY+chartH-highH-0.4,w:barW+0.2,h:0.35,fontSize:10,bold:true,color:C.dark,align:"center",fontFace:"Calibri"});
    s.addText(item.label, {x:x-0.1,y:chartY+chartH+0.1,w:barW+0.2,h:0.6,fontSize:10,color:C.dark,align:"center",fontFace:"Calibri",wrap:true});
  });
  s.addShape(pptx.ShapeType.rect, {x:11.5,y:1.8,w:1.6,h:3.6,fill:{color:C.dark},rectRadius:0.1});
  s.addText("TOTAL\nANO 1", {x:11.5,y:2.1,w:1.6,h:0.7,fontSize:12,bold:true,color:C.muted,align:"center",fontFace:"Calibri",lineSpacingMultiple:1.3});
  s.addText("€445K", {x:11.5,y:2.9,w:1.6,h:0.55,fontSize:20,bold:true,color:C.accent,align:"center",fontFace:"Calibri"});
  s.addText("–", {x:11.5,y:3.45,w:1.6,h:0.3,fontSize:14,color:C.muted,align:"center",fontFace:"Calibri"});
  s.addText("€940K", {x:11.5,y:3.75,w:1.6,h:0.55,fontSize:20,bold:true,color:C.warn,align:"center",fontFace:"Calibri"});
  s.addShape(pptx.ShapeType.rect, {x:0.6,y:6.2,w:12.5,h:0.6,fill:{color:"FFF3CD"},rectRadius:0.05});
  s.addText("⚠  Capital de Trading (€100K–350K) é colateral bloqueado — não é gasto operacional. Com linha de garantia bancária, o burn operacional real é €345K–590K.", {
    x:0.8,y:6.25,w:12.1,h:0.5,fontSize:11,color:"7B5C00",fontFace:"Calibri"
  });
  footer(s, false);
  s.addNotes(`Este é o slide de números — prepara-te para perguntas detalhadas.

Detalhe de cada balde:

EQUIPA (maior custo): 4 pessoas no Ano 1:
- CEO/Business Dev (fundador, salário reduzido/diferido no início)
- CTO / ML Engineer sénior: €55K–75K/ano bruto (Lisboa)
- Especialista de Mercados de Energia (ex-REN, ex-EDP): €45K–65K/ano
- Full-Stack Developer: €40K–55K/ano
- TSU patronal ~23.75% adicional

TECNOLOGIA: custo de engenharia (salários da equipa técnica durante 9 meses de MVP) + cloud (€500–2K/mês).

CAPITAL DE TRADING: este é o ponto mais sensível.
- O OMIE exige garantias financeiras para participar no mercado (montante não publicado — a verificar directamente).
- Estimativa: €50K–200K para volumes iniciais pequenos (5–20 MWh/dia).
- Este dinheiro não é gasto — está bloqueado como garantia. Pode ser uma linha de garantia bancária em vez de cash, o que liberta capital operacional.

REGULATÓRIO: o custo real é o escritório de advogados de energia (Macedo Vitorino, CMS, PLMJ). Processo DGEG + ERSE + OMIE + REN. €20K–40K no total para o primeiro ano.

Sobre o que fazer com o investimento:
1. Contratar a equipa técnica (ML + mercados)
2. Iniciar processo legal imediatamente (6–18 meses de prazo)
3. Construir o algoritmo e fazer shadow trading
4. Fechar acordo de piloto com primeiro ativo

Pre-seed recomendado: €200K–400K para chegar a proof-of-concept (algoritmo + shadow trading + processo regulatório iniciado), antes de levantar a seed completa.`);
}

// ─── SLIDE 10: RISCOS ───────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  addAccentBar(s);
  sTitle(s, "Riscos & Mitigação");
  const risks = [
    { r:"Cronograma Regulatório", d:"Certificação REN pode demorar 12+ meses sem receitas", m:"Iniciar processo legal imediatamente. Shadow trading para validar o algoritmo antes de ir live." },
    { r:"Capital de Trading",     d:"Garantias OMIE/REN elevadas para novos operadores",    m:"Usar linhas de garantia bancária em vez de capital próprio. Começar com volumes pequenos (1–5 MW)." },
    { r:"Concorrência Externa",   d:"Entrix e IGNIS já entraram em Portugal com escala",    m:"Foco em relações locais e agilidade. Vantagem nativa em DGEG/REN. Mover mais rápido." },
    { r:"Performance do Algoritmo", d:"Subperformance no 1.º ano destrói reputação imediatamente", m:"3–6 meses de shadow trading obrigatórios antes de Live Trading com qualquer ativo." },
  ];
  risks.forEach((risk, i) => {
    const x = 0.5+(i%2)*6.4, y = 1.7+Math.floor(i/2)*2.5;
    s.addShape(pptx.ShapeType.rect, {x,y,w:5.9,h:2.1,fill:{color:C.mid},rectRadius:0.1});
    s.addShape(pptx.ShapeType.rect, {x,y,w:0.35,h:2.1,fill:{color:C.warn},rectRadius:0.05});
    s.addText(risk.r, {x:x+0.5,y:y+0.12,w:5.2,h:0.4,fontSize:15,bold:true,color:C.white,fontFace:"Calibri"});
    s.addText(risk.d, {x:x+0.5,y:y+0.52,w:5.2,h:0.4,fontSize:12,color:C.warn,fontFace:"Calibri",wrap:true});
    s.addText("→  "+risk.m, {x:x+0.5,y:y+0.95,w:5.2,h:0.9,fontSize:11,color:C.muted,fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.3});
  });
  footer(s, true);
  s.addNotes(`Apresentar riscos de forma proativa demonstra maturidade — não esperes que os investidores perguntem.

RISCO REGULATÓRIO (o mais importante):
- A janela entre arrancar a empresa e conseguir a certificação para participar em serviços de equilíbrio é de 6–18 meses.
- Durante este período, ainda é possível fazer shadow trading e fechar acordos comerciais.
- A mitigação chave: contratar um energy lawyer experiente desde o Dia 1, e se possível, alguém com contactos na REN na equipa ou como advisor.

RISCO DE CAPITAL DE TRADING:
- A solução é negociar uma linha de garantia bancária com um banco comercial (Caixa, BPI, Santander têm produtos para PMEs).
- Isto transforma o requisito de €100K–350K em cash num custo de ~2–3% ao ano em juros — muito mais manejável.

RISCO CONCORRENCIAL:
- Argumento honesto: a Entrix e IGNIS têm vantagem de escala, mas têm desvantagem de distância. Em Portugal, os decisores querem falar com alguém que aparece numa reunião em Lisboa.
- A janela é real mas finita — 12–24 meses antes de o mercado estar mais consolidado.

RISCO DO ALGORITMO:
- O shadow trading é a nossa salvaguarda pública. Comprometemo-nos a não ir live com nenhum ativo sem pelo menos 3 meses de shadow trading documentado.
- Isto também serve de argumento de venda: "veja o que ganhámos no papel — agora vai a sério".`);
}

// ─── SLIDE 11: PRÓXIMOS PASSOS ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addLightBg(s);
  addAccentBar(s, 0.55);
  sTitle(s, "Próximos Passos", 0.7, 0.45, 11, C.dark);
  sSub(s, "Da ideia ao primeiro ativo gerido — 12 meses", 0.7, 1.1, 11, C.muted);

  const steps = [
    { q:"Q1 2026", color:C.accent, items:["Constituição da empresa + NIF","Contratar energy lawyer (processo DGEG/ERSE)","Iniciar pipeline comercial com donos de BESS"] },
    { q:"Q2 2026", color:C.warn,   items:["Protótipo do algoritmo (forecasting + RL)","Shadow trading com dados OMIE históricos","Submeter candidatura a agregador independente na REN"] },
    { q:"Q3 2026", color:C.green,  items:["Fechar acordo de piloto (1–5 MW)","Integração SCADA com o 1.º ativo","Completar certificação técnica REN"] },
    { q:"Q4 2026", color:C.dark,   items:["Go-live no primeiro ativo","Reportar primeiros resultados a investidores","Pipeline: 2.º e 3.º ativos"] },
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i*3.2;
    s.addShape(pptx.ShapeType.rect, {x,y:1.75,w:3.0,h:0.5,fill:{color:st.color},rectRadius:0.08});
    s.addText(st.q, {x,y:1.75,w:3.0,h:0.5,fontSize:16,bold:true,color:st.color===C.dark?C.white:C.dark,align:"center",fontFace:"Calibri"});
    st.items.forEach((item, j) => {
      s.addShape(pptx.ShapeType.rect, {x,y:2.4+j*1.4,w:3.0,h:1.25,fill:{color:C.dark},rectRadius:0.06});
      s.addShape(pptx.ShapeType.rect, {x,y:2.4+j*1.4,w:0.12,h:1.25,fill:{color:st.color}});
      s.addText(item, {x:x+0.22,y:2.48+j*1.4,w:2.65,h:1.05,fontSize:12,color:C.light,fontFace:"Calibri",wrap:true,lineSpacingMultiple:1.35});
    });
  });
  footer(s, false);
  s.addNotes(`Este slide mostra que há um plano concreto — não estamos apenas a vender uma ideia.

Q1 2026 — as 3 coisas que se podem fazer AGORA, antes de investimento:
- Constituição da empresa é €300 e demora 1 semana online.
- Contactar um escritório de advogados de energia (Macedo Vitorino, CMS Law Portugal) para perceber o processo DGEG.
- Mapear os 15–20 promotores de BESS em Portugal e marcar reuniões exploratórias.

Q2 2026 — algoritmo:
- O código de forecasting pode começar com dados históricos OMIE (gratuitos, disponíveis via OMIEData).
- O ambiente de simulação RL pode ser construído com Gymnasium (OpenAI) e dados históricos.
- Não precisamos de uma bateria real para treinar o algoritmo — apenas dados.

Q3 2026 — o momento crítico:
- O piloto pode ser com um sistema pequeno (1–5 MW). Não precisa de ser uma instalação enorme.
- A integração SCADA é o passo técnico mais arriscado — depende do fabricante da bateria.
- Se a certificação REN demorar mais: podemos operar em arbitragem no OMIE sem certificação de serviços de equilíbrio (menor margem, mas prova de conceito).

Q4 2026 — milestone de investidores:
- Objetivo: ter receitas reais, mesmo que pequenas, para a próxima ronda.
- €3K–8K/MW/mês de receita da nossa parte em revenue share = prova de modelo.

Mensagem de fecho para este slide: "Em 12 meses, podemos ter um ativo live e dados reais de performance. É isso que nos separa de uma ideia de uma empresa real."`)
}

// ─── SLIDE 12: FECHO ────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  addDarkBg(s);
  s.addShape(pptx.ShapeType.rect, {x:0,y:0,w:0.35,h:"100%",fill:{color:C.accent}});
  s.addText("A Janela está Aberta.", {x:1.2,y:1.5,w:11,h:1.1,fontSize:48,bold:true,color:C.white,fontFace:"Calibri"});
  s.addText("Portugal ainda não tem nenhum otimizador de baterias nativo.\nO quadro regulatório abriu. O pipeline de ativos está a crescer.\nSer o primeiro muda tudo.", {
    x:1.2,y:2.8,w:9,h:1.4,fontSize:18,color:C.muted,fontFace:"Calibri",lineSpacingMultiple:1.5
  });
  const kpis = [
    { v:"€39B",  l:"Mercado Global VPP 2035" },
    { v:"0",     l:"Concorrentes nativos PT" },
    { v:"€400M", l:"Investimento público PT em BESS" },
    { v:"7.8/10",l:"Score da oportunidade" },
  ];
  kpis.forEach((k, i) => {
    const x = 1.2 + i*3.1;
    s.addShape(pptx.ShapeType.rect, {x,y:4.5,w:2.8,h:1.6,fill:{color:C.mid},rectRadius:0.1});
    s.addText(k.v, {x,y:4.65,w:2.8,h:0.7,fontSize:28,bold:true,color:C.accent,align:"center",fontFace:"Calibri"});
    s.addText(k.l, {x,y:5.35,w:2.8,h:0.55,fontSize:12,color:C.muted,align:"center",fontFace:"Calibri",wrap:true});
  });
  footer(s, true);
  s.addNotes(`Slide de fecho — manter a energia alta.

Mensagem principal: o timing é agora. Não daqui a 2 anos — agora. O mercado abriu há menos de 14 meses, o primeiro concorrente nativo não existe, e há €400M de dinheiro público a entrar no setor.

Perguntas que podem vir a seguir e como responder:

"Quanto vos valorizamos?" → Não discutir valuation nesta reunião. "Estamos em fase de validação do interesse de investidores — quando tivermos 2–3 comprometidos, estruturamos os termos."

"Qual é o vosso background de energia?" → [Responder com o background real do António e co-fundadores. Se necessário: "Identificámos um advisor ex-REN / ex-EDP para nos apoiar no processo regulatório."]

"Porquê vocês e não a Entrix?" → "A Entrix é alemã. Nós somos portugueses. Os promotores de BESS em Portugal querem um parceiro que apareça nas reuniões, fale a língua, e conheça as pessoas na REN e no DGEG. Essa é a nossa vantagem estrutural."

"E se o algoritmo não funcionar bem?" → "Por isso fazemos shadow trading durante 3–6 meses antes de ir live. Não assinamos um contrato de revenue share sem provar o valor primeiro."

Encerrar com: "O que precisamos de vocês não é apenas capital — é também rede de contactos no setor energético e acesso a promotores de BESS. Isso acelera o processo de primeiro cliente mais do que qualquer outra coisa."`);
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: "d:\\Claude - PA\\projects\\bess-pitch\\BESS-Optimizer-Pitch-2026-v2.pptx" })
  .then(() => console.log("PPTX saved — 12 slides"))
  .catch(err => { console.error(err); process.exit(1); });
