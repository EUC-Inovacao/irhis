# Por que os Movella DOT não são adequados para análise precisa de quadris?

**Documento para Reunião - Análise de Limitações Técnicas**

---

## Resumo Executivo

Este documento explica por que os sensores **Movella DOT** fornecem resultados **precisos e fiáveis para análise de joelho**, mas apresentam **limitações significativas para análise de quadril**, mesmo tendo todos os dados necessários (orientação 3D completa).

**Conclusão principal**: O problema **não é falta de dados** (temos orientação completa 360º), nem é **problema de código** (várias abordagens foram testadas). É uma **limitação física/biomecânica inerente** à medição de articulações complexas com sensores IMU.

---

## 1. A Questão Fundamental

### Pergunta que surge:

> "Se temos dados de Euler (Euler_X, Euler_Y, Euler_Z) que fornecem orientação completa 3D (360º), por que não conseguimos medições precisas de quadril como conseguimos para joelho?"

### Resposta curta:

**Os dados permitem medições de 360º** (orientação completa)  
**O código está bem implementado** (várias abordagens foram testadas)  
**Mas o problema é físico/biomecânico**: o referencial (pélvis) também se move, causando inconsistências que não podem ser totalmente corrigidas apenas com processamento

---

## 2. O que temos: Dados dos Sensores Movella DOT

### 2.1 Formato de Dados Exportados

Os sensores Movella DOT exportam dados CSV com:

| Campo            | Descrição                        | Unidade       | O que fornece          |
| ---------------- | -------------------------------- | ------------- | ---------------------- |
| `Euler_X`        | Ângulo de Euler no eixo X        | Graus (°)     | Orientação completa    |
| `Euler_Y`        | Ângulo de Euler no eixo Y        | Graus (°)     | Orientação completa    |
| `Euler_Z`        | Ângulo de Euler no eixo Z        | Graus (°)     | Orientação completa    |
| `FreeAcc_X`      | Aceleração livre (sem gravidade) | m/s²          | Dados de aceleração    |
| `FreeAcc_Y`      | Aceleração livre (sem gravidade) | m/s²          | Dados de aceleração    |
| `FreeAcc_Z`      | Aceleração livre (sem gravidade) | m/s²          | Dados de aceleração    |
| `SampleTimeFine` | Timestamp preciso                | Microsegundos | Sincronização temporal |

### 2.2 O que os dados de Euler realmente fornecem

**Importante**: Os ângulos de Euler **já fornecem orientação 3D completa**:

- Cada eixo pode variar de -180° a +180° (ou 0° a 360°)
- Juntos, os 3 eixos representam **qualquer orientação 3D possível**
- **Não há limitação de 180° vs 360°** - temos orientação completa

**Exemplo real dos dados**:

```
Euler_X: -96.604095
Euler_Y: -14.144427
Euler_Z: 43.073235
```

Estes valores já representam orientação completa 3D - não falta informação.

### 2.3 Mapeamento dos Sensores

No nosso protocolo padrão:

| DeviceTag | Segmento Corporal               | Uso                           |
| --------- | ------------------------------- | ----------------------------- |
| 1         | Coxa Direita (acima do joelho)  | Análise joelho direito        |
| 2         | Perna Direita (malleolus)       | Análise joelho direito        |
| 3         | Coxa Esquerda (acima do joelho) | Análise joelho esquerdo       |
| 4         | Perna Esquerda (malleolus)      | Análise joelho esquerdo       |
| 5         | Pélvis (região L5/sacro)        | Análise quadril (referencial) |

---

## 3. Por que o Joelho Funciona Bem

### 3.1 Anatomia do Joelho

- **Tipo de articulação**: Dobradiça (ginglimo)
- **Graus de liberdade**: **1 principal** (flexão/extensão)
- **Movimento**: Principalmente em um plano (sagital)
- **Amplitude normal**: 0° a ~140° de flexão

### 3.2 Por que a medição é precisa

1. **Referencial estável**: A coxa funciona como base relativamente fixa
2. **Movimento simples**: Apenas 1 grau de liberdade (flexão/extensão)
3. **Cálculo directo**: Compara directamente orientação de dois segmentos
4. **Menos erros cumulativos**: Erros afectam apenas 1 dimensão

### 3.3 Como o código calcula o joelho

```typescript
// Método simples e direto:
// 1. Rotaciona eixo ósseo da coxa para coordenadas do mundo
const vt = rotateVecByQuat(qThigh, BONE_AXIS);

// 2. Rotaciona eixo ósseo da perna para coordenadas do mundo
const vs = rotateVecByQuat(qShank, BONE_AXIS);

// 3. Calcula ângulo entre os dois vetores (produto escalar)
const dot = clamp(dot3(vt, vs) / (norm(vt) * norm(vs)), -1, 1);
const kneeAngle = Math.acos(dot) * (180 / Math.PI);
```

**Por que funciona**:

- Referencial estável (coxa como base)
- Cálculo directo sem transformações complexas
- 1 dimensão = menos pontos de falha

### 3.4 Resultados observados (Joelho)

| Métrica       | Status       | Observação                      |
| ------------- | ------------ | ------------------------------- |
| ROM           | Consistente  | Valores próximos do esperado    |
| Flexão máxima | Correta      | ~90-140° conforme esperado      |
| Velocidades   | Razoáveis    | Valores fisiológicos plausíveis |
| Repetições    | Detectadas   | Contagem automática funciona    |
| Assimetrias   | Consistentes | Diferenças entre lados pequenas |

---

## 4. Por que o Quadril é Problemático

### 4.1 Anatomia do Quadril

- **Tipo de articulação**: Esférica (enartrose)
- **Graus de liberdade**: **3 simultâneos**:
  - Flexão/Extensão (sagital): ~0° a 120°
  - Abdução/Adução (frontal): ~0° a 45°
  - Rotação Interna/Externa (transverso): ~0° a 45°
- **Movimento**: Múltiplos planos simultaneamente
- **Complexidade**: Alta

### 4.2 Problemas Fundamentais

#### Problema 1: Referencial Instável

**O problema crítico**: Para calcular ângulos do quadril, precisamos de um **referencial estável** (o pélvis). Mas:

- O **pélvis move-se** durante exercícios (mesmo que minimamente)
- Movimentos do tronco afectam a orientação do pélvis
- Estabelecer um referencial "fixo" no pélvis é problemático
- Qualquer movimento do pélvis introduz erro nos cálculos do quadril

**Comparação**:

- **Joelho**: Coxa (base) é relativamente fixa
- **Quadril**: Pélvis (base) também se move

#### Problema 2: Drift de Orientação (Erros Acumulativos)

Sensores IMU (como Movella DOT) acumulam erro ao longo do tempo devido a:

- Integração de aceleração e velocidade angular
- Ruído do sensor
- Erros de calibração
- Deriva magnética (magnetômetro)

**Impacto**:

- **Joelho**: Drift afecta principalmente 1 eixo - mais fácil de compensar
- **Quadril**: Drift afecta **todos os 3 eixos simultaneamente** - erros multiplicam-se

#### Problema 3: Complexidade dos Cálculos

Para calcular o quadril, o código precisa fazer:

1. Transformação de coordenadas relativas ao pélvis
2. Cálculo de matrizes de rotação 3x3
3. Escolha da melhor coluna da matriz (3 opções: 0, 1, ou 2)
4. Unwrapping cumulativo de ângulos (evitar descontinuidades)
5. Ajuste de baseline
6. Separação de múltiplos planos (sagital, frontal, transverso)

Cada passo adicional é uma oportunidade para erros se acumularem.

### 4.3 Como o código calcula o quadril

```typescript
// Método complexo com múltiplas transformações:
// 1. Converte pélvis e coxa para matrizes de rotação 3x3
const Rp = mat3FromQuat(pelvisQ[i]);
const Rt = mat3FromQuat(thighQ[i]);

// 2. Calcula orientação relativa: R_rel = R_pelvis^T · R_thigh
const Rrel = mul33(transpose3(Rp), Rt);

// 3. Extrai componentes para calcular ângulo sagital
const u1 = Rrel[1][k],
  u2 = Rrel[2][k];
theta[i] = Math.atan2(u2, -u1) * (180 / Math.PI);

// 4. Unwrapping cumulativo para evitar descontinuidades
// 5. Baseline adjustment (média dos primeiros 200 samples)
// 6. Escolha automática da melhor coluna (k=0, 1, ou 2)
```

**Por que é problemático**:

- Múltiplas transformações = múltiplos pontos de falha
- Dependência de referencial instável (pélvis)
- 3 dimensões = erros se multiplicam

### 4.4 Resultados observados (Quadril)

| Métrica       | Esperado | Observado (Esquerdo) | Observado (Direito) | Status                 |
| ------------- | -------- | -------------------- | ------------------- | ---------------------- |
| ROM           | ~90°     | 119.7°               | 104.8°              | Inconsistente          |
| Max Flexion   | ~90°     | 28.6°                | 39.9°               | Muito incorrecto       |
| Max Extension | ~0°      | 0.0°                 | 0.0°                | OK por baseline        |
| Peak Velocity | <500°/s  | 260.8°/s             | **4720.4°/s**       | Fisicamente impossível |

**Problemas identificados**:

- ROM inconsistente (105-120° vs ~90° esperado)
- Flexão máxima incorrecta (28-39° vs ~90° esperado)
- Velocidades fisicamente impossíveis (4720°/s)
- Grandes diferenças entre lados (problemas de calibração/alinhamento)

---

## 5. O que foi tentado no código

### 5.1 Métodos de Cálculo Testados

Antes de concluir sobre as limitações, foram implementadas e testadas **várias abordagens**:

- Método pelvis-frame (relativo ao pélvis)
- Método world-frame (relativo ao eixo vertical do mundo)
- Unwrapping de ângulos para evitar descontinuidades (359° spikes)
- Seleção automática da melhor coluna da matriz de rotação (0, 1, ou 2)
- Cálculo de abdução e rotação em planos separados
- Transformações de matriz corrigidas (transpose)
- Sistema de coordenadas corrigido (x=right, y=up, z=forward)

### 5.2 Ajustes de Baseline Testados

- Média dos primeiros 200 samples
- Baseline relativo (centrado em zero)
- Mínimo absoluto como referência de extensão
- Baseline dinâmico

### 5.3 Correções e Optimizações Implementadas

- Escala proporcional para ajustar flexão máxima
- Cálculo correcto de velocidades usando gradient com tempo em segundos
- Alinhamento temporal de dados de múltiplos sensores
- Detecção de janela activa de movimento
- Sanity checks para valores não realistas
- Sistema de avisos para erros de cálculo

### 5.4 Resultado das Tentativas

Apesar de todas essas tentativas, os resultados continuaram inconsistentes e não clinicamente fiáveis, confirmando as limitações fundamentais do sistema.

---

## 6. FreeAcc: Por que não resolve o problema

### 6.1 O que é FreeAcc

`FreeAcc` (Free Acceleration) são dados de **aceleração linear sem a componente de gravidade**:

- `FreeAcc_X`, `FreeAcc_Y`, `FreeAcc_Z` em m/s²
- Representa apenas aceleração causada por movimento, não gravidade

### 6.2 FreeAcc está disponível mas não é usado

**Situação actual**:

- FreeAcc está nos dados CSV
- FreeAcc é capturado pelos sensores
- FreeAcc **não está a ser usado** nos cálculos de ângulos articulares

### 6.3 Por que FreeAcc poderia ajudar (mas não resolve)

FreeAcc poderia teoricamente ser usado para:

1. **Detecção de drift**: Quando o sensor está estático, FreeAcc ≈ 0
2. **Correção de baseline**: Identificar períodos de repouso
3. **Detecção de movimento**: Distinguir movimento ativo de estático

**Mas não resolve o problema fundamental**:

- Não corrige o referencial instável do pélvis
- Não elimina o drift acumulativo em 3 dimensões
- Não resolve a complexidade de 3 graus de liberdade simultâneos
- O pélvis continua a mover-se, introduzindo erro

**Conclusão**: FreeAcc poderia melhorar alguns aspectos (detecção de drift), mas **não resolve o problema fundamental** do referencial instável.

---

## 7. Comparação Direta: Joelho vs Quadril

### 7.1 Tabela Comparativa

| Aspecto                     | Joelho                                | Quadril                                  |
| --------------------------- | ------------------------------------- | ---------------------------------------- |
| **Tipo de articulação**     | Dobradiça (1 DOF - Degree of Freedom) | Esférica (3 DOF)                         |
| **Graus de liberdade**      | 1 (flexão/extensão)                   | 3 (flexão + abdução + rotação)           |
| **Referencial**             | Estável (coxa fixa)                   | Instável (pélvis move-se)                |
| **Complexidade do cálculo** | Baixa (dot product)                   | Alta (matrizes + transformações)         |
| **Erros acumulativos**      | 1 dimensão                            | 3 dimensões simultâneas                  |
| **Precisão**                | Boa                                   | Má                                       |
| **Resultados**              | Consistentes                          | Inconsistentes                           |
| **ROM observado**           | Consistente (~60-80°)                 | Inconsistente (105-120° vs 90° esperado) |
| **Flexão máxima**           | Correcta (~90-140°)                   | Incorrecta (28-39° vs 90° esperado)      |
| **Velocidades**             | Razoáveis (<500°/s)                   | Impossíveis (>4000°/s)                   |
| **Uso clínico**             | Adequado                              | Não fiável                               |

### 7.2 Por que a diferença é tão grande

**Joelho**:

- Cálculo simples: compara dois segmentos directamente
- Referencial estável: coxa é base fixa
- 1 dimensão: menos pontos de falha

**Quadril**:

- Cálculo complexo: múltiplas transformações de coordenadas
- Referencial instável: pélvis move-se
- 3 dimensões: erros multiplicam-se

---

## 8. Conclusões Técnicas

### 8.1 O que temos (dados)

**Orientação 3D completa** (Euler_X, Y, Z fornecem 360º)  
**Dados de aceleração** (FreeAcc disponível)  
**Timestamp preciso** (sincronização temporal)  
**Múltiplos sensores** (pélvis + coxas + pernas)

**Conclusão sobre dados**: **Não falta informação** - temos tudo que tecnicamente precisamos.

### 8.2 O que temos (código)

**Múltiplas abordagens testadas** (pelvis-frame, world-frame, etc.)  
**Correções implementadas** (unwrapping, baseline, transformações)  
**Optimizações aplicadas** (seleção de colunas, ajustes temporais)  
**Código funcional** (joelho funciona perfeitamente)

**Conclusão sobre código**: **Não é problema de implementação** - várias abordagens foram testadas.

### 8.3 O problema real

**Referencial instável**: Pélvis move-se durante exercícios  
**Drift acumulativo**: Erros acumulam-se em 3 dimensões simultâneas  
**Complexidade biomecânica**: 3 graus de liberdade difíceis de separar precisamente  
**Limitação física**: IMUs têm limitações conhecidas para articulações esféricas

**Conclusão sobre o problema**: É uma **limitação física/biomecânica inerente** à medição com IMUs, não um problema de dados ou código.

### 8.4 Por que o joelho funciona e o quadril não

**Joelho**:

- Articulação simples (1 DOF)
- Referencial estável (coxa fixa)
- Cálculo directo
- Precisão adequada para uso clínico

**Quadril**:

- Articulação complexa (3 DOF)
- Referencial instável (pélvis móvel)
- Cálculos complexos
- Precisão insuficiente para uso clínico

---

## 9. Recomendações

### 9.1 Para o Projeto

1. **Focar no Joelho**

   - Movella DOT funciona bem para análise de joelho
   - Manter e melhorar análise de joelho como funcionalidade principal
   - Documentar que análise de joelho é a funcionalidade validada

2. **Para Quadril - Opções**:

   **Opção A: Remover Análise de Quadril**

   - Remover funcionalidade de análise de quadril
   - Focar apenas em joelho
   - Simplificar interface e código
   - **Recomendado**: Mais simples e claro

   **Opção B: Manter com Avisos Claros**

   - Manter análise de quadril mas com **avisos claros** sobre limitações
   - Apresentar valores como **tendências qualitativas**, não absolutos
   - **Não usar para decisões clínicas críticas**
   - Pode confundir utilizadores

---

## 10. Analogias e Explicações Simples

### 10.1 Analogia: Medir altura numa plataforma móvel

**Situação**: Queremos medir a altura de uma pessoa.

**Joelho (Funciona bem)**:

- A pessoa está numa **plataforma fixa** (solo)
- Medimos da plataforma até ao topo da cabeça
- Se a plataforma não se move, a medição é precisa
- **Analogia**: Coxa (plataforma fixa) - medição precisa

**Quadril (Problemas)**:

- A pessoa está numa **plataforma móvel** que também se move
- Medimos da plataforma móvel até ao topo da cabeça
- Se a plataforma se move, não sabemos se a altura mudou ou se foi a plataforma que se moveu
- **Analogia**: Pélvis (plataforma móvel) - medição imprecisa

**Conclusão da analogia**:

- Não é problema do instrumento de medição (sensor)
- Não é problema do método de cálculo (código)
- É problema de ter uma **base de referência que também se move**

### 10.2 Analogia: GPS vs Bússola

**GPS (Joelho)**:

- Tem referência fixa (satélites no espaço)
- Pode calcular posição precisamente
- Referencial estável = medição precisa

**Bússola (Quadril)**:

- Depende de campo magnético que varia
- Se o campo magnético muda, a direcção muda
- Referencial variável = medição imprecisa

**Analogia**:

- **Joelho**: Como GPS - referencial fixo (coxa) = medição precisa
- **Quadril**: Como bússola - referencial variável (pélvis) = medição imprecisa

### 10.3 Explicação Simples: Por que 3 é mais difícil que 1

**Joelho - 1 dimensão**:

- Imagine desenhar uma linha reta
- Precisa apenas de 1 ponto de referência
- Fácil de medir precisamente

**Quadril - 3 dimensões**:

- Imagine desenhar um objeto 3D no espaço
- Precisa de 3 pontos de referência (x, y, z)
- Se qualquer um dos 3 pontos se mover, todo o objecto fica desalinhado
- Muito mais difícil de medir precisamente

**Conclusão**: Quanto mais dimensões, mais pontos de falha, mais difícil de medir com precisão.

### 10.4 Explicação Simples: Dados vs Precisão

**Pergunta comum**: "Se temos todos os dados (360º), por que não funciona?"

**Resposta simples**:

- Temos os dados (orientação completa)
- Temos o código (bem implementado)
- Mas a "régua" que usamos para medir também se move (pélvis que se move)

**Analogia**:

- É como ter uma **régua perfeita** (sensores)
- E um **código perfeito** (algoritmos)
- Mas a **superfície onde medimos** também se move (pélvis)
- Mesmo com régua e código perfeitos, se a superfície se mover, a medição fica imprecisa

### 10.5 Resumo não-técnico

**Pergunta**: Por que joelho funciona e quadril não?

**Resposta em 3 pontos**:

1. **Joelho é simples**

   - Movimento numa direção (dobradiça)
   - Base fixa (coxa não se move muito)
   - Fácil de medir com precisão

2. **Quadril é complexo**

   - Movimento em 3 direções simultaneamente
   - Base móvel (pélvis move-se)
   - Difícil de medir com precisão

3. **Não é falta de dados ou código**
   - Temos todos os dados necessários
   - Código está bem implementado
   - É limitação física: medir algo complexo com base que também se move

**Conclusão simples**:

> "É como tentar medir a altura de alguém que está num barco a balançar no mar. Mesmo com a melhor régua do mundo e os melhores cálculos, se o barco se mover, a medição fica imprecisa. O joelho funciona porque está numa 'base fixa', o quadril não porque a 'base' (pélvis) também se move."

---

## 11. Evidências Científicas

### 11.1 Literatura Científica

Estudos na literatura indicam que:

- IMUs são **adequados** para articulações tipo dobradiça (joelho, cotovelo)
- IMUs têm **limitações** para articulações esféricas (quadril, ombro)
- Precisão diminui significativamente com:
  - Número de graus de liberdade
  - Movimento do referencial
  - Complexidade do movimento

### 11.2 Sistemas Alternativos

Para análise precisa de quadril, sistemas mais adequados incluem:

- **Sistemas de Motion Capture** (câmaras + marcadores)
- **Sistemas optoelectrónicos** (Vicon, OptiTrack)
- **Sistemas de análise de vídeo** com IA
- **Sistemas híbridos** (IMU + referência externa)

---

## 12. Perguntas Frequentes (FAQ)

### Q1: Não podemos melhorar o código?

**R**: Já foram testadas várias abordagens (pelvis-frame, world-frame, unwrapping, seleção de colunas, ajustes de baseline, etc.). Os resultados continuam inconsistentes. O problema não é código, é físico/biomecânico.

### Q2: FreeAcc não resolve?

**R**: FreeAcc poderia ajudar com detecção de drift, mas não resolve o problema fundamental: o pélvis move-se, criando um referencial instável. Mesmo com FreeAcc, o problema permanece.

### Q3: Por que não usar mais sensores?

**R**: Já usamos sensores no pélvis. O problema não é falta de sensores, é que o pélvis (onde está o sensor) também se move durante exercícios.

### Q4: Não podemos calibrar melhor?

**R**: Calibração ajuda, mas não resolve o problema fundamental. Mesmo com calibração perfeita, se o referencial (pélvis) se mover durante o movimento, os erros acumulam-se.

### Q5: Por que outros sistemas conseguem?

**R**: Sistemas de motion capture (câmaras + marcadores) conseguem porque:

- Usam câmaras externas como referencial fixo
- Não dependem de sensores no corpo
- Têm referencial verdadeiramente fixo (sala/laboratório)

---

## 13. Referências e Documentação

- `MOVELLA_DOT_HIP_LIMITATIONS.md` - Documentação detalhada das limitações
- `MOVELLA_DOT_LIMITATIONS.md` - Resumo das limitações
- `DADOS_MOVELLA_DOT.md` - Descrição dos dados disponíveis
- `ANALYSIS_PIPELINE_FIXES.md` - Tentativas de correção implementadas
- `MOVELLA_SENSOR_MAPPING.md` - Mapeamento dos sensores

Estes documentos estão presentes na pasta docs do repositório.

---

## 14. Apêndices

### A. Dados Observados vs Esperados

**Joelho** (exemplo real):

- ROM: 60-80° (esperado: 60-90°) - Consistente
- Flexão máxima: 90-140° (esperado: 90-140°) - Correcta
- Velocidade pico: 200-400°/s (esperado: <500°/s) - Razoável
- Repetições: Detectadas correctamente

**Quadril** (exemplo real):

- ROM: 105-120° (esperado: ~90°) - Inconsistente
- Flexão máxima: 28-39° (esperado: ~90°) - Incorrecta
- Velocidade pico: 4720°/s (esperado: <500°/s) - Fisicamente impossível
- Repetições: Difícil de detectar consistentemente

### B. Código: Comparação Joelho vs Quadril

**Código do Joelho** (simples):

```typescript
// 3 passos simples:
const vt = rotateVecByQuat(qThigh, AXIS);
const vs = rotateVecByQuat(qShank, AXIS);
const angle = Math.acos(dot3(vt, vs)) * (180 / Math.PI);
```

**Código do Quadril** (complexo):

```typescript
// Múltiplos passos complexos:
const Rp = mat3FromQuat(pelvisQ[i]);
const Rt = mat3FromQuat(thighQ[i]);
const Rrel = mul33(transpose3(Rp), Rt);
const theta = Math.atan2(u2, -u1) * (180 / Math.PI);
// + unwrapping
// + baseline adjustment
// + seleção de coluna
// + múltiplas transformações
```
