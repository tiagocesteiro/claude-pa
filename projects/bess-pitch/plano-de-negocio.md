---
title: "Plano de Negócio — BESS Optimizer Portugal"
date: 2026-03-24
tags: [business-plan, bess, energy, portugal, iberia, startup]
status: draft-v1
confidential: true
---

# Plano de Negócio
# BESS Optimizer — Otimização de Armazenamento de Energia com IA
### Portugal & Ibéria | 2026

> **Confidencial** — Documento preparado para apresentação a investidores. Não partilhar sem autorização.

---

## ÍNDICE

1. [Sumário Executivo](#1-sumário-executivo)
2. [Visão, Missão e Proposta de Valor](#2-visão-missão-e-proposta-de-valor)
3. [Análise de Mercado](#3-análise-de-mercado)
4. [Tecnologia — Arquitetura e Stack](#4-tecnologia--arquitetura-e-stack)
5. [Modelo de Negócio e Unit Economics](#5-modelo-de-negócio-e-unit-economics)
6. [Go-to-Market — Primeiros Clientes e Pipeline](#6-go-to-market--primeiros-clientes-e-pipeline)
7. [Processo Regulatório — Passo a Passo](#7-processo-regulatório--passo-a-passo)
8. [Equipa e Estrutura Organizacional](#8-equipa-e-estrutura-organizacional)
9. [Roadmap de Implementação — Mês a Mês](#9-roadmap-de-implementação--mês-a-mês)
10. [Projeções Financeiras](#10-projeções-financeiras)
11. [Necessidade de Investimento e Use of Funds](#11-necessidade-de-investimento-e-use-of-funds)
12. [Gestão de Risco](#12-gestão-de-risco)
13. [Estratégia de Saída](#13-estratégia-de-saída)
14. [Anexos](#14-anexos)

---

## 1. Sumário Executivo

### O Negócio

A BESS Optimizer é uma empresa portuguesa de software e serviços energéticos que gere baterias de armazenamento de energia (BESS) de terceiros utilizando algoritmos de Inteligência Artificial, maximizando as suas receitas em múltiplos mercados elétricos ibéricos em simultâneo.

Não compramos baterias. Gerimos baterias que já existem — ou vão existir — e capturamos uma percentagem das receitas geradas.

### A Oportunidade

Portugal atravessa uma janela de transformação única no setor energético:

- O quadro regulatório para agregadores independentes abriu apenas em **fevereiro de 2025** (primeira autorização histórica)
- Existe um concurso de **750 MVA de armazenamento standalone** para 2026, impulsionado pelo investimento público de €400M pós-blackout ibérico
- A **EDP vai instalar 180 MW de baterias em Carregado** (BigBATT, operacional em março de 2027)
- **Não existe nenhuma empresa nativa portuguesa** neste mercado — os únicos operadores são estrangeiros (IGNIS espanhola, Entrix alemã)

O mercado global de VPP (Virtual Power Plants) cresce de €6–8 mil milhões em 2025 para **€39–46 mil milhões em 2035**, com CAGR de 21–25%.

### O Modelo

Cobramos **10–25% das receitas geradas** pelo algoritmo para o proprietário da bateria — sem custo fixo, sem risco para o cliente. Escala para um modelo de Tolling (pagamento fixo mensal ao dono do ativo, com retenção de toda a receita de mercado) à medida que construímos track record.

### Benchmarks de Mercado

A empresa alemã **enspired** (referência mais próxima verificada por KPMG) gera em média **€166.753 por MW por ano** gerido em 2025. Aplicando um desconto conservador de 40% para o mercado ibérico em maturação: **€80.000–€120.000/MW/ano** estimado para Portugal/Espanha.

Com 15% de revenue share, a nossa receita estimada é **€12.000–€18.000 por MW por ano** — com custos marginais baixos por cada novo ativo adicionado.

### Pedido de Investimento

| Fase | Montante | Objetivo |
|------|----------|----------|
| **Pré-seed (imediato)** | €300.000–€400.000 | Equipa fundadora + processo regulatório + algoritmo MVP |
| **Seed (12 meses)** | €700.000–€1.200.000 | Go-live no primeiro ativo + escalar para 50–100 MW |

### Projeções (conservadoras)

| Ano | MW sob Gestão | Receita | EBITDA |
|-----|--------------|---------|--------|
| 2026 | 0 (shadow trading) | €0 | -€270K |
| 2027 | 40 MW (avg 20 MW) | €300K | -€35K |
| 2028 | 150 MW (avg 95 MW) | €1,45M | +€830K |

---

## 2. Visão, Missão e Proposta de Valor

### Visão

Ser o operador de referência de ativos de armazenamento de energia em Portugal e Ibéria — a empresa que os proprietários de baterias escolhem para maximizar as suas receitas de mercado.

### Missão

Tornar cada bateria instalada em Portugal economicamente ótima, combinando inteligência artificial com profundo conhecimento dos mercados energéticos ibéricos.

### Proposta de Valor

**Para os proprietários de BESS:**

- Sem investimento inicial: modelo de revenue share alinhado com resultados
- Mais receita do que conseguiriam sozinhos: o algoritmo opera em 3 camadas de mercado em simultâneo (arbitragem, FCR, aFRR/mFRR)
- Sem risco tecnológico: gerimos toda a integração SCADA, certificações regulatórias e operação 24/7
- Transparência total: dashboard em tempo real com performance, receitas e estado dos ativos
- Proteção do ativo: gestão ativa do estado de carga, degradação e ciclos

**Para o mercado:**

- Maior eficiência na integração de renováveis (as baterias bem otimizadas absorvem excesso solar, reduzindo curtailment)
- Serviços de equilíbrio mais robustos para a REN (frequência e tensão mais estáveis)

### Diferenciação

| Dimensão | Nós | IGNIS (ES) | Entrix (DE) |
|----------|-----|------------|-------------|
| Origem | Portugal | Espanha | Alemanha |
| Presença local | Sim — Lisboa | Remota | Remota |
| Língua/cultura | PT/ES | ES | DE/EN |
| Foco em PT | Primário | Secundário | Secundário |
| Conhecimento REN | Profundo | Limitado | Limitado |
| Velocidade regulatória PT | Máxima | Dependente | Dependente |

---

## 3. Análise de Mercado

### 3.1 TAM — Total Addressable Market

**Global:**
- Mercado VPP global 2025: ~€6,3–7,7 mil milhões
- Mercado VPP global 2035: ~€39–46 mil milhões
- CAGR 2025–2035: 21–25%
- Europa 2025: ~€1,5–2,6 mil milhões (crescimento mais rápido)

**Europa — BESS sob contratos de flexibilidade (2025):**
- ~24 GWh de BESS europeu sob acordos de otimização (triplicou vs 2024)
- Goldman Sachs: "European energy storage — a new multi-billion-dollar asset class"

### 3.2 SAM — Serviceable Addressable Market (Ibéria)

**Portugal — Pipeline de armazenamento:**

| Projeto | Empresa | Capacidade | Estado | Ano Operação |
|---------|---------|-----------|--------|-------------|
| Casal da Cortiça | Infraventus | 12 MVA / 24 MWh | **Operacional** | Jun 2025 |
| Leilão 750 MVA | Vários | 750 MVA standalone | Concurso 2026 | 2027–2028 |
| BigBATT | EDP | 180 MW / 360 MWh | Em construção | Mar 2027 |
| Sophia site | Lightsource bp | 300 MWh | Planeado | 2027 |
| Pego Hybrid Cluster | Endesa | 168,6 MW / 337 MWh | Planeado | 2027 |
| PRR — Akuo | Akuo | 80 MW | Pipeline | 2027 |
| PRR — Iberdrola | Iberdrola | 80 MW | Pipeline | 2027 |
| PRR — Galp | Galp | 55 MW | Pipeline | 2026 |
| Meta PNEC PT | — | 1.500 MW | Meta 2030 | — |

**Pipeline português total visível (2026–2028): >1.400 MW**

**Espanha — contexto:**
- Pipeline: >36 GW
- >20 GW com ponto de ligação à rede atribuído
- €818M em programas de armazenamento competitivos

**SAM estimado (Ibéria, acessível em 5 anos):** 500–1.000 MW sob gestão

**Receita total de mercado para os ativos (500 MW × €100K/MW/ano):** €50M/ano

**Nossa receita potencial (15% share):** €7,5M/ano a 500 MW

### 3.3 SOM — Serviceable Obtainable Market

**Horizonte 3 anos (até final de 2028):**
- Objetivo realista: **150–200 MW sob gestão**
- Receita própria: **€1,5M–€2,5M/ano**
- Lógica: 10–15 ativos de 10–20 MW cada

**Hipóteses de penetração:**
- Portugal tem ~15–20 promotores/donos de BESS identificáveis
- Nos primeiros 3 anos, objetivo de converter 5–8 em clientes
- Prioridade standalone (maior flexibilidade de otimização) > híbrido

### 3.4 Análise da Concorrência

**Players globais:**

| Empresa | HQ | Portfolio | Funding | Presença PT |
|---------|-----|---------|---------|------------|
| enspired | Áustria | >1,6 GW | >€40M Série B | Espanha (via Nexus) — PT não confirmado |
| Entrix | Alemanha | Pipeline >7 GW (via Kyon) | Privado | Anunciou PT em Out 2025 |
| Next Kraftwerke (RWE) | Alemanha | Maior VPP Europa | Adquirida pela RWE | Não confirmado PT |
| Flexcity (Veolia) | Bélgica | — | Grupo Veolia | Não confirmado PT |
| Capalo AI | Finlândia | >200 MW / >1 GWh | €500K pre-seed + €11M Série A | Báltico apenas |
| IGNIS Energía | Espanha | — | — | **Sim — 1.º agregador independente PT (Fev 2025)** |

**Análise de gaps competitivos:**

1. **Nenhum player nativo português** existe ou está em formação conhecida
2. Os estrangeiros operam remotamente — sem presença física em Lisboa
3. Os grandes utilities (EDP, Galp) têm capacidade in-house mas não oferecem serviço a terceiros
4. A barreira regulatória (certificação REN) protege de novas entradas rápidas

**Vantagem estrutural:** Ser o primeiro player nativo significa 9–15 meses de vantagem regulatória sobre qualquer novo concorrente português que apareça depois.

### 3.5 Dinâmicas de Mercado Favoráveis

1. **Intervalos de 15 minutos (Set 2025):** O MIBEL passou de intervalos horários para 15 minutos em setembro de 2025. Isto quadruplica as oportunidades de arbitragem intraday para baterias.

2. **Crescimento dos ancilares:** O custo dos serviços de equilíbrio em Portugal subiu 162% em 2024 (€7,66/MWh vs €2,92/MWh em 2023). Mais cara = maior remuneração para quem os fornece.

3. **Momentum político:** €400M de investimento público pós-blackout ibérico. O storage é prioridade política.

4. **mFRR novo:** Portugal adoptou o mFRR em março de 2024 e integrou a plataforma europeia MARI em novembro de 2024. Este produto é novo e tem menos concorrência — oportunidade para primeiro mover.

5. **Curtailments crescentes:** Portugal e Espanha têm episódios crescentes de preços negativos/zero por excesso de solar. As baterias que absorvem estes excedentes são pagas por isso — e é o nosso algoritmo que captura isso.

---

## 4. Tecnologia — Arquitetura e Stack

### 4.1 Visão Geral da Arquitetura

O sistema opera como um **cérebro central de otimização** que:
- Consome dados de mercado em tempo real (preços, sinais de frequência)
- Prevê preços futuros com ML
- Decide o despacho ótimo com Reinforcement Learning
- Executa automaticamente via SCADA/API

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE DADOS                             │
│  OMIE API ──► REN/REE feeds ──► Meteorologia ──► BMS da bateria │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              MOTOR DE PREVISÃO (Camada 1)                        │
│  XGBoost / Transformer ──► Preços 24–72h ──► Ancilares          │
│  Atualização: a cada 15 minutos                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│           MOTOR DE DECISÃO — DRL (Camada 2)                      │
│  Estado da bateria (SoC, temperatura, degradação)                │
│  + Preços futuros previstos                                      │
│  + Constrangimentos físicos do ativo                             │
│  ──► Política ótima: carregar / descarregar / aguardar           │
│  Treinado em milhões de simulações de mercado                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              CAMADA DE EXECUÇÃO (Camada 3)                        │
│  Licitação OMIE (day-ahead + intraday) ──── automática           │
│  Serviços de equilíbrio REN (FCR/aFRR/mFRR) ── automático        │
│  SCADA → BMS da bateria ──► Comando carga/descarga <100ms        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Camada 1 — Ingestão de Dados

**Fontes de dados:**

| Fonte | Dados | Frequência | Acesso |
|-------|-------|-----------|--------|
| OMIE | Preços day-ahead, intraday | 15 min | API pública (OMIEData Python) |
| REN | Sinais de equilíbrio, frequência | Tempo real | API REN (mercado.ren.pt) |
| REE | Sinais espanhóis | Tempo real | API REE (esios.ree.es) |
| ENTSO-E | Dados pan-europeus de rede | Horário | API transparência ENTSO-E |
| Meteorologia | Irradiância solar, vento | Horário | Open-Meteo (gratuito) / meteoblue |
| BMS da bateria | SoC, temperatura, ciclos | Segundos | IEC 61850 / MODBUS TCP |

**Infraestrutura de dados:**
- **InfluxDB** — base de dados de séries temporais (standard industria)
- **Apache Kafka** — streaming de dados em tempo real
- **AWS S3** — arquivo histórico para treino de modelos

### 4.3 Camada 2 — Motor de Previsão

**Previsão de preços (Forecasting):**

*Arquitetura:* Ensemble de modelos — XGBoost + Temporal Fusion Transformer (TFT)

*Inputs:*
- Histórico de preços OMIE (day-ahead + intraday) — últimos 2 anos
- Previsão de produção solar e eólica (dados ENTSO-E)
- Temperatura e irradiância (meteorologia)
- Hora do dia, dia da semana, sazonalidade
- Preços de gás natural (TTF) e CO₂

*Output:* Distribuição probabilística de preços para as próximas 24–72 horas, por intervalos de 15 minutos

*Performance target:* MAE (Mean Absolute Error) < €5/MWh para day-ahead ibérico

*Ferramentas:* Python · scikit-learn · XGBoost · PyTorch · Darts (biblioteca time-series)

**Previsão de ancilares:**
- Previsão de necessidades de equilíbrio FCR/aFRR/mFRR com base em dados históricos REN
- Previsão de preços de limpeza (clearing prices) dos serviços de equilíbrio

### 4.4 Camada 3 — Motor de Decisão (Deep Reinforcement Learning)

**Por que RL e não MILP clássico?**

O Mixed-Integer Linear Programming (MILP) — abordagem clássica — resolve o problema de otimização assumindo preços futuros conhecidos. Na realidade, os preços são incertos e os mercados de ancilares têm regras complexas (mínimos de potência, tempos de ativação, penalidades).

O **Deep Reinforcement Learning (DRL)** aprende uma política ótima através de milhões de simulações, lidando nativamente com incerteza e complexidade multi-mercado. Estudos publicados mostram **+58% de melhoria** vs MILP em arbitragem de energia.

**Implementação:**

*Framework:* OpenAI Gymnasium (ambiente de simulação) + Stable-Baselines3 (algoritmos RL)

*Algoritmo:* PPO (Proximal Policy Optimization) — estado da arte para problemas de controlo contínuo

*Estado (State):*
- SoC atual da bateria (0–100%)
- Capacidade disponível (degradação)
- Preços OMIE próximas 24h (previstos)
- Preços ancilares esperados
- Hora do dia, dia da semana

*Ação (Action):*
- Percentagem de potência para carregar (0–100% da capacidade)
- Percentagem de potência para descarregar (0–100%)
- Potência reservada para FCR/aFRR

*Recompensa (Reward):*
- Receita de arbitragem OMIE
- Receita de serviços de equilíbrio
- Penalidade por degradação acelerada
- Penalidade por não-conformidade com compromissos de mercado

*Treino:* Simulações sobre 2+ anos de dados históricos ibéricos; reteino semanal com dados recentes

**Gestão da bateria:**
- Modelo de degradação baseado em **empirical cycle-life models** (Wöhler curves para baterias Li-ion)
- Limites configuráveis de SoC mínimo/máximo (ex: 10%–90%) para preservar vida útil
- Gestão térmica: redução automática de potência em temperaturas elevadas

### 4.5 Camada 4 — Integração SCADA e Execução

**Protocolos de comunicação industrial:**

| Protocolo | Uso | Fabricantes suportados |
|-----------|-----|----------------------|
| **IEC 61850** | Subestações e BESS de grade utility | CATL, BYD, Saft, ABB |
| **MODBUS TCP** | Sistemas mais simples / legado | SMA, Fronius, Victron |
| **IEC 60870-5-104** | Telecontrol para operadores de rede | REN SCADA interface |
| **OpenDNP3** | Protocolo americano (alguns projetos EU) | Schneider Electric |

**Processo de integração com novo ativo:**
1. Análise do datasheet do BMS (1 semana)
2. Desenvolvimento do conector específico (1–4 semanas)
3. Testes em ambiente de staging (1 semana)
4. Shadow operation (2–4 semanas)
5. Go-live

**Licitação automática OMIE:**
- Registo como agente de mercado OMIE com acesso à API de submissão de ofertas
- Mensageria via protocolo ISO 20022 (standard europeu)
- Deadlines: ofertas day-ahead até 12h00 CET; intraday contínuo

**Certificação REN (FCR/aFRR/mFRR):**
- Pré-qualificação técnica: testes de resposta de frequência com o ativo
- IEC 60870-5-104 para telemedida em tempo real
- Conformidade com ENTSO-E Technical Requirements

### 4.6 Stack Tecnológico Completo

| Camada | Tecnologia | Justificação |
|--------|-----------|-------------|
| **Linguagem** | Python 3.12 | Standard de facto em ML/energia |
| **RL** | Stable-Baselines3 · PPO | Biblioteca RL mais usada em investigação e indústria |
| **Forecasting** | XGBoost · PyTorch · Darts | Ensemble robusto para séries temporais energéticas |
| **Dados mercado** | OMIEData · entsoe-py | Packages Python open-source para dados ibéricos |
| **Time-series DB** | InfluxDB | Standard industria para métricas em tempo real |
| **Streaming** | Apache Kafka | Dados de mercado e telemetria em tempo real |
| **SCADA/BMS** | pyiec61850 · pymodbus | Libraries Python para protocolos industriais |
| **Cloud** | AWS (EC2 + S3 + RDS) | Infraestrutura escalável com presença em Lisboa |
| **Orquestração** | Kubernetes + Docker | Deploy e escalabilidade do sistema |
| **Monitoring** | Grafana + InfluxDB | Dashboards operacionais 24/7 |
| **Alertas** | PagerDuty + Telegram | Alertas críticos para equipa de turno |
| **Backend API** | FastAPI (Python) | API interna e cliente dashboard |
| **Dashboard** | React + TypeScript | Interface cliente para performance e relatórios |
| **Base de dados** | PostgreSQL | Dados de contratos, clientes, relatórios |
| **CI/CD** | GitHub Actions | Deploy automático e testes |
| **Backtesting** | Custom framework (Python) | Validação histórica do algoritmo antes de deploy |

### 4.7 Roadmap Técnico

**Fase 0 — Meses 1–2: Fundação de Dados**
- [ ] Setup infraestrutura cloud (AWS)
- [ ] Pipeline OMIE (dados históricos + live via OMIEData)
- [ ] Pipeline REN/ENTSO-E
- [ ] Base de dados InfluxDB operacional
- [ ] Dashboard interno de monitorização de dados

**Fase 1 — Meses 3–5: Algoritmo Central**
- [ ] Feature engineering para forecasting de preços
- [ ] Modelo XGBoost de previsão day-ahead (MAE target: <€5/MWh)
- [ ] Ambiente de simulação Gymnasium com dados ibéricos
- [ ] Treino inicial do agente PPO em dados históricos 2023–2025
- [ ] Framework de backtesting e avaliação de performance

**Fase 2 — Meses 6–8: Integração com Ativo Real**
- [ ] Conector IEC 61850 para BMS do ativo piloto
- [ ] Shadow trading ao vivo (sistema operacional mas sem dinheiro real)
- [ ] Dashboard de performance para cliente
- [ ] Relatórios automáticos (receita, ciclos, estado do ativo)
- [ ] Processo de gestão de incidentes 24/7

**Fase 3 — Meses 9–12: Go-Live**
- [ ] Registo OMIE como agente de mercado ativo
- [ ] Primeiro despacho live no mercado day-ahead
- [ ] Qualificação FCR com REN (se certificação completa)
- [ ] Integração de segundo ativo
- [ ] Retrain semanal do modelo com dados recentes

**Fase 4 — Ano 2: Escala**
- [ ] Portfolio de 5–10 ativos
- [ ] Co-otimização de portfolio (diversificação reduz risco)
- [ ] Módulo de licitação estratégica (evitar impacto de mercado com volumes elevados)
- [ ] Expansão para Espanha (integração REE)
- [ ] Modelo de Tolling para clientes com track record

---

## 5. Modelo de Negócio e Unit Economics

### 5.1 Estruturas Comerciais

**Fase 1 — Revenue Share (0–24 meses)**

O otimizador captura uma percentagem das receitas líquidas geradas:

- Fee: **12–20%** das receitas de mercado geradas pelo algoritmo
- Baseline: receita que o ativo geraria com gestão manual pelo operador (estabelecida no contrato)
- Cobramos apenas sobre o excesso acima da baseline
- Sem custo fixo para o cliente
- Duração típica do contrato: 3–5 anos

*Exemplo prático (10 MW, 4h duration):*
- Revenue total do ativo: €1.000.000/ano (€100K/MW)
- Baseline acordada: €600.000/ano (o que o operador conseguiria sozinho)
- Revenue incremental: €400.000
- A nossa fee (15%): €60.000 — **€6.000/MW/ano**

*Alternativa (fee sobre receita total):*
- Revenue total: €1.000.000
- Fee 12%: €120.000 — **€12.000/MW/ano**

**Fase 2 — Tolling (24–48 meses)**

Após track record estabelecido, pagamos ao dono do ativo uma taxa fixa mensal e retemos toda a receita de mercado:

- Toll típico: €40.000–€80.000/MW/ano (garantia de receita ao proprietário)
- Nossa receita bruta: €100.000–€120.000/MW/ano
- Nossa margem bruta: €20.000–€80.000/MW/ano (20–67%)
- Requer capital de working capital mas captura muito mais upside

**Fase 3 — SaaS (36+ meses)**

Para grandes utilities que querem gerir internamente:
- Licença anual do software: €100.000–€500.000/ano (flat fee)
- Taxa de integração inicial: €50.000–€150.000
- Manutenção e updates: incluídos
- Sem revenue share — receita previsível

**Fase 4 — Floor Price (híbrido)**

Para clientes que precisam de bankability (financiamento bancário):
- Garantimos X €/MWh mínimo ao proprietário
- Acima do floor, partilhamos 70/30 (cliente/nós)
- Popular para projetos financiados com dívida

### 5.2 Unit Economics (Modelo Revenue Share, Conservador)

**Revenue por MW (estimativa ibérica, base conservadora):**

| Fonte de Receita | Revenue/MW/ano | Confiança |
|-----------------|---------------|-----------|
| Arbitragem spot (OMIE) | €30.000–€50.000 | Média — baseado em spreads OMIE 2024/25 |
| FCR (Frequency Containment Reserve) | €15.000–€25.000 | Baixa — sem dados PT verificados |
| aFRR/mFRR | €15.000–€30.000 | Baixa — produto novo em PT |
| **Total estimado** | **€60.000–€105.000** | **Conservador vs enspired (€166K DE)** |

**Nossa receita por MW (fee 15% sobre total):**

| Cenário | Revenue/MW/ano para nós |
|---------|------------------------|
| Pessimista (€60K × 15%) | **€9.000/MW/ano** |
| Base (€85K × 15%) | **€12.750/MW/ano** |
| Otimista (€105K × 15%) | **€15.750/MW/ano** |

**Custo marginal de servir 1 MW adicional (após integração inicial):**

| Item | Custo anual estimado |
|------|---------------------|
| Engenharia (integração inicial, one-time) | €15.000–€30.000 |
| Cloud (cálculo, armazenamento de dados) | €2.000–€5.000/ano |
| Monitorização/suporte 24/7 | €3.000–€6.000/ano |
| Legal/contratual | €2.000/ano |
| **Total custo marginal anual** | **€7.000–€11.000/MW/ano** |

**Gross Margin por MW (após integração):**

| Cenário | Revenue | Custo | Gross Margin |
|---------|---------|-------|-------------|
| Pessimista | €9.000 | €11.000 | **-€2.000** (loss primeiro ano) |
| Base | €12.750 | €9.000 | **€3.750 (29%)** |
| Otimista | €15.750 | €7.000 | **€8.750 (56%)** |

*Nota: a perda no cenário pessimista no primeiro ano de cada ativo é recuperada nos anos seguintes (custos de integração são one-time). Com 3+ anos de contrato, todos os cenários são positivos.*

**Economics a escala (100 MW sob gestão, cenário base):**

- Receita: 100 MW × €12.750 = **€1.275.000/ano**
- Custos marginais: 100 MW × €9.000 = **€900.000/ano**
- Contribuição marginal: **€375.000/ano**
- Overheads fixos (equipa 8 pessoas, escritório, etc.): **~€650.000/ano**
- EBITDA: **-€275.000** (ainda loss a 100 MW — breakeven ~125 MW)

*Nota: estes números assumem que a equipa já cresceu para 8 pessoas para suportar 100 MW. Com equipa de 5 pessoas, breakeven seria ~60–80 MW.*

**Breakeven Analysis:**

- Equipa de 4 FTE: overheads ~€350K/ano → breakeven a **~28 MW**
- Equipa de 6 FTE: overheads ~€480K/ano → breakeven a **~38 MW**
- Equipa de 8 FTE: overheads ~€650K/ano → breakeven a **~51 MW**

**Conclusão:** Com uma equipa enxuta de 4–5 pessoas, o breakeven operacional é atingível com apenas **30–40 MW** sob gestão — o equivalente a 3–4 ativos de 10 MW.

---

## 6. Go-to-Market — Primeiros Clientes e Pipeline

### 6.1 Segmentação de Clientes

**Tier 1 — Target Imediato (2026):**
Proprietários de BESS standalone operacionais ou em fase final de construção, sem solução de otimização in-house, <50 MW.

*Por que standalone?* Maximiza flexibilidade de despacho — não há restrições de co-localização com solar/eólico.

**Tier 2 — Target Médio Prazo (2027):**
Winners do leilão 750 MVA (2026) — estes projetos precisarão de otimizador desde o dia 1.

**Tier 3 — Target Longo Prazo (2028+):**
Grandes utilities com portfolios híbridos (EDP, Galp, Iberdrola) — menor urgência, maior ticket.

### 6.2 Pipeline de Primeiros Clientes

**1. Infraventus Energy Storage — Casal da Cortiça, Leiria**

| Atributo | Detalhe |
|----------|---------|
| Ativo | 12 MVA / 24 MWh — standalone merchant |
| Estado | **Operacional desde junho 2025** — único standalone merchant de grande escala em Portugal |
| Urgência | Alta — já a participar no mercado; pode estar a deixar receita na mesa |
| Por que nós | Empresa pequena, sem capacidade de otimização in-house; provavelmente a usar estratégia básica de despacho |
| Acesso | Via Macedo Vitorino (assessoraram o projeto) ou LinkedIn |
| Proposta | Revenue share sobre melhoria demonstrada em shadow trading de 60 dias |
| Potencial | 12 MW × €12.750 = **~€153.000/ano** de receita para nós |

**2. Winners do Leilão 750 MVA (2026)**

| Atributo | Detalhe |
|----------|---------|
| Timing | Leilão em H1 2026, adjudicação esperada H2 2026, construção 2026–2027 |
| Target | Os 3–5 maiores vencedores de projetos standalone |
| Abordagem | Entrar em contacto **durante o processo de leilão** — os promotores já estarão a pensar em revenue models |
| Proposta | Assinatura de LOI (Letter of Intent) enquanto constroem — garantimos solução de otimização para day 1 |
| Potencial | 50–200 MW adicional |

**3. EDP BigBATT — Carregado**

| Atributo | Detalhe |
|----------|---------|
| Ativo | 180 MW / 360 MWh — maior BESS em Portugal quando operacional |
| Estado | Em construção, operacional março 2027 |
| Complexidade | EDP tem capacidade in-house considerável — harder sell |
| Abordagem | Proposta de co-gestão ou piloto numa fatia do portfolio |
| Potencial de longo prazo | 180 MW × €12.750 = **€2.295.000/ano** de receita |

**4. Promotores PRR (Akuo, Iberdrola PT, Galp BESS)**

| Empresa | Capacidade | Estado | Nota |
|---------|-----------|--------|------|
| Galp (Alcoutim) | 5 MW / 20 MWh | Operacional Abr 2025 | Híbrido — menos flexível |
| Akuo PT | 80 MW | Pipeline | Empresa francesa — aberta a parcerias |
| Iberdrola PT | 80 MW | Pipeline | Grande player — processo de venda longo |

### 6.3 Estratégia de Outreach

**Fase 1 — Shadow Trading como Ferramenta de Venda (Meses 4–8)**

Antes de ter qualquer cliente, usamos dados históricos OMIE para fazer shadow trading retroativo no portfolio de cada target:

1. Simular operação do ativo do cliente com o nosso algoritmo (dados históricos)
2. Comparar receita simulada vs receita real do cliente (se disponível) ou benchmark de mercado
3. Apresentar: "Com o nosso algoritmo, o seu ativo teria gerado €X a mais nos últimos 6 meses"
4. Propor: 60 dias de shadow trading ao vivo sem compromisso

Este approach elimina o risco percebido para o cliente e é o argumento de venda mais poderoso disponível.

**Fase 2 — Rede de Referências**

- Macedo Vitorino (já assessorou Infraventus — acesso privilegiado)
- APREN (Associação de Energias Renováveis) — networking com promotores
- REN (conhecimento regulatório — potencial de advisors)
- IST/FEUP (professores com ligações a projetos de armazenamento)

**Fase 3 — Conteúdo e Posicionamento**

- Newsletter mensal com análise de mercado OMIE/REN (gera credibilidade)
- Relatório anual de performance do mercado ibérico de armazenamento
- Participação em conferências setoriais (Energy Storage Summit, REI)

### 6.4 Proposta Comercial Tipo

**Documento de 2 páginas enviado ao cliente:**

1. **Diagnóstico** (personalizado): "Com base nos dados públicos OMIE e no perfil do vosso ativo, estimamos que a gestão atual está a capturar apenas X% do potencial de mercado."

2. **Proposta de Shadow Trading**: "Propomos 60 dias de shadow trading sem compromisso: gerimos a bateria em paralelo com o vosso sistema e mostramos o delta de receita. Sem riscos, sem custos."

3. **Modelo Comercial**: "Se o shadow trading demonstrar valor, avançamos para contrato de revenue share de 3 anos — pagam-nos apenas sobre as receitas incrementais que geramos."

4. **Garantias**: "Nunca activamos um despacho não aprovado por vocês. Começamos com modo de sugestão — vocês validam, nós executamos."

---

## 7. Processo Regulatório — Passo a Passo

### 7.1 Visão Geral

Para operar como agregador independente e otimizador de BESS em Portugal, são necessários **5 registos/certificações** em 5 entidades diferentes. O processo total demora **9–15 meses** e deve começar no **Mês 1** da empresa.

**Timeline crítico:** O processo regulatório é o caminho crítico do negócio. Não é possível fazer live trading sem concluir todos os passos. Por isso, o início imediato é essencial mesmo antes de ter o primeiro cliente.

### 7.2 Passo 1 — Constituição da Empresa

**Prazo:** 2–4 semanas | **Custo:** €500–€2.000

**Tarefas:**
- [ ] Constituir **SA** (Sociedade Anónima) para captação de investimento externo
  - Capital social recomendado: **€50.000** (mínimo legal) mas sugere-se €100.000 para credibilidade
  - Alternativa para bootstrapping: Lda (€1 mínimo, conversão a SA antes de round)
- [ ] Obter NIF na Autoridade Tributária
- [ ] Declarar início de atividade com **CAE 35140** (Comércio de eletricidade) + **CAE 62010** (programação informática)
- [ ] Abrir conta bancária empresarial (CGD, BPI ou Santander — todos com produtos para PMEs)
- [ ] Registar marca (INPI) — opcional mas recomendado

**Onde:**
- Registo Comercial Online: justiça.gov.pt
- Autoridade Tributária: portaldasfinancas.gov.pt

### 7.3 Passo 2 — Registo DGEG como Comercializador de Mercado

**Prazo:** 2–4 meses | **Custo:** €5.000–€15.000 (legal fees)

**Entidade:** DGEG — Direção-Geral de Energia e Geologia
**Portal:** dgeg.gov.pt
**Contacto:** +351 210 924 600 | info@dgeg.gov.pt

**O que é:** A licença de comercializador de mercado permite comprar e vender eletricidade no mercado grossista (OMIE). Sem isto, não é possível participar no day-ahead ou intraday.

**Referência verificada:** IGNIS Energía SL registou-se em **13 de março de 2023** (posição 130 na lista DGEG pública). Foi a primeira empresa a obter este registo como pré-requisito para o papel de agregador em Portugal.

**Documentação típica (confirmar com DGEG):**
- Prova de constituição de pessoa coletiva (certidão permanente)
- Capacidade técnica: currículo da equipa + plano de atividade
- Capacidade financeira: capital mínimo subscrito, extratos bancários
- Plano de negócio resumido
- Seguro de responsabilidade civil

**Ação imediata:** Contactar DGEG por email (info@dgeg.gov.pt) para obter lista de documentos atualizada e agendamento de reunião de pré-submissão.

**Advogado recomendado:** Macedo Vitorino ou PLMJ para preparar submissão.

### 7.4 Passo 3 — Registo ERSE como Agregador Independente

**Prazo:** 1–3 meses (após DGEG) | **Custo:** €5.000–€10.000 (legal fees)

**Entidade:** ERSE — Entidade Reguladora dos Serviços Energéticos
**Portal:** erse.pt
**Contacto:** +351 217 892 700 | erse@erse.pt

**O que é:** O código AGR (Agregador) emitido pela ERSE é o que permite participar em mercados de ajuste e serviços de equilíbrio. É distinto da licença de comercializador DGEG.

**Referência verificada:** IGNIS Energía tem código **AGR0265EE** na lista pública ERSE. A lista está disponível em: erse.pt/media/clkm4swv/cria_atualizado.pdf

**Documentação (confirmar com ERSE):**
- Registo DGEG completado
- Termo de compromisso de independência (não ser afiliado a distribuidor ou comercializador em regime de serviço universal)
- Plano de atividade como agregador
- Prova de capacidade técnica para gerir flexibilidade

**Diretivas relevantes:** Diretiva ERSE 6/2025 e 11/2025 (registo de PPAs e programação via GGS)

### 7.5 Passo 4 — Registo OMIE como Agente de Mercado

**Prazo:** 1–2 meses | **Custo:** €2.000–€5.000 (legal/admin) + garantia financeira

**Entidade:** OMIE — Operador del Mercado Ibérico de Energía
**Portal:** omie.es
**Contacto:** info@omie.es | +34 915 228 200

**O que é:** O registo OMIE permite submeter ofertas de compra/venda no mercado ibérico de eletricidade (day-ahead e intraday). É onde acontece a arbitragem.

**Referência verificada:** IGNIS Energía aparece na lista de unidades ofertantes OMIE (lista pública: omie.es/sites/default/files/dados/listados/LISTA_UNIDADES.PDF)

**Requisitos:**
- Autorização do regulador nacional (ERSE) — pré-requisito
- Conformidade com sistemas IT OMIE (mensageria ISO 20022)
- **Garantia financeira:** a confirmar diretamente com OMIE (estimativa: €50.000–€200.000 dependendo de volumes)

**Ação crítica:** Contactar OMIE diretamente para obter o valor exato da garantia financeira para um novo agente português — este é o número mais incerto do plano.

**Conformidade técnica:** O sistema de submissão de ofertas deve ser compatível com o protocolo OMIE. Existe um ambiente de testes (sandbox) disponível para certificar a integração.

### 7.6 Passo 5 — Qualificação Técnica REN para Serviços de Equilíbrio

**Prazo:** 3–6 meses | **Custo:** €10.000–€25.000 (engenharia + legal)

**Entidade:** REN — Redes Energéticas Nacionais (TSO)
**Portal:** ren.pt
**Contacto:** mercado@ren.pt | +351 210 013 200

**O que é:** Para fornecer FCR, aFRR ou mFRR à REN, o ativo (e o sistema de controlo) tem de ser pré-qualificado tecnicamente. É o processo mais complexo e demorado.

**Serviços de equilíbrio disponíveis em Portugal:**
- **FCR** (Frequency Containment Reserve): resposta automática em segundos; produto mais estabelecido
- **aFRR** (automatic Frequency Restoration Reserve): resposta em 30s; integrado na plataforma PICASSO europeia
- **mFRR** (manual Frequency Restoration Reserve): novo produto adoptado em **14 março 2024**; integrado na plataforma MARI europeia em **28 novembro 2024**. Maior oportunidade — mercado novo, menos competição

**Requisitos técnicos (confirmar com REN):**
- Capacidade de resposta em frequência dentro dos limites ENTSO-E
- Telemedida em tempo real para REN via IEC 60870-5-104
- Conformidade com Technical Requirements ENTSO-E para cada produto
- Testes de pré-qualificação com o ativo real

**Estratégia de mitigação:** Se a qualificação REN demorar mais do que previsto, podemos operar apenas em mercado spot (OMIE) no interim — menor margem mas prova de conceito e geração de receita real.

### 7.7 Passo 6 — GGS (Sistema de Gestão de Grau)

**Para volumes maiores (>1 MW horário, >1,5 GWh/ano):**
- Programação via GGS — Gestor de Gestão de Mercado
- PPAs bilaterais de longa duração (>1 ano)
- Relevante quando escalar para portfólios de >50 MW

### 7.8 Resumo da Timeline Regulatória

```
Mês  1: Constituição empresa + NIF + CAE + conta bancária
Mês  2: Submissão DGEG (comercializador de mercado)
Mês  3: Submissão DGEG (continuação) + início processo ERSE
Mês  4: Esperando DGEG / preparação OMIE / contacto REN
Mês  5: DGEG aprovado → Submissão ERSE como agregador
Mês  6: ERSE em análise / preparação OMIE
Mês  7: ERSE aprovado → Submissão OMIE
Mês  8: OMIE em análise / início pré-qualificação REN
Mês  9: OMIE aprovado → Início trading spot (day-ahead)
Mês 10: Pré-qualificação REN FCR (testes com ativo piloto)
Mês 11: Pré-qualificação REN aFRR
Mês 12: REN qualificado → Operação plena FCR + aFRR + OMIE
Mês 15: Qualificação mFRR (mercado mais novo, processo separado)
```

**Receita por fase:**
- Meses 1–8: €0 (shadow trading, validação)
- Meses 9–11: Receita de arbitragem OMIE (sem ancilares)
- Mês 12+: Receita completa (OMIE + FCR + aFRR)
- Mês 15+: Revenue máximo (+ mFRR)

### 7.9 Assessoria Legal Recomendada

**Advogados de energia em Portugal:**

| Escritório | Especialização | Contacto | Porquê |
|-----------|---------------|---------|--------|
| **Macedo Vitorino** | DL 15/2022, storage, ERSE | joao@macedovitorino.com | Assessoraram Casal da Cortiça; Chambers Band 1 |
| **PLMJ** | Aggregators, DL 15/2022, EDP projects | paulo.alvarinho@plmj.pt | Legal 500 Tier 1; experiência em demand aggregation |
| **GA_P** | Regulação ERSE, energy & regulatory | ga-p.com/en | Legal 500 Tier 1; "deep knowledge of energy sector" |
| **Cuatrecasas** | Cross-border Ibéria | miguel.fonseca@cuatrecasas.com | Ideal para expansão simultânea ES+PT |

**Recomendação:** Iniciar com Macedo Vitorino para o processo DGEG/ERSE (expertise mais específico e conexão direta com o setor de storage em Portugal). Complementar com Cuatrecasas quando expandir para Espanha.

**Budget legal anual:** €30.000–€60.000 (Ano 1, processo completo) → €15.000–€25.000/ano (manutenção)

---

## 8. Equipa e Estrutura Organizacional

### 8.1 Equipa Fundadora Mínima Viável

| Papel | Perfil | Salário Anual (PT) | Prioridade |
|-------|--------|-------------------|------------|
| **CEO / Business Dev** | António (fundador) | Diferido / mínimo | Imediato |
| **CTO / ML Engineer** | Sénior, 5+ anos RL/forecasting | €65.000–€80.000 | Mês 1–2 |
| **Energy Markets Specialist** | Ex-REN, ex-EDP ou ex-OMIE, 5+ anos | €55.000–€75.000 | Mês 4–6 |
| **Full-Stack Developer** | 3+ anos, Python/React | €45.000–€60.000 | Mês 6–8 |

**Custos totais de pessoal — Ano 1 (com TSU patronal 23,75%):**

| Pessoa | Salário Bruto | TSU (23,75%) | Custo Total |
|--------|-------------|-------------|------------|
| CEO (mínimo) | €36.000 | €8.550 | €44.550 |
| CTO (desde mês 1) | €72.000 | €17.100 | €89.100 |
| Energy Specialist (desde mês 5) | €66.000 × 8/12 | proporcional | €54.450 |
| Developer (desde mês 7) | €52.000 × 6/12 | proporcional | €32.175 |
| **Total Ano 1** | | | **€220.275** |

### 8.2 Perfis Detalhados

**CTO / ML Engineer (Prioridade 1)**

*Background ideal:*
- PhD ou MSc em Machine Learning, Engenharia Elétrica ou afim
- Experiência em RL (Stable-Baselines3, RLlib) e time-series forecasting
- Experiência em sistemas de energia (não obrigatório mas fortemente preferido)
- Capaz de construir de raiz e liderar tecnicamente

*Onde recrutar:*
- IST (Lisboa) — ex-alunos/doutorandos de Engenharia Eletrotécnica
- FEUP (Porto) — programas de energias e sistemas
- LinkedIn: pesquisa "machine learning" + "energy" + "Portugal"
- Comunidade PyData Lisboa
- Redes de ex-alunos de empresas como Galp (digital), Critical Software, Feedzai

**Energy Markets Specialist (Prioridade 2)**

*Background ideal:*
- 5+ anos em mercados ibéricos de eletricidade (trading, gestão de ativos, programação)
- Conhecimento profundo de OMIE, REN, ERSE, mecanismos de equilíbrio
- Experiência em BESS, solar ou eólico preferida
- Rede de contactos no setor — crucial para primeiro cliente

*Onde recrutar:*
- Ex-colaboradores REN (departamento de mercados)
- Ex-EDP Trading / EDP Produção
- Ex-Galp Energy Solutions
- Ex-OMIE (poucos portugueses, mas existem)
- Associação APREN — networking

**Full-Stack Developer (Prioridade 3)**

*Background ideal:*
- Python sólido (FastAPI, async)
- React/TypeScript para dashboard cliente
- Experiência com bases de dados (PostgreSQL, InfluxDB)
- Bónus: experiência com Kafka, Kubernetes

### 8.3 Advisors Estratégicos

Complementar a equipa com 2–3 advisors sem remuneração fixa (opções sobre capital):

| Advisor | Perfil | Valor |
|---------|--------|-------|
| **Energy Regulatory** | Ex-diretor DGEG ou ERSE | Acesso a regulador, atalho no processo |
| **REN Insider** | Ex-responsável de mercados REN | Acelera pré-qualificação técnica |
| **Investidor Energia** | VC ou family office com portfolio energético | Acesso a deal flow de promotores BESS |

### 8.4 Plano de Contratação — 3 Anos

```
Ano 1 (2026): CEO + CTO + Energy Specialist + Developer = 4 FTE
Ano 2 (2027): + Data Engineer + Customer Success + ML Engineer Jr = 7 FTE
Ano 3 (2028): + Operations Lead + Sales Manager + 2x ML Engineers = 11 FTE
```

**Custo total de pessoal estimado:**
- Ano 1: €220.000
- Ano 2: €420.000
- Ano 3: €680.000

### 8.5 Cultura e Valores

- **Rigor antes de velocidade:** Nunca ir live sem shadow trading validado
- **Transparência com clientes:** Relatórios diários de performance, sem surpresas
- **Open-source first:** Sempre que possível, contribuir de volta à comunidade
- **Localismo:** Ser genuinamente portugueses — relações, língua, conhecimento do mercado

---

## 9. Roadmap de Implementação — Mês a Mês

### Mês 1–2: Fundação

**Legal e administrativo:**
- [ ] Constituir empresa (SA ou Lda) e obter NIF
- [ ] Abrir conta bancária empresarial
- [ ] Contratar escritório de advogados de energia (Macedo Vitorino)
- [ ] Reunião de pré-submissão com DGEG
- [ ] Submissão do processo DGEG (comercializador de mercado)

**Equipa:**
- [ ] Onboarding do CTO/ML Engineer
- [ ] Setup ferramentas (GitHub, Notion, Slack, AWS)

**Tecnologia:**
- [ ] Setup infraestrutura AWS (EC2, S3, RDS, InfluxDB)
- [ ] Pipeline de dados OMIE históricos (via OMIEData Python package)
- [ ] Primeiros dashboards internos de análise de mercado

**Business Development:**
- [ ] Mapeamento dos 15–20 promotores de BESS em Portugal
- [ ] Primeiros contactos exploratórios (email/LinkedIn) com Infraventus e outros

---

### Mês 3–4: Algoritmo e Regulação

**Tecnologia:**
- [ ] Feature engineering completo para forecasting de preços OMIE
- [ ] Primeiro modelo XGBoost de previsão day-ahead treinado
- [ ] Avaliação: MAE <€8/MWh (fase inicial)
- [ ] Ambiente de simulação Gymnasium com dados ibéricos 2022–2025
- [ ] Primeiros testes do agente PPO em simulação

**Regulatório:**
- [ ] Follow-up DGEG (processos demoram 2–4 meses)
- [ ] Início do processo ERSE (preparação de documentação)
- [ ] Contacto inicial com OMIE para perceber requisitos de registo

**Business Development:**
- [ ] Primeiro shadow trading retroativo: simular performance histórica de Casal da Cortiça com o algoritmo
- [ ] Preparar deck de apresentação para Infraventus baseado nos resultados

---

### Mês 5–6: Shadow Trading e Primeiro Cliente

**Equipa:**
- [ ] Onboarding do Energy Markets Specialist

**Tecnologia:**
- [ ] Modelo de forecasting refinado (MAE target: <€6/MWh)
- [ ] Primeiro agente DRL com performance consistente em simulação
- [ ] Backtesting completo: 2 anos de dados ibéricos

**Regulatório:**
- [ ] DGEG aprovado (expectativa) → Submissão imediata ERSE
- [ ] Preparação técnica para registo OMIE

**Business Development:**
- [ ] Reunião formal com Infraventus: apresentação + proposta de shadow trading ao vivo (60 dias, sem compromisso)
- [ ] Assinatura de NDA e acesso a dados do ativo para shadow trading
- [ ] Apresentação a promotores do leilão 750 MVA (fase de pré-licitação)

---

### Mês 7–8: Integração e Shadow Trading Ao Vivo

**Equipa:**
- [ ] Onboarding do Full-Stack Developer

**Tecnologia:**
- [ ] Desenvolvimento do conector SCADA/IEC 61850 para o ativo Infraventus
- [ ] Primeiros dados reais do BMS recebidos e processados
- [ ] Dashboard de performance cliente (versão alpha)
- [ ] Shadow trading ao vivo: sistema operacional em paralelo com sistema atual do cliente

**Regulatório:**
- [ ] ERSE aprovado (expectativa) → Submissão OMIE
- [ ] Início do processo de pré-qualificação REN (contacto técnico, documentação)

**Business Development:**
- [ ] 30 dias de shadow trading completados: apresentação de resultados intermédios a Infraventus
- [ ] Contacto com pelo menos 2 outros promotores de BESS para pipeline

---

### Mês 9–10: Go-Live (Arbitragem)

**Tecnologia:**
- [ ] Sistema de licitação OMIE automático certificado
- [ ] Go-live no mercado day-ahead com primeiro ativo (Infraventus)
- [ ] Monitorização 24/7 operacional (Grafana + PagerDuty)
- [ ] Primeiros alertas e runbooks de incidentes definidos

**Regulatório:**
- [ ] OMIE aprovado → Primeiras licitações day-ahead
- [ ] Testes de pré-qualificação FCR com REN (testes técnicos com ativo real)

**Financeiro:**
- [ ] **Primeiras receitas reais** (arbitragem OMIE — sem ancilares ainda)
- [ ] Relatório de performance mensal para investidores
- [ ] Início de conversação para Seed Round completo

**Business Development:**
- [ ] 60 dias de shadow trading completados → Assinatura de contrato de revenue share com Infraventus
- [ ] Segunda reunião com promotores leilão 750 MVA

---

### Mês 11–12: Operação Completa

**Tecnologia:**
- [ ] Qualificação FCR completa → Go-live em ancilares FCR
- [ ] Qualificação aFRR → Go-live aFRR
- [ ] Dashboard cliente v2 (com relatórios automáticos e exportação)
- [ ] Segundo ativo em pipeline de integração

**Financeiro:**
- [ ] Receita completa (OMIE + FCR + aFRR) do primeiro ativo
- [ ] Projeção: €10.000–€15.000/mês do ativo Infraventus (12 MW × €12.750/ano ÷ 12)
- [ ] Seed Round em curso

**Business Development:**
- [ ] LOI assinado com segundo cliente (winner leilão 750 MVA ou outro)
- [ ] Apresentação de resultados reais a potenciais investidores (track record de 3 meses)

---

### Meses 13–18: Seed Round e Escala

**Mês 13:** Fechar Seed Round (€700K–€1,2M)
**Mês 14:** Contratar Data Engineer + Customer Success
**Mês 15:** Qualificação mFRR (novo produto, maior margem)
**Mês 16:** Segundo ativo live (10–20 MW)
**Mês 17:** Início expansão para Espanha (registo CNMC/REE)
**Mês 18:** Terceiro ativo live — 40+ MW sob gestão total

---

## 10. Projeções Financeiras

> **Nota metodológica:** As projeções baseiam-se em benchmarks verificados (enspired Alemanha, dados ERSE 2024) com desconto conservador de 40% para o mercado ibérico em maturação. Valores marcados com ⚠ são estimativas de trabalho com incerteza significativa.

### 10.1 Premissas Chave

| Premissa | Valor | Confiança |
|----------|-------|-----------|
| Revenue/MW/ano total do ativo (Ibéria) | €85.000 | Baixa ⚠ |
| Nossa fee (revenue share) | 15% | Média |
| Nossa receita/MW/ano | **€12.750** | Baixa ⚠ |
| Custo marginal/MW/ano (após integração) | €9.000 | Média |
| Integração one-time por ativo | €20.000 | Média |
| Custo de cloud/infra base | €18.000/ano | Alta |
| Aluguer escritório Lisboa | €15.000/ano | Alta |
| ML Engineer sénior (gross) | €72.000/ano | Alta |
| Energy Specialist (gross) | €66.000/ano | Média |
| Developer (gross) | €52.000/ano | Alta |
| TSU patronal | 23,75% | Alta |

### 10.2 P&L — 3 Anos

#### ANO 1 — 2026 (Pré-Revenue)

| Item | Valor |
|------|-------|
| **RECEITA** | |
| Trading live (9 meses × €10K/mês × 12 MW) | **€0–€30.000** ⚠ |
| *Nota: receita potencial meses 9–12 se tudo corre bem* | |
| **TOTAL RECEITA** | **€0–€30.000** |
| | |
| **CUSTOS OPERACIONAIS** | |
| Pessoal (ver detalhe 8.1) | €220.275 |
| Advogados de energia (DGEG + ERSE + OMIE + REN) | €45.000 |
| Cloud e infraestrutura AWS | €15.000 |
| Aluguer escritório Lisboa (Mês 4+) | €10.000 |
| Viagens e BD | €12.000 |
| Seguros e outros | €8.000 |
| Marketing/website | €5.000 |
| **TOTAL CUSTOS** | **€315.275** |
| | |
| **EBITDA** | **-€285.275 a -€315.275** |
| **Cash needed (com buffer 20%)** | **€380.000** |

#### ANO 2 — 2027 (Primeiras Receitas)

| MW sob gestão | Q1: 12 MW | Q2: 12 MW | Q3: 30 MW | Q4: 42 MW | Média: 24 MW |
|---------------|-----------|-----------|-----------|-----------|-------------|

| Item | Valor |
|------|-------|
| **RECEITA** | |
| Revenue trading (24 MW avg × €12.750) | **€306.000** |
| Integrações one-time (2 novos ativos × €20K) | **€40.000** |
| **TOTAL RECEITA** | **€346.000** |
| | |
| **CUSTOS OPERACIONAIS** | |
| Pessoal (7 FTE, equipa crescida) | €420.000 |
| Cloud e infraestrutura | €30.000 |
| Aluguer escritório | €18.000 |
| Advogados (manutenção) | €20.000 |
| Viagens e BD (expansão ES) | €20.000 |
| Outros | €15.000 |
| **TOTAL CUSTOS** | **€523.000** |
| | |
| **EBITDA** | **-€177.000** |
| **Cash needed** | **€210.000 (coberto pela Seed Round)** |

#### ANO 3 — 2028 (Breakeven e Crescimento)

| MW sob gestão | Q1: 50 MW | Q2: 80 MW | Q3: 130 MW | Q4: 170 MW | Média: 108 MW |
|---------------|-----------|-----------|-----------|-----------|-------------|

| Item | Valor |
|------|-------|
| **RECEITA** | |
| Revenue trading (108 MW avg × €12.750) | **€1.377.000** |
| Integrações one-time (5 novos ativos × €20K) | **€100.000** |
| Primeiros contratos Tolling (se aplicável) | **€150.000** |
| **TOTAL RECEITA** | **€1.627.000** |
| | |
| **CUSTOS OPERACIONAIS** | |
| Pessoal (11 FTE) | €680.000 |
| Cloud e infraestrutura | €60.000 |
| Aluguer escritório (maior) | €25.000 |
| Advogados (expansão ES) | €30.000 |
| Viagens e BD | €30.000 |
| Outros | €25.000 |
| **TOTAL CUSTOS** | **€850.000** |
| | |
| **EBITDA** | **+€777.000 (48% margin)** |
| **EBITDA excluindo integrações one-time** | **+€627.000 (43% margin)** |

### 10.3 Cash Flow Mensal — Ano 1

| Mês | Entrada | Saída | Saldo Mês | Saldo Acumulado |
|-----|---------|-------|-----------|-----------------|
| Jan | €350.000 (investimento) | €20.000 | +€330.000 | €330.000 |
| Fev | €0 | €22.000 | -€22.000 | €308.000 |
| Mar | €0 | €22.000 | -€22.000 | €286.000 |
| Abr | €0 | €25.000 | -€25.000 | €261.000 |
| Mai | €0 | €28.000 | -€28.000 | €233.000 |
| Jun | €0 | €30.000 | -€30.000 | €203.000 |
| Jul | €0 | €33.000 | -€33.000 | €170.000 |
| Ago | €0 | €33.000 | -€33.000 | €137.000 |
| Set | €5.000 | €33.000 | -€28.000 | €109.000 |
| Out | €8.000 | €33.000 | -€25.000 | €84.000 |
| Nov | €10.000 | €33.000 | -€23.000 | €61.000 |
| Dez | €12.000 | €33.000 | -€21.000 | **€40.000** |

*Nota: Este cenário assume Pre-Seed de €350K em Janeiro 2026. O saldo de €40K em dezembro exige que a Seed Round esteja em negociação — momento ideal para fechar com track record de 3 meses de receita real.*

### 10.4 Resumo Financeiro — 3 Anos

| Métricas-Chave | 2026 | 2027 | 2028 |
|----------------|------|------|------|
| MW sob gestão (fim de ano) | 12 MW | 42 MW | 170 MW |
| MW médio | 0 (shadow) | 24 MW | 108 MW |
| Receita | €15K | €346K | €1,6M |
| EBITDA | -€300K | -€177K | +€777K |
| Headcount | 4 FTE | 7 FTE | 11 FTE |
| Runway | 12 meses | — | — |

### 10.5 Análise de Sensibilidade

**Cenário Pessimista** (revenue/MW 30% abaixo do base):
- Revenue/MW: €8.925/ano
- Breakeven: ~75 MW (vs 50 MW no base)
- Ano 3 EBITDA: +€200K (ainda positivo)

**Cenário Otimista** (revenue/MW 30% acima do base):
- Revenue/MW: €16.575/ano
- Breakeven: ~35 MW
- Ano 3 EBITDA: +€1,4M

**Variável mais crítica:** Revenue por MW gerado — incerteza real de ±40%. Depende da volatilidade do mercado ibérico e da performance do algoritmo. Só shadow trading real resolverá esta incerteza.

---

## 11. Necessidade de Investimento e Use of Funds

### 11.1 Fases de Investimento

**Pré-seed (imediato — Q1 2026)**

| Objetivo | Valor |
|----------|-------|
| Empresa constituída + advogados ano 1 | €50.000 |
| Salários equipa fundadora (CEO + CTO) — 12 meses | €170.000 |
| Energy Markets Specialist (8 meses) | €55.000 |
| Cloud e infraestrutura | €15.000 |
| Operações e outros | €20.000 |
| Buffer (20%) | €62.000 |
| **Total Pré-seed** | **€372.000** |
| **Pedido arredondado** | **€350.000–€400.000** |

**O que valida:**
- Processo DGEG/ERSE em curso
- Algoritmo MVP com backtesting validado
- Shadow trading ao vivo com primeiro cliente
- Receitas reais nos primeiros 3 meses de trading

**Seed Round (Q4 2026 / Q1 2027)**

| Objetivo | Valor |
|----------|-------|
| Expansão da equipa (Developer + Data Engineer + CS) | €200.000 |
| Salários equipa completa — 12 meses | €350.000 |
| Garantias financeiras OMIE/REN | €100.000–€200.000 |
| Expansão para Espanha (CNMC + REE) | €50.000 |
| Operações e BD | €50.000 |
| Buffer | €100.000 |
| **Total Seed** | **€850.000–€950.000** |
| **Pedido arredondado** | **€900.000–€1.200.000** |

**O que valida:**
- 40+ MW sob gestão
- Receita recorrente €30K+/mês
- Track record de 12 meses de trading
- Pipeline de 100+ MW assinados

### 11.2 Distribuição do Capital Investido

```
Pré-seed €380K:
  ├── Pessoal (60%)          €228.000
  ├── Legal/Regulatório (13%)  €49.400
  ├── Tech/Cloud (4%)          €15.200
  └── Ops/Buffer (23%)         €87.400

Seed €950K:
  ├── Pessoal (52%)           €494.000
  ├── Garantias trading (16%) €152.000
  ├── Expansão ES (5%)         €47.500
  ├── Tech/Cloud (6%)          €57.000
  └── Ops/BD/Buffer (21%)     €199.500
```

### 11.3 Cap Table Sugerido (Pre-money)

| Acionista | Pré-seed | Seed |
|-----------|----------|------|
| Fundadores | 80% | 55–60% |
| Pré-seed investors | 15–20% | 10–13% |
| Seed investors | — | 25–30% |
| ESOP (equipa) | 5% | 5–7% |

---

## 12. Gestão de Risco

### 12.1 Matriz de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Regulatory delay >15 meses | Média | Alto | Advogado sénior desde Mês 1; contacto proativo com DGEG/ERSE/REN |
| Primeiro cliente não assina | Média | Alto | Shadow trading como proof; pipeline de 3 targets simultâneos |
| Revenue/MW 40% abaixo do projetado | Média | Médio | Cenário pessimista ainda viable a 75 MW |
| Concorrente nativo aparece rapidamente | Baixa | Médio | Vantagem de 9–15 meses; certificações são barreira real |
| Algoritmo underperforma benchmark | Baixa-Média | Alto | Shadow trading obrigatório; never go live sem 3 meses validado |
| Capital de trading insuficiente | Média | Alto | Linha de garantia bancária vs cash; escalar volumes gradualmente |
| Key person risk (CTO) | Média | Alto | ESOP agressivo; documentation first; redundância técnica |
| Mercado ibérico menos volátil que Alemanha | Alta | Médio | Construir cenário pessimista como base; diversificar para ES |

### 12.2 Planos de Contingência

**Se DGEG demorar >6 meses:**
- Continuar shadow trading e desenvolvimento algorítmico
- Explorar parceria com comercializador já licenciado (white-label da nossa tecnologia enquanto não temos licença própria)
- Explorar operação em Espanha primeiro (CNMC pode ser mais rápido)

**Se primeiro cliente não assinar após shadow trading:**
- Analisar causa: performance insuficiente vs decisão interna do cliente
- Se performance: iterar algoritmo, re-fazer shadow trading
- Se decisão interna: pivotar para segundo cliente na lista; primeiro cliente ainda pode assinar mais tarde

**Se revenue/MW for 40% abaixo:**
- Estender runway com salários reduzidos temporários (acordo com equipa)
- Focar em contratos Tolling com clientes existentes (captura mais upside)
- Acelerar expansão para Espanha onde mercado é mais maduro

**Se CTO sair:**
- Contrato com cliff de 1 ano e vesting de 4 anos (proteção padrão)
- Documentação técnica completa desde o início
- Junior ML Engineer como redundância a partir do Ano 2

### 12.3 KPIs de Alerta Precoce

| KPI | Frequência | Alerta (threshold) |
|-----|-----------|-------------------|
| Saldo de caixa | Semanal | <3 meses de runway |
| Revenue/MW real vs projetado | Mensal | <70% do projetado |
| Pipeline de clientes (MW) | Mensal | <2× objetivo de final de ano |
| Performance do algoritmo (Sharpe ratio) | Semanal | <0.8 (benchmark: 1.2+) |
| Progresso regulatório | Bi-semanal | Atraso >4 semanas vs timeline |
| Uptime do sistema | Diário | <99.5% |

---

## 13. Estratégia de Saída

### 13.1 Cenários de Saída

**Cenário 1 — Aquisição por Grande Utility (3–5 anos)**

*Compradores mais prováveis:*
- EDP / EDP Renováveis (maior utility PT; construindo BigBATT 180 MW)
- Galp (trading de energia, portfolio de BESS)
- Endesa / Iberdrola (ativos em PT, querem capacidade de otimização)
- enspired, Entrix (consolidação europeia de otimizadores)

*Lógica:* Os grandes utilities vão querer internalizar a capacidade de otimização quando o mercado maturar. Comprar é mais rápido que construir.

*Múltiplo típico (setor energético + AI):* 5–10× receita ou 15–25× EBITDA

*Estimativa (Ano 4, receita €3M):*
- Revenue múltiplo 7×: **€21M** de exit
- EBITDA múltiplo 20× (EBITDA €1,5M): **€30M** de exit

**Cenário 2 — Fusão com Comparável Europeu**

*Parceiros prováveis:*
- Capalo AI (Finlândia — portfólio Báltico; combinação PT+ES seria pan-europeia)
- enspired (Áustria — já presente em Espanha; Portugal seria extensão natural)

*Lógica:* Consolidação europeia de otimizadores de BESS para competir com utilities

*Timeline:* Série A (Ano 3) pode ser liderada por um destes players como strategic lead

**Cenário 3 — IPO ou Série B+ como Empresa Independente**

Se atingir escala suficiente (500+ MW, receita >€6M), possibilidade de Série B e eventual IPO.

*Comparável:* enspired levantou €40M de Série B a >1 GW sob gestão. Com portfólio ibérico de 500 MW, essa escala é atingível em 5–7 anos.

### 13.2 O Que Maximiza o Valor de Saída

1. **Dados proprietários:** Cada mês de trading gera dados únicos de licitações e performance que nenhum concorrente tem — aumentam o múltiplo
2. **Certificações regulatórias:** Intransferíveis — o comprador poupa 12+ meses de processo
3. **Contratos de longo prazo:** Revenue share de 3–5 anos = visibilidade de receita = múltiplo mais alto
4. **Portfolio diversificado:** 10+ ativos = sem concentração de cliente; mais robusto
5. **Track record verificado:** Resultados auditados por terceiros (como o KPMG faz para enspired)

---

## 14. Anexos

### A. Benchmarks de Performance — enspired (verificado KPMG)

| Período | Revenue/MW | Ciclos/dia | Nota |
|---------|-----------|-----------|------|
| 2024 média | €116.000/MW | — | Alemanha |
| 2025 média | **€166.753/MW** | 1.06 | +43% YoY |
| 2025 top | **€224.955/MW** | — | Top performers |
| Dez 2025 | €62.549/MW | 1.06 | Mês fraco |

*Estimativa ibérica (desconto 40%):* €100.000–€135.000/MW/ano

### B. Contactos Chave

| Entidade | Propósito | Contacto |
|----------|-----------|---------|
| DGEG | Registo comercializador | info@dgeg.gov.pt / +351 210 924 600 |
| ERSE | Registo agregador | erse@erse.pt / +351 217 892 700 |
| OMIE | Registo agente de mercado | info@omie.es / +34 915 228 200 |
| REN — Mercados | Qualificação FCR/aFRR/mFRR | mercado@ren.pt / +351 210 013 200 |
| Macedo Vitorino | Advogados de energia (PT) | joao@macedovitorino.com |
| PLMJ | Advogados de energia (PT) | paulo.alvarinho@plmj.pt |
| Infraventus | Primeiro cliente target | Via Macedo Vitorino ou LinkedIn |
| APREN | Associação energias renováveis | apren.pt |

### C. Recursos Técnicos Open-Source

| Recurso | Propósito | Link |
|---------|-----------|------|
| OMIEData | Dados OMIE históricos e live | github.com/acruzgarcia/OMIEData |
| entsoe-py | Dados ENTSO-E transparência | github.com/EnergieID/entsoe-py |
| Stable-Baselines3 | Algoritmos RL | stable-baselines3.readthedocs.io |
| Gymnasium | Ambientes de simulação RL | gymnasium.farama.org |
| Darts | Time-series forecasting | unit8co.github.io/darts |
| pymodbus | MODBUS TCP em Python | pymodbus.readthedocs.io |
| pyiec61850 | IEC 61850 em Python | github.com/mz-automation/libiec61850 |

### D. Referências Regulatórias

- DL 15/2022 de 14 de janeiro — Quadro legal do SEN
- DL 191/2023 — Amendments ao DL 15/2022
- Diretiva ERSE 6/2025 — Registo de PPAs
- Diretiva ERSE 11/2025 — Programação via GGS
- ENTSO-E — Technical Requirements for FCR/aFRR/mFRR

### E. Glossário

| Termo | Definição |
|-------|-----------|
| **BESS** | Battery Energy Storage System — Sistema de armazenamento de energia em bateria |
| **VPP** | Virtual Power Plant — Agregação de múltiplos ativos distribuídos geridos como uma central virtual |
| **OMIE** | Operador del Mercado Ibérico de Energía — bolsa de eletricidade ibérica |
| **REN** | Redes Energéticas Nacionais — TSO (operador de rede de transporte) de Portugal |
| **FCR** | Frequency Containment Reserve — Reserva de contenção de frequência (resposta em segundos) |
| **aFRR** | Automatic Frequency Restoration Reserve — Reserva automática de restauração de frequência |
| **mFRR** | Manual Frequency Restoration Reserve — Reserva manual de restauração de frequência |
| **SoC** | State of Charge — Estado de carga da bateria (%) |
| **DRL** | Deep Reinforcement Learning — Aprendizagem por reforço profunda |
| **SCADA** | Supervisory Control and Data Acquisition — Sistema de supervisão e controlo industrial |
| **DGEG** | Direção-Geral de Energia e Geologia — Autoridade reguladora de energia (Portugal) |
| **ERSE** | Entidade Reguladora dos Serviços Energéticos — Regulador dos mercados de energia (Portugal) |
| **Revenue Share** | Modelo em que o otimizador cobra uma % das receitas geradas |
| **Tolling** | Modelo em que o otimizador paga taxa fixa ao dono do ativo e retém toda a receita |
| **Shadow Trading** | Operação simulada em paralelo com o sistema real, sem execução de ordens reais |
| **MAE** | Mean Absolute Error — Métrica de avaliação de modelos de previsão |
| **PPO** | Proximal Policy Optimization — Algoritmo de RL para políticas contínuas |

---

*Documento preparado com base em research de mercado realizado em março de 2026.*
*Fontes principais: ERSE, DGEG, OMIE, enspired (KPMG verified), Macedo Vitorino, ESS News, Legal 500, Damia Group.*
*Estimativas financeiras são projeções de trabalho — incerteza significativa na variável revenue/MW/ano.*
