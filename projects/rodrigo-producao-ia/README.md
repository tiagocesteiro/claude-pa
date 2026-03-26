---
project: Sistema de Inteligência de Produção
owner: Rodrigo
status: Validação
stage: Pré-MVP
started: 2025
tags: [saas, ia, metalomecânica, pme, b2b]
---

# Sistema de Inteligência de Produção

> Agente de IA para planeamento e orçamentação em PME metalomecânicas.
> "O planeador sabe que vai correr mal. Mas não sabe quanto, nem onde, nem quando."

## Resumo

Produto SaaS B2B que resolve os problemas de planeamento de produção nas PME metalomecânicas portuguesas — orçamentação errada, datas irrealistas, urgências sem análise de impacto, gargalos não antecipados.

O MVP foca num único caso de uso: **orçamentação automática via parsing de ficheiros DXF + histórico de ordens**.

## Contexto — Rodrigo

- Formação em automação industrial e planeamento de produção
- Trabalha na **Cubotonic** (Malveira, Portugal) — empresa metalomecânica
- Desenvolveu autonomamente um ficheiro Excel+SQL Server para automatizar planeamento
- Produto a construir de forma **independente**, fora da Cubotonic
- Cubotonic é potencial early adopter/piloto (com acordo formal)

## Problema

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Orçamentação errada (erros 10–25%) | MUITO ALTO |
| 2 | Datas de entrega não cumpridas | ALTO |
| 3 | Gargalos não antecipados | ALTO |
| 4 | Urgências sem análise de impacto | MUITO ALTO |
| 5 | Decisão make-or-buy intuitiva | MÉDIO |
| 6 | Risco de retrabalho por combinação material/máquina | MÉDIO |

## Solução

**Agente de Inteligência de Produção** com 6 capacidades:
1. Leitura automática de encomendas (PDF, DXF, ERP, linguagem natural)
2. Previsão de carga por posto de trabalho
3. Verificação contra a fila activa (antes de comprometer data)
4. Respostas a perguntas reais ("Se aceitar esta urgência, o que atrasa?")
5. Alertas proactivos (risco de atraso, retrabalho, desgaste)
6. Aprendizagem contínua por cada ordem concluída

**Diferenciador técnico:** DXF parsing (ezdxf) + modelo por fábrica configurável. Ninguém no mercado acessível faz isto para PME.

## Mercado

| Âmbito | PMEs |
|--------|------|
| Portugal | ~4.800 |
| Península Ibérica | ~35.000 |
| Europa | ~180.000 |

- Faturação média do ICP: €2–30M
- Decisores: engenheiros/gestores 40–60 anos
- Ciclo de venda: 3–9 meses
- PRR e Portugal 2030 financiam digitalização → argumento de venda
- Entradas privilegiadas: AIMMAP, PRODUTECH

## Modelo de Negócio

Recomendado: **híbrido** (piloto gratuito 90 dias → subscrição anual)

| Tier | Preço/mês |
|------|-----------|
| Starter | €200 (1 fábrica, 3 postos) |
| Growth | €400 (1 fábrica, ilimitado) |
| Enterprise | €700 (multi-fábrica, API) |

- Setup: €2.000–€5.000
- Manutenção: €1.500–€3.000/ano
- **Target Y1:** 5–8 clientes → €12K–€20K ARR
- **Breakeven estimado:** 12–18 meses
- **Margem SaaS matura:** 70–80%

## Análise Competitiva

| Solução | Previsão? | Específico Metal.? | Acessível PME? |
|---------|-----------|--------------------|----------------|
| MES Completo (Epicor, Infor) | Sim | Sim | Não (€50K–200K) |
| ERP Genérico (SAP B1, PHC, Odoo) | Básico | Não | Parcial |
| Excel avançado | Não | Depende | Sim |
| IA genérica (GPT, Copilot) | Não | Não | Sim mas inútil |
| **Este produto** | **Sim + DXF** | **Sim** | **Sim (€200–600/mês)** |

## Roadmap (12 meses)

| Fase | Mês | Objectivo |
|------|-----|-----------|
| 0 — Validação | 1 | 5 entrevistas com planeadores. Confirmar ICP. NÃO construir ainda. |
| 1 — Dados + Modelo | 2–3 | Dados sintéticos (10K ordens), parser DXF, XGBoost baseline |
| 2 — MVP & API | 4–5 | FastAPI + Streamlit, Docker, demo funcional |
| 3 — Piloto Fábrica | 5–7 | 1ª fábrica parceira, calibração com dados reais, feedback loop |
| 4 — Agente Conversacional | 8–9 | LangChain + Claude API, interface de chat, integração ERP REST |
| 5 — 1º Cliente Pagante | 10–12 | Pitch + proposta, converter piloto, target €2.400/ano |

## Riscos Principais

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Cold start sem dados | CRÍTICO | Piloto gratuito + dados sintéticos + transparência sobre confiança |
| Ciclo de vendas longo | CRÍTICO | Entrar pela dor mais aguda (orçamentação), demo com dados do prospect |
| Resistência à mudança | ALTO | Posicionar como assistente, não substituto; envolver o planeador |
| Soldadura — dados históricos fracos | ALTO | Sub-modelo com intervalos de confiança mais largos |
| Scope demasiado ambicioso (1 pessoa) | MÉDIO | MVP = 1 caso de uso, 1 fábrica, 1 modelo |
| Concorrência futura de ERPs | MÉDIO | Especialização profunda em DXF e domínio metalomecânico |

## Stack Técnico

- **ML:** Python, XGBoost, scikit-learn
- **DXF Parsing:** ezdxf
- **API:** FastAPI
- **Frontend:** Streamlit (MVP), depois dashboard dedicado
- **Agente:** LangChain + Claude API (Opus 4.6)
- **Infra:** Docker
- **ERP:** Integração REST (fase 4)
- **Compliance:** RGPD, ISO 42001, EU AI Act

## Ficheiros

- [[apresentacao_mercado]] — Apresentação à equipa de desenvolvimento (análise de mercado e viabilidade)
- [[plano_implementacao_v1]] — Plano de implementação completo v1.0 (prompt estruturado para Opus 4.6)

## Próximo Passo

> Validar com 5 planeadores reais antes de escrever 1 linha de código.
