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

**Modelo de negócio (visão):** B2B2C, mas quem paga são os **noivos** (pagamento
único por casamento). As quintas entram como parceiras (planta digitalizada como
diferenciador) mas não são a fonte de receita. **No MVP a monetização está
desligada** — a ferramenta corre localmente para construir e validar primeiro.

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
- **Exportação do plano final em PDF** (para imprimir e/ou partilhar com a quinta):
  vista da planta com mesas numeradas + lista de convidados por mesa.

### Out of scope (por agora)
- **Deployment online (Vercel) e pagamentos (Stripe).** O MVP corre **localmente**
  na máquina do Tiago para construir e demonstrar. A monetização (pagamento único
  pelos noivos, ex: €39) entra na fase online, depois de validado.
- **Autenticação / multi-utilizador.** Sendo local e single-user no arranque, não
  há auth no MVP.
- Reviews, outros fornecedores, orçamentos, marketplace completo.
- Self-service de plantas pelas próprias quintas (no MVP as plantas são criadas
  por Tiago/equipa).
- Atribuição a lugar específico dentro da mesa (o MVP atribui convidado→mesa; o
  lugar exacto na mesa fica para depois).

## 3. Architecture

**Local-first no MVP.** A app corre na máquina do Tiago (`next dev`), sem cloud,
sem deployment. As escolhas mantêm um caminho de migração limpo para online.

**Stack:**
- **Frontend/Backend:** Next.js (React), a correr **localmente** (`next dev`).
  Sem Vercel no MVP; o mesmo código faz deploy para Vercel mais tarde sem
  reescrita.
- **Base de dados:** **SQLite** (ficheiro local), acedido via uma camada de dados
  fina (ex: Prisma ou `better-sqlite3`) escolhida para que a migração futura para
  Postgres seja trivial. Zero cloud, zero contas.
- **Storage de imagens:** **filesystem local** (pasta do projecto) para as fotos/
  plantas das quintas.
- **Editor de planta/mesas:** canvas interactivo em React (`react-konva` ou
  `fabric.js`). Reutilizado tanto no editor admin como na vista final dos noivos.
- **Motor de disposição:** lógica TypeScript a correr server-side (Next.js API
  route). É optimização combinatória, **não IA** — sem infraestrutura extra.
- **Exportação PDF:** geração no browser (ex: render do canvas + `jspdf`) ou
  server-side — a decidir no plano.
- **Auth e pagamentos:** **fora do MVP** — entram na fase online (Supabase Auth +
  Stripe).

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

## 8. Export

- **Exportação em PDF** do plano final: página com a vista da planta (mesas
  numeradas nas suas posições) + lista de convidados agrupada por mesa.
- Objectivo: imprimir e/ou enviar à quinta. Formato de saída limpo, A4/A3.

## 9. Payment (fase online, fora do MVP)

- Stripe Checkout, pagamento único por casamento (ex: €39) — só quando a
  ferramenta for para online. No MVP local não há pagamento.

## 10. Build Order

Local-first, frente de risco técnico primeiro:

1. **Fundação** — Next.js local + SQLite (schema, camada de dados) + storage no
   filesystem. *Baixa.*
2. **Editor de planta (admin)** — upload + calibração de escala + mesas. *Média.*
   (paralelo a 1)
3. **Motor de disposição** — solver isolado, testável sem UI. *Alta.* (risco
   maior — provar cedo)
4. **Import + grupos** — Excel + tabela/arrastar. *Média.*
5. **Vista do plano + edição manual** — render na planta, drag-and-drop,
   re-validação. *Média.*
6. **Exportação PDF** — vista da planta + lista por mesa. *Baixa/Média.*

**Fatia vertical mínima demonstrável (validar cedo):**
1 quinta com planta real → importar Excel → gerar disposição → ver na planta →
exportar PDF.

## 11. Pre-requisites (não-código)

- 3-5 quintas parceiras dispostas a ceder planta/fotos + medidas (as primeiras
  plantas reais).
- Template Excel de convidados finalizado.
- (Fase online, mais tarde) decisão final de preço e conta Stripe.

## 12. Open Questions

- Formato exacto do template Excel (colunas, como codificar restrições numa
  célula de forma amigável).
- `react-konva` vs `fabric.js` para o canvas — decidir no plano de implementação.
- Prisma vs `better-sqlite3` para a camada de dados — decidir no plano.
- Geração de PDF no browser (`jspdf`) vs server-side — decidir no plano.
- (Fase online) preço exacto e se há período gratuito/trial.
