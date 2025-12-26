# Limitações do Movella DOT para Análise de Quadril

## Resumo Executivo

Este documento explica por que o **Movella DOT pode não ser ideal** para análise precisa de movimento do quadril (anca), especialmente quando comparado com a análise de joelho. Baseia-se em evidências empíricas obtidas durante o desenvolvimento do sistema IRHIS e limitações técnicas conhecidas de sensores IMU (Inertial Measurement Units).

---

## 1. Complexidade da Articulação do Quadril

### 1.1 Natureza da Articulação

O **quadril** é uma articulação esférica (enartrose) com **3 graus de liberdade**:

- **Flexão/Extensão** (plano sagital): ~0° a 120°
- **Abdução/Adução** (plano frontal): ~0° a 45°
- **Rotação Interna/Externa** (plano transverso): ~0° a 45°

Em contraste, o **joelho** é uma articulação tipo dobradiça (ginglimo) com **1 grau de liberdade** principal:

- **Flexão/Extensão** (plano sagital): ~0° a 140°

### 1.2 Implicações para Análise

A complexidade do quadril significa que:

- Múltiplos movimentos ocorrem **simultaneamente** durante exercícios
- É necessário medir **3 ângulos independentes** com precisão
- Pequenos erros em qualquer dimensão afetam todas as outras
- O movimento do **pelvis** (pélvis) complica ainda mais os cálculos

---

## 2. Limitações Técnicas do Movella DOT

### 2.1 Drift de Orientação

**Problema**: Sensores IMU acumulam erro ao longo do tempo devido a:

- Integração de aceleração e velocidade angular
- Ruído do sensor
- Erros de calibração
- Deriva magnética (se usar magnetômetro)

**Impacto no Quadril**:
- O drift afeta todos os 3 eixos simultaneamente
- Erros se acumulam mais rapidamente em movimentos complexos
- Difícil de compensar sem referência externa estável

### 2.2 Referencial Relativo Instável

**Problema**: Para calcular ângulos do quadril, precisamos de um **referencial estável**. No entanto:

- O **pelvis se move** durante exercícios (mesmo que minimamente)
- Estabelecer um referencial "fixo" no pelvis é problemático
- Movimentos do tronco afetam a orientação do pelvis

**Evidência Empírica**:
- Valores de ROM inconsistentes (105-120° vs ~90° esperado)
- Flexão máxima muito baixa (28-39° vs ~90° esperado)
- Diferenças grandes entre lado esquerdo e direito

### 2.3 Fusão de Sensores

**Problema**: O Movella DOT usa **sensor fusion** para combinar dados de:

- Acelerômetro
- Giroscópio
- Magnetômetro (se disponível)

**Limitações**:
- Algoritmos de fusão introduzem **erros cumulativos**
- Dependem de condições ambientais (campos magnéticos, etc.)
- Podem não ser otimizados para movimentos biomecânicos específicos

### 2.4 Calibração e Alinhamento

**Problema**: Análise precisa requer:

- **Calibração inicial** precisa de cada sensor
- **Alinhamento correto** dos sensores com os eixos anatômicos
- **Referência estática** para estabelecer baseline

**Desafios**:
- Difícil garantir alinhamento perfeito em ambiente clínico
- Calibração pode não ser feita corretamente ou pode "derivar" ao longo do tempo
- Pequenos erros de alinhamento causam grandes erros em ângulos calculados

---

## 3. Evidências dos Problemas Encontrados

### 3.1 Resultados Inconsistentes

Durante testes com dados reais do Movella DOT, observamos:

| Métrica | Esperado | Observado (Esquerdo) | Observado (Direito) |
|---------|----------|----------------------|---------------------|
| ROM | ~90° | 119.7° | 104.8° |
| Max Flexion | ~90° | 28.6° | 39.9° |
| Max Extension | ~0° | 0.0° | 0.0° |
| Peak Velocity | <500°/s | 260.8°/s | 4720.4°/s |

### 3.2 Problemas Específicos Identificados

1. **ROM vs Flexão Máxima Inconsistente**:
   - ROM calculado: 105-120° (alto, mas indica movimento detectado)
   - Flexão máxima: 28-39° (muito baixo)
   - **Interpretação**: O método está detectando movimento, mas não consegue quantificar corretamente a flexão absoluta

2. **Velocidades Fisicamente Impossíveis**:
   - Peak Velocity: 4720.4°/s (fisicamente inviável)
   - **Interpretação**: Ruído, problemas de sincronização temporal, ou erros de cálculo de derivada

3. **Diferenças Entre Lados**:
   - Diferença significativa entre quadril esquerdo e direito
   - **Interpretação**: Problemas de calibração/alinhamento ou qualidade inconsistente dos dados

---

## 4. Comparação: Quadril vs Joelho

### 4.1 Por que o Joelho Funciona Melhor

O **joelho** é mais adequado para análise com Movella DOT porque:

| Aspecto | Joelho | Quadril |
|---------|--------|---------|
| Tipo de Articulação | Dobradiça (1 DOF) | Esférica (3 DOF) |
| Movimento Principal | Flexão/Extensão | Flexão + Abdução + Rotação |
| Referencial | Relativamente estável (coxa fixa) | Instável (pelvis se move) |
| Complexidade | Baixa | Alta |
| Precisão Necessária | 1 dimensão | 3 dimensões simultâneas |

### 4.2 Resultados do Joelho vs Quadril

**Joelho** (no mesmo sistema):
- ✅ ROM consistente e próximo do esperado
- ✅ Velocidades razoáveis
- ✅ Diferenças entre lados menores
- ✅ Métricas clinicamente úteis

**Quadril**:
- ❌ ROM inconsistente
- ❌ Flexão máxima incorreta
- ❌ Velocidades fisicamente impossíveis
- ❌ Métricas não confiáveis para uso clínico

---

## 5. Limitações Conhecidas de IMUs para Análise Biomecânica

### 5.1 Literatura Científica

Estudos na literatura indicam que:

- IMUs são **adequados** para articulações tipo dobradiça (joelho, cotovelo)
- IMUs têm **limitações** para articulações esféricas (quadril, ombro)
- Precisão diminui significativamente com:
  - Número de graus de liberdade
  - Movimento do referencial
  - Complexidade do movimento

### 5.2 Sistemas Alternativos

Para análise precisa de quadril, sistemas mais adequados incluem:

- **Sistemas de Motion Capture** (câmeras + marcadores)
- **Sistemas optoeletrônicos** (Vicon, OptiTrack)
- **Sistemas de análise de vídeo** com IA
- **Sistemas híbridos** (IMU + referência externa)

---

## 6. Recomendações Práticas

### 6.1 Para o Projeto IRHIS

1. **Focar no Joelho**:
   - O Movella DOT funciona bem para análise de joelho
   - Manter e melhorar análise de joelho como funcionalidade principal
   - Documentar que análise de joelho é a funcionalidade validada

2. **Para Quadril - Opções**:
   
   **Opção A: Remover Análise de Quadril**
   - Remover funcionalidade de análise de quadril
   - Focar apenas em joelho
   - Simplificar interface e código
   
   **Opção B: Manter com Avisos**
   - Manter análise de quadril mas com **avisos claros** sobre limitações
   - Apresentar valores como **tendências qualitativas**, não absolutos
   - Não usar para decisões clínicas críticas
   
   **Opção C: Usar Métodos Alternativos**
   - Integrar análise de vídeo para quadril
   - Usar sistemas de motion capture para validação
   - Desenvolver métodos híbridos

### 6.2 Documentação para Usuários

Se decidir manter análise de quadril, documentar claramente:

- **Limitações conhecidas** do sistema
- **Precisão esperada** (ou falta dela)
- **Casos de uso apropriados** (trends, não valores absolutos)
- **Quando NÃO usar** (decisões clínicas críticas)

---

## 7. Conclusão

O **Movella DOT não é ideal** para análise precisa de movimento do quadril devido a:

1. ✅ **Complexidade da articulação** (3 graus de liberdade)
2. ✅ **Limitações técnicas** de IMUs (drift, referencial instável)
3. ✅ **Evidências empíricas** de resultados inconsistentes
4. ✅ **Literatura científica** que confirma essas limitações

**Recomendação Final**: 

- **Focar no joelho** como funcionalidade principal e validada
- **Considerar remover** análise de quadril ou mantê-la apenas com avisos claros
- **Explorar alternativas** (vídeo, motion capture) se análise de quadril for essencial

---

## Referências e Notas

- Este documento baseia-se em testes empíricos realizados durante desenvolvimento do IRHIS
- Limitações documentadas são específicas para análise biomecânica clínica
- Para uso em pesquisa ou desenvolvimento, podem ser aplicáveis métodos de calibração mais rigorosos
- Consulte literatura científica sobre uso de IMUs em biomecânica para mais detalhes

---

**Data**: Dezembro 2024  
**Autor**: Análise Técnica IRHIS  
**Versão**: 1.0

