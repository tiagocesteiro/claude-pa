---
title: Wedding Seating Planner — MVP Design
date: 2026-07-06
status: draft
owner: Tiago
---

# Wedding Seating Planner — MVP Design

## 1. Problem & Goal

Casais que planeiam casamentos gastam horas a fazer a disposição das mesas
("seating plan") à mão. As ferramentas existentes em Portugal (ex: casamentos.pt)
são fracas em dois eixos: **não têm automação real** (é drag-and-drop manual) e
**não têm plantas reais dos espaços**.

**Objectivo:** construir uma ferramenta standalone de seating plan que gera a
disposição das mesas **automaticamente** a partir de grupos e restrições, sobre
**plantas reais e calibradas** das quintas parceiras.

**Modelo de negócio:** B2B2C, mas quem paga são os **noivos** (pagamento único
por casamento). As quintas entram como parceiras (planta digitalizada como
diferenciador) mas não são a fonte de receita no MVP.

## 2. Scope

### In scope (MVP)
- Directório de quintas parceiras, cada uma com planta real digitalizada (foto/
  scan calibrado) — onboarding feito por Tiago/equipa ("concierge").
- Fallback: layout genérico (forma rectangular / em L, dimensões ajustáveis) para
  casais cuja quinta ainda não é parceira. Usa o mesmo motor, sem a fidelidade da
  planta real.
- Importação de convidados via Excel. O ficheiro pode **já trazer** a coluna de
  grupo, ou os noivos associam grupos depois via **interface de arrastar**.
- Motor de disposição automática respeitando:
  - **Grupos** — amigos/família tendem a ficar na mesma mesa.
  - **Capacidade de mesa** — cada mesa tem um limite de lugares.
  - **Restrições negativas** — X não pode sentar-se com Y.
  - **Obrigatoriedades** — X tem de sentar-se com Y (mesmo de grupos diferentes).
  - **Mesas/lugares fixos** — mesa dos noivos, pais, etc. (o motor não lhes mexe).
- Edição manual pós-geração (drag-and-drop) com **re-validação em tempo real**
  das restrições.
- Pagamento pelos noivos via Stripe (pagamento único, ex: €39/casamento).

### Out of scope (por agora)
- Reviews, outros fornecedores, orçamentos, marketplace completo.
- Self-service de plantas pelas próprias quintas (no MVP as plantas são criadas
  por Tiago/equipa).
- Atribuição a lugar específico dentro da mesa (o MVP atribui convidado→mesa; o
  lugar exacto na mesa fica para depois).

## 3. Architecture

**Stack:**
- **Frontend/Backend:** Next.js (React) em Vercel — SSR/edge para performance e
  SEO do directório público de quintas. Reutiliza skills e infra já existentes.
- **Base de dados:** Postgres via Supabase (projecto novo, isolado do projecto
  de clientes). Auth via Supabase Auth.
- **Storage de imagens:** Supabase Storage (fotos/plantas das quintas).
- **Editor de planta/mesas:** canvas interactivo em React (`react-konva` ou
  `fabric.js`). Reutilizado tanto no editor admin como na vista final dos noivos.
- **Motor de disposição:** lógica TypeScript a correr server-side (Next.js API
  route / função serverless). É optimização combinatória, **não IA** — sem
  infraestrutura extra.
- **Pagamentos:** Stripe Checkout (pagamento único por casamento).

## 4. Data Model

```
quinta        → id, nome, localização, fotos[]
planta        → id, quinta_id, imagem, escala (px/metro), dimensões (largura, profundidade)
mesa          → id, planta_id, forma (redonda|rectangular), capacidade, posição (x,y), fixa (bool)
casamento     → id, noivos, quinta_id (nullable → genérica), planta_id, data, estado_pagamento
convidado     → id, casamento_id, nome, grupo_id (nullable), mesa_atribuida_id (nullable)
grupo         → id, casamento_id, nome, cor
restricao     → id, casamento_id, tipo (junto|separado), pessoa_a_id, pessoa_b_id
```

Notas:
- `mesa.fixa = true` → mesa pré-definida manualmente (noivos/pais); o motor não a
  altera mas conta os seus ocupantes para capacidade.
- `restricao` cobre tanto pares que **não podem** ficar juntos (`separado`) como
  **obrigatoriedades** (`junto`).
- Uma quinta tem uma ou mais plantas (salas/zonas diferentes); um casamento aponta
  para uma planta específica.

## 5. Seating Engine (o coração)

Problema de **satisfação de restrições + optimização**. Corre server-side,
alvo <1s para 100-200 convidados.

**Restrições rígidas (têm de ser cumpridas):**
- Capacidade de cada mesa.
- `separado`: dois convidados nunca na mesma mesa.
- Mesas fixas: ocupantes pré-definidos não são movidos.

**Preferências (a maximizar via score):**
- Manter cada grupo na mesma mesa (penaliza grupos partidos).
- Honrar `junto`: pares obrigatórios na mesma mesa.
- Equilíbrio de ocupação das mesas.

**Algoritmo:**
1. Colocação inicial gulosa — grupos maiores primeiro, encaixando por capacidade.
2. Refinamento por trocas locais / *simulated annealing* para subir o score
   respeitando as restrições rígidas.
3. Se uma restrição rígida for impossível (ex: grupo maior que qualquer mesa),
   devolve **avisos** claros em vez de falhar em silêncio.

**Output:** atribuição convidado→mesa + score + lista de avisos legíveis
(ex: "grupo Faculdade partido: 2 pessoas na mesa 7").

**Edição manual:** ao arrastar um convidado para outra mesa, o sistema re-valida
as restrições e avisa em tempo real se a jogada viola uma regra rígida (sem
bloquear — o utilizador manda).

## 6. Guest Import & Grouping

- **Template Excel** fornecido: colunas `nome`, `grupo` (opcional),
  `restrições` (opcional/livre). Definição exacta das colunas a fechar no plano.
- Import lê o ficheiro e cria os convidados. Se a coluna `grupo` vier preenchida,
  os grupos são criados automaticamente.
- Se não vierem grupos (ou para ajustar), UI de **arrastar cartões de convidado
  para caixas de grupo**. Ambos os caminhos são suportados.

## 7. Floor Plan Editor (admin, concierge)

- Upload de foto aérea / planta escaneada da sala real.
- **Calibração de escala:** arrastar uma régua sobre uma medida conhecida para
  fixar px/metro.
- Colocar mesas (redondas/rectangulares) por cima da imagem, definir capacidade,
  marcar mesas fixas.
- No MVP este editor é usado por Tiago/equipa; os noivos consomem o resultado.

## 8. Payment

- Stripe Checkout, pagamento único por casamento (ex: €39).
- O acesso à geração/exportação do plano fica atrás do pagamento; a "fatia
  vertical" inicial pode ser demonstrada sem pagamento durante o desenvolvimento.

## 9. Build Order

Frente de risco técnico primeiro:

1. **Fundação** — Next.js + Supabase (auth, schema, storage). *Baixa.*
2. **Editor de planta (admin)** — upload + calibração + mesas. *Média.* (paralelo a 1)
3. **Motor de disposição** — solver isolado, testável sem UI. *Alta.* (risco maior — provar cedo)
4. **Import + grupos** — Excel + tabela/arrastar. *Média.*
5. **Vista do plano + edição manual** — render na planta, drag-and-drop, re-validação. *Média.*
6. **Pagamento** — Stripe checkout. *Baixa.*

**Fatia vertical mínima demonstrável (validar cedo, sem pagamento):**
1 quinta com planta real → importar Excel → gerar disposição → ver na planta.

## 10. Pre-requisites (não-código)

- 3-5 quintas parceiras dispostas a ceder planta/fotos + medidas.
- Decisão final de preço (recomendado: pagamento único €39).
- Template Excel de convidados finalizado.
- Conta Stripe + projecto Supabase novo (isolado do projecto de clientes).

## 11. Open Questions

- Preço exacto e se há período gratuito/trial.
- Formato exacto do template Excel (colunas, como codificar restrições numa
  célula de forma amigável).
- `react-konva` vs `fabric.js` para o canvas — decidir no plano de implementação.
- Exportação do plano final (PDF para imprimir / partilhar com a quinta?) — provável
  fast-follow, confirmar se entra no MVP.
