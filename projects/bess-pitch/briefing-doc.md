# Otimização do Mercado de Energia: Oportunidade para um Agregador Independente em Portugal

## Sumário Executivo

O mercado de energia ibérico atravessa uma fase de transformação crítica, impulsionada pela necessidade de flexibilidade na rede elétrica. Este documento detalha a oportunidade de negócio para um **otimizador de BESS (Battery Energy Storage Systems) e agregador de mercado independente**. O modelo consiste na gestão inteligente de baterias de terceiros (utilitários, promotores ou instalações industriais) através de algoritmos de Inteligência Artificial (IA) para maximizar receitas em múltiplos mercados elétricos.

Atualmente, existe uma janela de oportunidade única em Portugal: o quadro regulatório abriu-se recentemente, a infraestrutura de armazenamento está a expandir-se rapidamente (concurso de 750 MVA previsto para 2026), e não existe, à data, qualquer empresa nativa portuguesa a operar neste segmento, sendo o mercado dominado por novos entrantes espanhóis e austríacos.

---

## 1. Análise do Modelo de Negócio

O negócio posiciona-se como um intermediário tecnológico entre os ativos físicos (baterias) e as camadas do mercado elétrico.

### Como o Valor é Gerado
O otimizador utiliza algoritmos para decidir, em tempo real, se deve carregar, descarregar ou reter a energia, licitando essa flexibilidade em três frentes:
1.  **Arbitragem no Mercado Grossista:** Compra em períodos de preço baixo e venda em picos (OMIE).
2.  **Serviços de Equilíbrio (Ancilares):** Regulação de frequência (FCR, aFRR, mFRR) para os operadores de rede (REN/REE). Esta é a camada de maior margem.
3.  **Mecanismos de Capacidade:** Pagamentos pela disponibilidade do ativo para garantir a segurança do sistema.

### Estruturas Comerciais Standard
| Modelo | Descrição | Partilha de Risco |
| :--- | :--- | :--- |
| **Fully Merchant** | O otimizador fica com uma percentagem (10–25%) do lucro gerado. | O dono do ativo assume o risco de mercado. |
| **Tolling Agreement** | O otimizador paga uma taxa fixa mensal ao dono do ativo e retém todo o lucro do mercado. | O otimizador assume todo o risco e potencial de valorização. |
| **Floor Price (Híbrido)** | Garante-se uma receita mínima ao dono do ativo, partilhando o excedente. | Equilíbrio entre risco e incentivo. |
| **SaaS** | Licenciamento do software de otimização para terceiros. | Margem menor, mas sem risco de trading. |

---

## 2. Oportunidade de Mercado: O Caso de Portugal

A análise dos dados revela que Portugal é um dos mercados mais promissores e menos explorados da Europa para agregadores independentes.

### Pontos-Chave da Oportunidade
*   **Vácuo de Concorrência Local:** Até março de 2026, não existe nenhuma empresa nativa portuguesa certificada como agregador independente. Os primeiros operadores são estrangeiros (IGNIS de Espanha e Entrix da Alemanha/Áustria).
*   **Abertura Regulatória Recente:** O Decreto-Lei 15/2022 permitiu a atividade, mas a primeira autorização para um agregador independente nos serviços de equilíbrio só ocorreu em fevereiro de 2025.
*   **Pipeline de Ativos:** Portugal tem 720 MWh de BESS a aguardar licenciamento ambiental e anunciou um concurso de 750 MVA (aprox. 400 milhões de euros) para armazenamento, previsto para a primeira metade de 2026.
*   **Intervalos de 15 Minutos:** A transição do mercado MIBEL para intervalos de 15 minutos (em vez de horários) em setembro de 2025 aumentou drasticamente as oportunidades de arbitragem para baterias.

> **"A alegação de que não existe uma empresa portuguesa nativa a fazer isto é essencialmente correta... Trata-se de uma janela de oportunidade real para um primeiro pioneiro, e não de um mercado permanentemente bloqueado."**

---

## 3. Vantagem Competitiva e Tecnologia (IA)

A IA não é apenas um acessório, mas o motor central de rentabilidade do negócio. O uso de **Deep Reinforcement Learning (DRL)** demonstrou superar os métodos tradicionais de programação linear em cerca de 58% nos estudos de arbitragem energética.

### Barreiras de Entrada (Moats)
1.  **Certificações Regulatórias:** O processo de certificação técnica junto da REN e o registo na DGEG/ERSE é complexo e demorado (6–18 meses).
2.  **Dados Proprietários:** A acumulação de dados históricos de licitações e performance de ativos cria um ciclo de melhoria contínua dos algoritmos.
3.  **Integração Técnica:** A capacidade de ligar sistemas de telemetria em tempo real (SCADA) com as APIs do mercado (OMIE) com precisão de milissegundos.

---

## 4. Necessidade de Investimento

O arranque de um agregador independente requer capital para desenvolvimento tecnológico e, crucialmente, para garantias financeiras de trading.

### Estimativa de Custos (Ano 1)
| Categoria | Custo Estimado (Baixo) | Custo Estimado (Alto) | Notas |
| :--- | :--- | :--- | :--- |
| **Regulatório e Legal** | 25.000 € | 55.000 € | Registo DGEG, ERSE e consultoria jurídica. |
| **Tecnologia (MVP)** | 90.000 € | 160.000 € | Equipa de ML e integração de APIs/SCADA. |
| **Equipa (4 pessoas)** | 175.000 € | 240.000 € | CEO, CTO (ML), Especialista de Mercados e Dev. |
| **Capital de Trading** | 100.000 € | 350.000 € | Garantias retidas (OMIE/REN) — não é gasto, mas fica bloqueado. |
| **Outros/Operações** | 55.000 € | 135.000 € | Marketing, aquisição de clientes e escritório. |
| **Total Ano 1** | **445.000 €** | **940.000 €** | **Ronda Seed recomendada: 0,7M € – 1,5M €.** |

---

## 5. Riscos e Mitigação

| Risco | Descrição | Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Cronograma Regulatório** | A certificação da REN pode demorar mais de 12 meses, período sem faturação. | Iniciar o processo legal imediatamente; focar em parcerias prévias com donos de ativos. |
| **Capital de Trading** | Necessidade de garantias financeiras elevadas para operar no OMIE. | Utilizar linhas de garantia bancária em vez de depósito de capital próprio; focar inicialmente em volumes menores. |
| **Concorrência Externa** | Operadores espanhóis e europeus já têm escala e estão a entrar em Portugal. | Foco na proximidade local e agilidade regulatória em Portugal; estratégia de "Primeiro Movimentador" nativo. |
| **Performance do Algoritmo** | Se o algoritmo subperforma face ao mercado, a reputação é destruída. | Realizar "Shadow Trading" (otimização simulada) durante 3-6 meses para validar resultados antes do Live Trading. |

---

## 6. Insights Acionáveis para Investidores

1.  **Validação de Piloto:** O passo imediato é garantir um acordo de piloto com um proprietário de BESS em Portugal ou Espanha (mesmo que pequeno, 1–5 MW) para provar a tecnologia.
2.  **Urgência Política:** O investimento de 400 milhões de euros anunciado pelo governo português para a rede e BESS, após eventos de instabilidade na rede ibérica, cria um momento político favorável.
3.  **Escalabilidade:** Uma vez obtida a certificação regulatória e o motor de IA validado, o modelo escala com custos marginais baixos, bastando adicionar novos ativos ao portfólio.
4.  **Estudo de Caso Comparável:** A empresa alemã **Entrix** levantou 8 milhões de euros em ronda Seed e entrou em Portugal em outubro de 2025, confirmando a validade do mercado.