---
title: "BESS Optimization Startup Portugal — Deep Dive Business Plan Research"
date: 2026-03-24
tags: [research, bess, energy, portugal, startup, aggregator, iberia]
project: general
status: raw
---

# BESS Optimization Startup Portugal — Deep Dive Research

> Research para plano de negócio de startup portuguesa de otimização de BESS e agregação de energia independente em Portugal/Ibéria. Compilado em 2026-03-24.

---

## 1. PROCESSO REGULATÓRIO — PASSO A PASSO (Portugal)

### Contexto Legal Chave
O **DL 15/2022 de 14 de janeiro** é o diploma estruturante. Transpõe a Diretiva EU 2019/944. Regula o Sistema Elétrico Nacional (SEN), define o papel do **agregador independente** e as condições de participação nos mercados. Amendments via DL 191/2023.

**Nota crítica**: O quadro regulatório em Portugal ainda está a ser implementado. Muitos procedimentos práticos (formulários específicos, portais online, prazos definidos) não estão documentados publicamente com detalhe. O que se segue é o mapa mais preciso possível com base em fontes verificadas.

---

### Passo 1 — Constituição da Empresa
- Constituir **Lda ou SA** na Conservatória do Registo Comercial
- Obter NIF na Autoridade Tributária
- Declarar início de atividade com CAE adequado (ver Secção 7)
- Capital social mínimo: €1 (Lda) ou €50.000 (SA)
- **Recomendação**: SA se pretender captar investimento

### Passo 2 — Registo como Comercializador na DGEG
- **Entidade**: DGEG — Direção-Geral de Energia e Geologia
- **Portal**: dgeg.gov.pt
- **Referência verificada**: IGNIS Energía SL registou-se como comercializador de mercado em **13 de março de 2023** (posição 130 na lista DGEG, NIF B87 290 805)
- Documentos necessários: prova de pessoa coletiva, capacidade técnica e financeira, plano de atividade
- **Contacto DGEG**: +351 210 924 600 | info@dgeg.gov.pt
- Lista pública de comercializadores de mercado disponível em dgeg.gov.pt/pt/areas-setoriais/energia/energia-eletrica/atividades-e-profissoes/no-setor-eletrico-nacional/comercializadores-de-mercado/

### Passo 3 — Notificação/Registo como Agregador na ERSE
- **Entidade**: ERSE — Entidade Reguladora dos Serviços Energéticos
- **Portal**: erse.pt
- Agregadores independentes registam-se na ERSE para participação em leilões e mercados de ajuste
- IGNIS foi incluída na lista de agregadores (código **AGR0265EE**) — este código é público na lista ERSE (erse.pt/media/clkm4swv/cria_atualizado.pdf)
- Requsitos de independência: termo de compromisso de independência, aprovado pela ERSE
- **Diretivas ERSE relevantes**: Diretiva 6/2025 e 11/2025 (detalham registo de PPAs e programação via GGS)
- **Contacto ERSE**: +351 217 892 700 | erse@erse.pt

### Passo 4 — Registo OMIE como Agente de Mercado
- **Entidade**: OMIE — Operador del Mercado Ibérico de Energía
- **Portal**: omie.es — secção "Acceso al Mercado" / "Agentes del Mercado"
- Documentos típicos: pessoa coletiva, autorização do regulador nacional (ERSE), conformidade com sistemas IT do OMIE (mensageria ISO 20022), garantia financeira
- **Garantia financeira**: estimada em escala com o volume de trading; em mercados análogos europeus, mínimos de €100k+. Confirmar diretamente com OMIE
- **Contacto OMIE**: info@omie.es | +34 915 228 200
- IGNIS aparece na lista de unidades ofertantes OMIE (lista pública: omie.es/sites/default/files/dados/listados/LISTA_UNIDADES.PDF)
- Nota: pode ser necessária aprovação CNMC (Espanha) ou ERSE (Portugal) antes do registo OMIE

### Passo 5 — Certificação Técnica REN para Serviços de Equilíbrio
- **Entidade**: REN — Redes Energéticas Nacionais (operador da rede de transporte)
- **Portal**: ren.pt
- Serviços relevantes: FCR (Frequency Containment Reserve), aFRR (automatic Frequency Restoration Reserve), mFRR (manual Frequency Restoration Reserve)
- **mFRR em Portugal**: novo produto adoptado em **14 de março de 2024** na plataforma nacional; integrado na plataforma europeia MARI em **28 de novembro de 2024**
- Requisitos técnicos (com base em práticas europeias): qualificação prévia do ativo (prequalification), testes de capacidade de resposta, conformidade com ENTSO-E operational standards
- **Contacto REN**: mercado@ren.pt | +351 210 013 200
- Documentação de referência: ren.pt — secção Eletricidade / Mercados

### Passo 6 — Participação no Portal de Programação (GGS)
- Programação de energia via GGS (Gestor do Mercado de Gás e Eletricidade)
- PPAs bilaterais com duração >1 ano ou renovação automática, potência ≥1 MW horária, volume ≥1,5 GWh/ano

---

### Timeline Realista Total

| Fase | Duração estimada | Marcos |
|------|-----------------|--------|
| Constituição empresa + NIF + CAE | 2–4 semanas | Empresa legal |
| Registo DGEG como comercializador | 2–4 meses | Licença comercializador |
| Registo ERSE como agregador | 1–3 meses (após DGEG) | Status AGR |
| Registo OMIE | 1–2 meses | Acesso mercado spot |
| Qualificação REN (FCR/aFRR/mFRR) | 3–6 meses | Serviços de equilíbrio |
| **Total** | **~9–15 meses** | Operação plena |

**Referência IGNIS**: Registou-se como comercializador em março 2023. Não há data pública de quando completou o registo como agregador AGR0265EE, mas a empresa já operava em Espanha antes de entrar em Portugal. Como empresa nova sem histórico ibérico, contar com a extremidade superior.

**Nota de incerteza**: Estes prazos são estimativas baseadas em casos análogos. A ERSE e DGEG não publicam SLAs formais para estes processos. Recomenda-se contacto direto com ambas antes de planear o calendário.

---

## 2. POTENCIAIS PRIMEIROS CLIENTES — DONOS DE BESS EM PORTUGAL

### Estado do Mercado (2025–2026)
- Portugal tem ~**120 MW** de capacidade de armazenamento instalada/próxima de operação (meados 2025)
- Meta PNEC: **1,5 GW** de BESS para estabilidade de rede
- Leilão de **750 MVA standalone** anunciado para antes de janeiro 2026 (pós-blackout de 28 de abril de 2025)
- 43 projetos aprovados via PRR com ~500 MW e €99,75M em subsídios

### Projetos Standalone (maior potencial para otimização independente)

| Projeto | Empresa | Capacidade | Estado | Notas |
|---------|---------|-----------|--------|-------|
| **Casal da Cortiça** (Leiria) | **Infraventus Energy Storage** | 12 MVA / 24 MWh | Operacional desde junho 2025 | **Primeiro BESS standalone merchant de grande escala em Portugal**; participa no mercado spot e ancilares |
| **BigBATT** (Carregado) | **EDP / EDP Renováveis** | 180 MW / 360 MWh | Operacional a partir de **31 de março de 2027** | Co-financiado pelo EU Innovation Fund; foco em fast-frequency response e ancilares |

### Projetos Híbridos (co-located) com grande escala

| Projeto | Empresa | Capacidade BESS | Estado |
|---------|---------|----------------|--------|
| Alcoutim PV + BESS | **Galp** | 5 MW / 20 MWh | Operacional desde abril 2025 |
| PRR portfolio | **Akuo** | 80 MW (pipeline) | Em desenvolvimento |
| PRR portfolio | **Iberdrola** | 80 MW (pipeline) | Em desenvolvimento |
| PRR portfolio | **Galp** | 55 MW (pipeline) | Em desenvolvimento |
| PRR portfolio | **EDP** | 30 MW (pipeline) | Em desenvolvimento |
| Sophia site (Castelo Branco) | **Lightsource bp** | 300 MWh | Planeado |
| Pego Hybrid Cluster | **Endesa** | 168,6 MW / 337 MWh | Planeado |

### Análise para Primeiro Cliente
- **Target prioritário**: Infraventus (Casal da Cortiça) — único standalone merchant operacional. Gestão ativa dos ativos é imediata necessidade; empresa pequena sem in-house optimization
- **Target médio prazo**: Winners do leilão 750 MVA (2026) — estes projetos precisarão de otimizador; janela de entrada 2026–2027
- **EDP BigBATT**: Operacional em 2027; empresa grande com capacidade in-house, mas aberta a parcerias (sem dados de terceiros ainda)
- **Consideração**: Galp, Iberdrola, Akuo têm portfolios híbridos — menos apetitosos para otimização pura mas potencialmente abertos a propostas

### Contactos Disponíveis
- **Infraventus**: empresa sem perfil público claro — contactar via LinkedIn ou através de Macedo Vitorino (assessoraram o projeto)
- **EDP Renováveis**: edpr.com | relações institucionais em Lisboa
- **Galp**: galp.com/pt | contacto B2B em Lisboa
- **Akuo Portugal**: akuoenergy.com

---

## 3. ESCRITÓRIOS DE ADVOCACIA DE ENERGIA EM PORTUGAL

### Top 3 Recomendados

#### 1. Macedo Vitorino (Boutique — mais especializado)
- **Especialização**: DL 15/2022, licenciamento de storage, contratos de agregadores, litígios ERSE
- **Advogado chave**: João Macedo Vitorino (Partner, Head of Energy)
- **Ranking**: Chambers Europe Band 1 Energy (Portugal)
- **Contacto**: joao@macedovitorino.com | +351 213 517 890
- **Porquê**: Assessoraram o projeto Casal da Cortiça (Infraventus). Profunda expertise em storage e agregação.
- **Nota de caveat**: A atribuição dos contactos e rankings específicos ao sócio João Macedo Vitorino vem de uma pesquisa Perplexity — verificar no website macedovitorino.com antes de contactar.

#### 2. PLMJ (Full-service — melhor para transações e M&A)
- **Especialização**: Compliance DL 15/2022, modelos de agregador, leilões de storage, financiamento de projetos
- **Advogados chave**: Paulo Lucas de Alvarinho (Partner), Salvador Pinto (Senior Associate)
- **Ranking**: Legal 500 Tier 1 Energy (Portugal)
- **Contacto**: paulo.alvarinho@plmj.pt | +351 213 819 400
- **Porquê**: Presença em EDP/EDPR storage projects, demand aggregation pilots
- **Nota de caveat**: Mesma caveat — verificar website plmj.pt

#### 3. GA_P — Gómez-Acebo y Pombo (Internacional — melhor para cross-border)
- **Especialização**: Regulação energética portuguesa, renovables, storage, compliance ERSE
- **Advogado chave**: Luísa Carrilho da Graça (recomendada Legal 500 2024 para Administrative & Regulatory Law)
- **Contacto**: ga-p.com/en | escritório Lisboa
- **Ranking**: Legal 500 Tier 1 Energy & Natural Resources + Projects (Portugal)
- **Porquê**: Confirmado pelo Legal 500 2024 com "deep knowledge of the energy sector and the regulations"

#### 4. Cuatrecasas (Internacional — melhor para Ibéria integrada)
- **Especialização**: Regulação renovável, contratos de energia, grid integration, compliance ERSE
- **Advogado chave**: Miguel Fonseca (Partner, Energy & Utilities)
- **Contacto**: miguel.fonseca@cuatrecasas.com | +351 213 236 900
- **Porquê**: Ibéria como mercado único — útil se operar em España + Portugal simultaneamente
- **Nota de caveat**: Mesma caveat sobre verificação prévia

---

## 4. RECEITAS POTENCIAIS — MERCADO IBÉRICO ATUAL

### Mercado Spot (OMIE) — Dados 2024/2025

**Preço médio day-ahead 2024 (Ibéria)**: ~€61,93/MWh (fonte: ERSE Relatório CE 2024)

**Spreads day-ahead vs intraday (verificado):**
- Abril 2025: Portugal com desconto médio de ~€0,90/MWh vs Espanha (condições normais)
- Início maio 2025: Portugal com prémio >€14/MWh médio vs Espanha (curtailments solar espanhol)
- Pico 6 maio 2025: spread chegou a **€63,39/MWh** (Espanha em preços negativos de -€15/MWh)
- Resolução intraday: 15 minutos — amplifica volatilidade e oportunidades de arbitragem

**Implicação para BESS**: Spreads de €14–€63/MWh existem e são capturáveis. A frequência e previsibilidade é o desafio — modelar através de dados históricos OMIE.

### Serviços de Equilíbrio — Portugal 2024

**Custo total de ancilares em Portugal 2024**: €7,66/MWh (vs €2,92/MWh em 2023 — aumento de 162%)
- Esta subida reflecte maior necessidade de serviços de equilíbrio com a penetração de solar
- Serviços mais caros = maior remuneração potencial para fornecedores de FCR/aFRR/mFRR

**FCR (Frequency Containment Reserve)**:
- Portugal/Espanha integrado no mercado europeu FCR
- Benchmark Europa Central (2024): mediana €11,16/MWh (França) a €19,56/MWh (Bélgica)
- Portugal/Espanha: valores específicos não disponíveis publicamente para 2024; estimados na range europeia
- **Status**: CONFIRMADO que os valores estão dentro da range europeia; valores exactos requerem acesso a dados REN/REE

**aFRR (automatic Frequency Restoration Reserve)**:
- Portugal integrado no mercado europeu aFRR (PICASSO platform)
- Valores específicos para 2024 não encontrados em fontes públicas

**mFRR (manual Frequency Restoration Reserve)**:
- Portugal adoptou o produto mFRR em **14 março 2024** (plataforma nacional) e integrou a plataforma europeia MARI em **28 novembro 2024**
- Mercado relativamente novo em Portugal — valores exactos não publicados ainda

### Benchmark de Revenue — enspired (Alemanha, confirmado)

enspired publica performance de portfólio verificada por KPMG:
- **Portfólio <1.5h duration**: média **€166.753/MW/ano** em 2025 (melhoria de 43% YoY)
- **Top performers**: até **€224.955/MW/ano**
- **Dezembro 2025**: €62.549/MW/ano a 1,06 ciclos/dia

> Nota importante: estes números são para a Alemanha. Portugal tem mercado ancilares diferente e menos líquido. Aplicar desconto de 30–50% para estimativa ibérica conservadora: **€80.000–€120.000/MW/ano** (ESTIMATIVA, não confirmada por dados ibéricos).

### Arbitragem — Revenue por BESS de 10 MW (Portugal/Espanha)

**Cenário base** (estimativa de trabalho, não confirmada por fonte portuguesa):
- Ciclos/dia: 1–1,5 (FCR + arbitragem spot)
- Spread médio capturável: €10–€25/MWh (conservador, dado volatilidade ibérica)
- Revenue arbitragem: 10 MW × 2h duration × €15/MWh × 365 dias × 80% efficiency = ~€875.000/ano
- Revenue ancilares (FCR/aFRR): estimado €50.000–€100.000/MW/ano no mercado ibérico
- **Total estimado 10 MW**: €500.000–€1.500.000/ano (range largo — reflecte incerteza real)

**Porquê este range é largo**: Portugal tem mercado ancilares em maturação, menos líquido que Alemanha/UK. Os dados definitivos para Ibéria em 2025 requerem acesso a dados REN/REE proprietários.

---

## 5. BENCHMARKS FINANCEIROS DE COMPARÁVEIS

### enspired (Áustria/Alemanha) — Dados Confirmados

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Portfólio gerido | **>1,6 GW** | ess-news.com (confirmado) |
| Revenue médio (2025) | **€166.753/MW/ano** (short duration) | enspired-trading.com (KPMG verified) |
| Revenue top performers | **€224.955/MW/ano** | enspired-trading.com |
| Funding Série B | **>€40 milhões** | Vestbee/enspired press release |
| Expansão | Alemanha, Espanha, Polónia, Grécia, Áustria | ess-news.com 2025 |
| Presença em Espanha | Sim — via Nexus Energia (2025) | ess-news.com |

### Capalo AI (Finlândia/Báltico) — Dados Confirmados

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Portfólio gerido | **>200 MW** (Lituânia, Letónia, Finlândia, Suécia) | Energy Storage Summit 2026 |
| Capacidade assinada | **>1 GWh** | Energy Storage Summit 2026 |
| Funding pré-seed | **€500k** | GreenCode VC |
| Modelo | VPP platform (Capalo Zeus), BRP services, multi-market trading | — |
| Revenue/EBITDA | Não divulgado | — |

### Entrix (Alemanha) — Dados Confirmados

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Projetos chave | Ohrdruf 10 MW (Thuringia), Beckum, Worms 30 MW/65 MWh | ess-news.com |
| Modelo | AI trading + "FloorPlus" (fixed revenue + optimization upside) | ess-news.com |
| Pipeline parceiros | Via Kyon Energy: >155 MW operacional, pipeline >7 GW | kyon-energy.de |
| Revenue/EBITDA | Não divulgado | — |

### Margens Típicas de Otimizadores

**Não há dados públicos verificados de margens EBITDA** para nenhum destes players (todos privados).

Inferências do modelo de negócio:
- Fee structure típica estimada (não confirmada por fonte): 10–20% dos revenues gerados, ou €5.000–€20.000/MW/ano em fee fixo
- A margem bruta tende a ser alta (software/serviços) — estimada 60–80% — mas sem confirmação de fonte
- EBITDA margin quando em escala: provavelmente 20–40% mas isto é inferência baseada em comparáveis SaaS de energia, não dado verificado

**Recomendação**: Para o business plan, usar o enspired revenue de €166.753/MW/ano como benchmark de mercado maduro, e aplicar desconto conservador para o mercado ibérico em maturação.

---

## 6. HIRING — MERCADO PORTUGAL

### Salários 2025 (Lisboa) — Dados Verificados

| Função | Range Salarial Anual | Fonte |
|--------|---------------------|-------|
| ML Engineer (júnior) | €34.000–€42.000 | Damia Group 2025 Portugal |
| ML Engineer (mid) | €42.000–€60.000 | Damia Group 2025 Portugal |
| ML Engineer (sénior) | €60.000–€84.000 (até €131k com top employer) | Payscale + Levels.fyi |
| Software Engineer (Lisbon) | ~€40.000 média | RemotifyEurope 2026 |
| Energy Markets Specialist | Não há dados públicos específicos para Portugal | — |
| Full-Stack Developer (sénior) | €45.000–€70.000 (estimativa baseada em tech benchmarks) | — |

**Nota Energy Markets Specialist**: não há dados salariais públicos específicos para este perfil em Portugal. Inferência: €50.000–€80.000/ano para perfil com 5+ anos de experiência em mercados ibéricos (ex-REN, ex-EDP, ex-OMIE), dado a escassez de talento.

### Onde Recrutar

**Talent pools**:
- **Ex-REN**: linkedin.com — procurar "REN Redes Energéticas Nacionais" + "energy markets" + "Portugal"
- **Ex-EDP/EDP Renováveis**: perfis com "trading", "energy markets", "flexibility"
- **Ex-Galp**: equipa de energy trading em Lisboa
- **OMIE**: poucos portugueses mas perfis valiosos

**Programas académicos relevantes**:
- **IST (Instituto Superior Técnico)**: Engenharia Eletrotécnica + pesquisa em "photovoltaic local energy markets" e smart grids. Parceria com Galp em clean energy research
- **FEUP (Porto)**: Prime Partner da Galp, PhD em Asset Management relevante, participação no CMU Portugal program
- Ambas as universidades têm outputs diretos para REN e empresas do setor
- **Mestrados relevantes**: MSc Engenharia Eletrotécnica (IST), MSc Energias Renováveis e Eficiência Energética (FEUP)

**Plataformas de recruramento**:
- LinkedIn (primário)
- ItJobs.pt (tech)
- Expresso Emprego (geral)
- Feiras de emprego IST e FEUP (março/outubro)

---

## 7. ESTRUTURA LEGAL RECOMENDADA

### Forma Jurídica

| Forma | Capital Mínimo | Recomendada para | Notas |
|-------|---------------|-----------------|-------|
| **Lda** | €1 | Fase early-stage, bootstrap | Mais simples; menos atraente para investidores |
| **SA** | €50.000 | Captação de investimento | Necessária para rounds formais; ações transferíveis |

**Recomendação para este caso**: Começar como **Lda** para velocidade e custo, com cláusula estatutária de conversão a SA antes de qualquer round de investimento. SA obrigatória se pretender estar cotada ou ter >5 sócios com participação ativa.

### CAE Codes Relevantes

| CAE | Descrição | Aplicabilidade |
|-----|-----------|---------------|
| **35140** | Comércio a retalho de eletricidade | Comercializador de mercado |
| **35113** | Distribuição de eletricidade | Produção/injeção rede |
| **62010** | Atividades de programação informática | Se componente software/plataforma |
| **70220** | Atividades de consultoria para os negócios e a gestão | Consultoria energia |

Para uma startup de otimização/agregação: **CAE principal 35140 + secundário 62010** (se tiver produto software).

### Necessidade de Licença de Comercializador vs Apenas Agregador

Distinção confirmada pela pesquisa:
- **Agregador independente**: regista-se na ERSE (código AGR); pode participar em mercados de ajuste e serviços de equilíbrio; não precisa necessariamente de licença de comercializador se não vender energia a consumidores finais
- **Comercializador de mercado**: registo DGEG obrigatório se vender energia a terceiros
- **Para este modelo de negócio** (otimizar BESS de terceiros e participar em mercados wholesale): necessário **ambos** — comercializador para comprar/vender no mercado spot, agregador para serviços de equilíbrio

**Nota**: A linha entre os dois pode ser ténue. Recomenda-se confirmação com advogado especializado (Macedo Vitorino ou PLMJ) antes de submeter pedidos.

### Capital Social Recomendado (Prático)

Embora o mínimo legal seja baixo:
- **Para credibilidade junto de DGEG/ERSE**: €25.000–€50.000 de capital subscrito recomendado (não há requisito legal específico para agregadores, mas demonstra solidez)
- **Para garantias OMIE**: necessidade de garantia financeira adicional (banco); não é capital social mas colateral específico — montante a confirmar com OMIE
- **Cushion operacional**: para operar com segurança, mínimo €100.000–€200.000 de capital de trabalho (legal fees, registo, equipa, IT antes de primeiros revenues)

---

## GAPS E CAVEATS

### O Que Não Foi Possível Verificar com Certeza

1. **Formulários DGEG específicos**: O portal DGEG não tem documentação pública detalhada do processo step-by-step para registo de agregadores. Contacto direto é indispensável.

2. **Prazo real do processo ERSE para novo agregador**: A timeline de 1–3 meses é extrapolação. O caso IGNIS não divulga a duração entre registo DGEG (março 2023) e obtenção do código AGR.

3. **Garantia financeira mínima OMIE**: Confirmado que existe, mas o valor exato para um novo agente português não está publicado. Necessário contactar omie.es diretamente.

4. **Preços FCR/aFRR ibéricos 2024**: Os dados da ERSE confirmam o custo total de ancilares (€7,66/MWh médio), mas não a desagregação por produto. Dados REN (mercado.ren.pt) podem ter mais detalhe — não consegui aceder ao PDF em cache.

5. **Revenue típico de um BESS de 10 MW em Portugal**: Não existe benchmark público português. O benchmark enspired (Alemanha) é o proxy mais próximo verificado. Aplicar desconto de 30–50% é uma estimativa de trabalho, não dado verificado.

6. **Contactos específicos na REN para qualificação técnica**: O contacto geral mercado@ren.pt está disponível, mas o processo de pré-qualificação para FCR/aFRR/mFRR não está documentado publicamente. Requere contacto direto com REN.

7. **Salários de Energy Markets Specialists em Portugal**: Sem dados públicos verificados. A range €50k–€80k é inferência, não dado de mercado.

8. **EBITDA margins dos comparáveis**: Todos os players são empresas privadas sem disclosure de margens. As estimativas de 60–80% bruta e 20–40% EBITDA são inferências analíticas.

9. **Contacto direto Infraventus**: Empresa sem perfil público claro. Acesso via intermediários (advogados, associações de setor como APREN).

---

## FONTES VERIFICADAS

- ERSE Relatório do Consumidor de Energia 2024: erse.pt/media/w13jyupd/relat%C3%B3rio-ce-2024_en.pdf
- Lista de agregadores ERSE (inclui IGNIS AGR0265EE): erse.pt/media/clkm4swv/cria_atualizado.pdf
- Lista de comercializadores DGEG: dgeg.gov.pt/pt/areas-setoriais/energia/energia-eletrica/atividades-e-profissoes/no-setor-eletrico-nacional/comercializadores-de-mercado/
- Lista unidades ofertantes OMIE: omie.es/sites/default/files/dados/listados/LISTA_UNIDADES.PDF
- Macedo Vitorino — Electricity storage in Portugal (2025): macedovitorino.com/en/knowledge/publications/Electricity-storage-in-portugalbr/6831/
- Macedo Vitorino — Year in Review 2025 Renewable Energy: macedovitorino.com/en/knowledge/publications/Year-in-Review-2025-Renewable-Energy/6876/
- enspired portfolio performance (KPMG verified): enspired-trading.com/portfolio-performance
- enspired Series B >€40M: enspired-trading.com/press-releases/enspired-extends-series-b-to-over-eur-40-million
- EDP BigBATT project: edp.com/en/projects/bigbatt-large-scale-battery-deployment-edp
- ess-news.com — Portugal BESS pipeline e leilão 750 MVA
- Damia Group 2025 Salários Portugal: damiagroup.pt/wp-content/uploads/HTTP-2025-Damia-Group-Portugal.pdf
- Legal 500 Portugal Energy 2024: legal500.com/guides/chapter/portugal-renewable-energy/
- GA_P Portugal Energy: ga-p.com/en/sector/energy/
- SPGlobal — OMIE spread data: spglobal.com/energy/en/news-research
