# Limitações do Movella DOT para Análise de Quadril

## Resumo

O **Movella DOT não é adequado** para análise precisa de movimento do quadril devido à complexidade da articulação e limitações técnicas dos sensores IMU.

---

## Por que o Quadril é Problemático?

### Complexidade da Articulação

- **Quadril**: Articulação esférica com **3 graus de liberdade** (flexão, abdução, rotação)
- **Joelho**: Articulação tipo dobradiça com **1 grau de liberdade** (flexão/extensão)

### Problemas Técnicos

1. **Drift de Orientação**: Erros acumulam ao longo do tempo em todos os 3 eixos
2. **Referencial Instável**: O pelvis se move, dificultando cálculos precisos
3. **Calibração Complexa**: Requer alinhamento perfeito difícil de garantir
4. **Fusão de Sensores**: Algoritmos introduzem erros cumulativos

---

## Evidências dos Problemas

### Resultados Observados vs Esperados

| Métrica       | Esperado | Observado (Esquerdo) | Observado (Direito) |
| ------------- | -------- | -------------------- | ------------------- |
| ROM           | ~90°     | 119.7°               | 104.8°              |
| Max Flexion   | ~90°     | 28.6°                | 39.9°               |
| Peak Velocity | <500°/s  | 260.8°/s             | **4720.4°/s** ❌    |

### Problemas Identificados

- ❌ ROM inconsistente (105-120° vs ~90° esperado)
- ❌ Flexão máxima incorreta (28-39° vs ~90° esperado)
- ❌ Velocidades fisicamente impossíveis (4720°/s)
- ❌ Grandes diferenças entre lados (problemas de calibração)

---

## Comparação: Quadril vs Joelho

| Aspecto     | Joelho ✅             | Quadril ❌                 |
| ----------- | --------------------- | -------------------------- |
| Tipo        | Dobradiça (1 DOF)     | Esférica (3 DOF)           |
| Movimento   | Principalmente flexão | Flexão + Abdução + Rotação |
| Referencial | Estável (coxa fixa)   | Instável (pelvis se move)  |
| Precisão    | Boa                   | Ruim                       |
| Resultados  | Consistentes          | Inconsistentes             |

---

## O que Foi Tentado

Antes de concluir sobre as limitações, foram implementadas e testadas várias abordagens:

### Métodos de Cálculo

- ✅ Método pelvis-frame (relativo ao pelvis)
- ✅ Método world-frame (relativo ao eixo vertical do mundo)
- ✅ Unwrapping de ângulos para evitar descontinuidades
- ✅ Seleção automática da melhor coluna da matriz de rotação
- ✅ Cálculo de abdução e rotação em planos separados

### Ajustes de Baseline

- ✅ Média dos primeiros 200 samples
- ✅ Baseline relativo (centrado em zero)
- ✅ Mínimo absoluto como referência de extensão

### Correções e Otimizações

- ✅ Escala proporcional para ajustar flexão máxima
- ✅ Cálculo correto de velocidades usando gradient com tempo em segundos
- ✅ Alinhamento temporal de dados de múltiplos sensores
- ✅ Detecção de janela ativa de movimento

### Resultado

Apesar de todas essas tentativas, os resultados continuaram inconsistentes e não clinicamente confiáveis, confirmando as limitações fundamentais do sistema.

## Recomendações

### Para o Projeto IRHIS

1. **Focar no Joelho**: O Movella DOT funciona bem para análise de joelho
2. **Remover ou Limitar Quadril**:
   - Opção A: Remover completamente
   - Opção B: Manter com avisos claros sobre limitações

---

## Conclusão

**O Movella DOT não é ideal para análise precisa de quadril** devido a:

1. Complexidade da articulação (3 graus de liberdade)
2. Limitações técnicas de IMUs (drift, referencial instável)
3. Evidências empíricas de resultados inconsistentes
4. Literatura científica confirma essas limitações

**Recomendação**: Focar no joelho como funcionalidade principal validada.
