# Calibração dos Sensores Movella DOT

## Resumo Executivo

Este documento explica como funciona a **calibração e estabelecimento de baseline** para os sensores Movella DOT no sistema atual, e quais são as limitações e recomendações.

**Importante**: O sistema atual usa **calibração automática de baseline** baseada nos primeiros segundos de dados, mas **não há calibração inicial explícita** dos sensores antes da medição.

---

## 1. Como Funciona Atualmente

### 1.1 Calibração Automática de Baseline

O sistema atual **não requer calibração manual** dos sensores. Em vez disso, usa um processo automático de **baseline subtraction**:

**Processo**:

1. Durante os **primeiros 1-3 segundos** da captura, o paciente deve estar em **posição neutra/estática**
2. O sistema calcula a **média dos valores** desses primeiros segundos
3. Essa média é usada como **baseline (zero de referência)**
4. Todos os valores subsequentes são **subtraídos do baseline**

**Código** (exemplo do joelho):

```typescript
// baselineSubtract function
const baselineSeconds = 1.0; // Primeiro 1 segundo
const baselineEndIndex = timeSeconds.findIndex((t) => t >= baselineSeconds);

// Calcular média dos primeiros segundos
let baselineSum = 0;
for (let i = 0; i < endIndex; i++) {
  baselineSum += angles[i];
}
const baselineMean = baselineSum / endIndex;

// Subtrair baseline de todos os valores
for (let i = 0; i < angles.length; i++) {
  result[i] = angles[i] - baselineMean;
}
```

**Para a anca** (processo similar):

```typescript
// Baseline: média dos primeiros ~200 amostras (posição inicial/neutra)
const B0 = Math.min(n, 200); // ~200 amostras = ~3-4 segundos a 60Hz
let base = 0;
for (let i = 0; i < B0; i++) base += theta[i];
base /= Math.max(1, B0);

// Calcular valores relativos ao baseline (centrar em zero)
const thetaRelative = new Float64Array(n);
for (let i = 0; i < n; i++) {
  thetaRelative[i] = theta[i] - base;
}
```

### 1.2 O que é o Baseline?

O **baseline** é a **posição de referência inicial** (posição neutra do paciente):

- **Joelho**: Posição em extensão completa (0°)
- **Anca**: Posição neutra/em pé

**Propósito**:

- Estabelecer um "zero" de referência
- Permitir que todos os ângulos sejam medidos **relativamente a essa posição inicial**
- Compensar pequenos erros de alinhamento dos sensores

---

## 2. Processo Recomendado de Captura

### 2.1 Preparação dos Sensores

**Antes de iniciar a captura**:

1. **Colocar os sensores** nas posições corretas:

   - Sensor 1: Coxa direita (acima do joelho)
   - Sensor 2: Perna direita (malleolus)
   - Sensor 3: Coxa esquerda (acima do joelho)
   - Sensor 4: Perna esquerda (malleolus)
   - Sensor 5: Pélvis (região L5/sacro)

2. **Garantir alinhamento**:

   - Sensores devem estar **bem fixos** (não se mover durante o exercício)
   - Alinhar sensores com os **eixos anatômicos** o melhor possível
   - Evitar campos magnéticos fortes (podem afetar magnetômetro)

3. **Sincronizar sensores**:
   - Todos os sensores devem estar **sincronizados** (usar função de sync da app Movella)
   - Verificar que todos têm o mesmo **timestamp de início**

### 2.2 Fase de Calibração/Baseline

**Durante os primeiros 3-5 segundos**:

1. **Paciente em posição neutra**:

   - De pé, em posição anatômica
   - Joelhos em extensão completa (0°)
   - Ancas em posição neutra
   - **Não se mover** durante este período

2. **Sistema captura dados**:

   - Primeiros 1-3 segundos são usados para calcular baseline
   - Sistema calcula média dos valores
   - Estabelece "zero" de referência

3. **Iniciar exercício**:
   - Após 3-5 segundos, paciente pode começar o exercício
   - Todos os valores serão medidos **relativamente ao baseline**

### 2.3 Durante a Captura

**Importante**:

- Manter sensores **fixos** (não se moverem)
- Evitar movimentos bruscos do tronco (afeta pélvis)
- Manter sincronização entre sensores

---

## 3. Limitações da Calibração Atual

### 3.1 Problemas Identificados

**1. Não há calibração inicial explícita**:

- Sensores não são "zerados" antes da medição
- Depende apenas do baseline automático
- Pode haver **drift** se sensores não estiverem estáveis

**2. Baseline depende de posição estática**:

- Se paciente se mover durante baseline, valores ficam incorretos
- Requer disciplina do paciente/clínico

**3. Alinhamento não é validado**:

- Não há verificação se sensores estão alinhados corretamente
- Pequenos erros de alinhamento causam grandes erros em ângulos

**4. Drift ao longo do tempo**:

- Sensores IMU acumulam erro ao longo do tempo
- Baseline inicial não compensa drift durante exercício longo

### 3.2 Impacto nas Métricas

**Joelho** (menos afetado):

- Baseline funciona bem porque coxa é relativamente estável
- Erros são menores e mais consistentes

**Anca** (mais afetado):

- Baseline é menos preciso porque pélvis também se move
- Erros acumulam-se mais rapidamente
- Valores absolutos são menos precisos

---

## 4. Calibração Ideal (Não Implementada)

### 4.1 O que Seria Necessário

**Calibração Inicial Explícita**:

1. **Fase de calibração** antes da captura:

   - Paciente em posição anatômica conhecida
   - Sistema "aprende" orientação de cada sensor
   - Estabelece referência absoluta

2. **Validação de alinhamento**:

   - Verificar se sensores estão alinhados corretamente
   - Detectar erros de posicionamento
   - Avisar se alinhamento está incorreto

3. **Compensação de drift**:
   - Detectar e compensar drift durante exercício
   - Usar períodos de repouso para recalibrar
   - Aplicar filtros para reduzir erro acumulativo

### 4.2 Por que Não Está Implementado?

**Razões técnicas**:

- Movella DOT não fornece API de calibração explícita
- Dados exportados já vêm processados (sensor fusion aplicado)
- Calibração manual seria complexa e demorada

**Razões práticas**:

- Baseline automático é "bom o suficiente" para joelho
- Adicionar calibração manual aumentaria complexidade
- Requereria treino adicional de clínicos

---

## 5. Recomendações Práticas

### 5.1 Para Melhorar Precisão

**1. Preparação cuidadosa**:

- Colocar sensores com cuidado
- Garantir fixação adequada
- Verificar alinhamento visual

**2. Baseline adequado**:

- **Sempre** manter paciente estático nos primeiros 3-5 segundos
- Posição anatômica neutra
- Não iniciar exercício antes do tempo de baseline

**3. Validação dos dados**:

- Verificar se baseline parece correto (valores próximos de zero inicialmente)
- Detectar se há movimento durante baseline
- Rejeitar sessões com baseline incorreto

**4. Ambiente adequado**:

- Evitar campos magnéticos fortes
- Usar em ambiente controlado
- Minimizar interferências

### 5.2 Protocolo Sugerido

**Passo a passo**:

1. **Preparação** (2-3 minutos):

   - Colocar todos os sensores
   - Verificar fixação
   - Sincronizar sensores

2. **Calibração/Baseline** (5 segundos):

   - Paciente em posição neutra
   - **Não se mover**
   - Sistema captura baseline

3. **Exercício** (variável):

   - Paciente realiza exercício
   - Sensores capturam movimento

4. **Validação** (pós-captura):
   - Verificar qualidade dos dados
   - Validar baseline
   - Rejeitar se necessário

---

## 6. Código Atual - Detalhes Técnicos

### 6.1 Baseline para Joelho

**Função**: `baselineSubtract()` em `frontend/app/analysis/metrics.ts`

```typescript
export function baselineSubtract(
  angles: Float64Array,
  timeSeconds: number[],
  baselineSeconds: number = 1.0 // Primeiro 1 segundo
): Float64Array {
  // Encontrar índice do fim do baseline
  const baselineEndIndex = timeSeconds.findIndex((t) => t >= baselineSeconds);
  const endIndex =
    baselineEndIndex > 0 ? baselineEndIndex : Math.min(60, angles.length);

  // Calcular média
  let baselineSum = 0;
  for (let i = 0; i < endIndex; i++) {
    baselineSum += angles[i];
  }
  const baselineMean = baselineSum / endIndex;

  // Subtrair baseline
  const result = new Float64Array(angles.length);
  for (let i = 0; i < angles.length; i++) {
    result[i] = angles[i] - baselineMean;
  }

  return result;
}
```

### 6.2 Baseline para Anca

**Função**: `hipFlexSeries()` em `frontend/app/analysis/kinematics.ts`

```typescript
// Baseline: média dos primeiros ~200 amostras
const B0 = Math.min(n, 200); // ~200 amostras = ~3-4 segundos a 60Hz

let base = 0;
for (let i = 0; i < B0; i++) base += theta[i];
base /= Math.max(1, B0);

// Calcular valores relativos ao baseline
const thetaRelative = new Float64Array(n);
for (let i = 0; i < n; i++) {
  thetaRelative[i] = theta[i] - base;
}
```

---

## 7. Comparação: Calibração vs Baseline

| Aspecto                | Calibração Explícita | Baseline Automático (Atual) |
| ---------------------- | -------------------- | --------------------------- |
| **Complexidade**       | Alta                 | Baixa                       |
| **Tempo necessário**   | 5-10 minutos         | 3-5 segundos                |
| **Precisão**           | Muito alta           | Boa (joelho), Média (anca)  |
| **Validação**          | Sim                  | Não                         |
| **Drift compensation** | Sim                  | Não                         |
| **Implementado**       | ❌ Não               | ✅ Sim                      |

---

## 8. Conclusão

**Sistema Atual**:

- Usa **baseline automático** baseado nos primeiros segundos
- **Não requer calibração manual** explícita
- Funciona bem para **joelho** (precisão adequada)
- Tem limitações para **anca** (precisão menor)

**Recomendações**:

1. **Seguir protocolo** de baseline (paciente estático 3-5 segundos)
2. **Validar dados** após captura
3. **Melhorar preparação** (alinhamento, fixação)
4. **Considerar calibração explícita** no futuro se precisão melhor for necessária

**Limitações Aceitas**:

- Baseline automático é suficiente para uso clínico atual
- Calibração explícita seria complexa e pode não ser necessária
- Focar em **métricas relativas** (assimetria, mudanças ao longo do tempo) em vez de valores absolutos

---

## Referências

- `EXPLICACAO_LIMITACOES_MOVELLA_DOT.md` - Limitações técnicas
- `MOVELLA_SENSOR_MAPPING.md` - Mapeamento dos sensores
- Código: `frontend/app/analysis/metrics.ts` - Função `baselineSubtract()`
- Código: `frontend/app/analysis/kinematics.ts` - Função `hipFlexSeries()`

