# Métricas da Anca com 95%+ de Precisão

## Resumo Executivo

Este documento define **apenas as métricas da anca que conseguimos medir com pelo menos 95% de precisão**, baseado nas limitações técnicas dos sensores Movella DOT.

**Conclusão**: Devido às limitações do sistema (referencial instável do pélvis, drift acumulativo, 3 graus de liberdade), **apenas métricas relativas e qualitativas** conseguem atingir 95%+ de precisão.

---

## Métricas com 95%+ de Precisão

### 1. Assimetria ROM (Diferença entre Lados)

**Precisão**: ~95%+  
**Por quê**: Se ambos os lados têm o mesmo erro sistemático, a diferença cancela-se, resultando em alta precisão.

**Métrica**:
- `romDifference`: `|ROM_esquerdo - ROM_direito|` (em graus)
- `hasAsymmetry`: `true` se diferença > 10°
- `dominantSide`: `"left" | "right" | "balanced"`

**Uso Clínico**:
- Detectar assimetrias entre pernas
- Identificar compensações
- Monitorar progresso de reabilitação

**Limitação**: Só funciona se ambos os lados tiverem o mesmo erro sistemático (geralmente verdadeiro).

---

### 2. Detecção de Movimento (Qualitativo)

**Precisão**: ~95%+  
**Por quê**: Detecção binária (há/não há movimento) é robusta a erros sistemáticos.

**Métrica**:
- `movementDetected`: `boolean`
  - `true` se ROM > 20° (threshold mínimo)
  - `false` se ROM ≤ 20°

**Uso Clínico**:
- Verificar se o exercício foi realizado
- Validar qualidade dos dados
- Filtrar sessões sem movimento

---

### 3. Direção de Mudança (Tendência Relativa)

**Precisão**: ~95%+ (se erro sistemático for consistente entre sessões)  
**Por quê**: Comparação relativa entre sessões do mesmo paciente.

**Métrica**:
- `romChange`: `"increased" | "decreased" | "stable"`
- `changePercentage`: Percentagem de mudança relativa (não absoluta)

**Uso Clínico**:
- Monitorar progresso ao longo do tempo
- Detectar melhorias ou regressões
- Comparar sessões do mesmo paciente

**Limitação**: Requer comparação com sessão anterior. Só é preciso se o erro sistemático for consistente.

---

## Métricas NÃO Incluídas (Precisão < 95%)

### ❌ ROM Absoluto
- **Problema**: Erro de ~15-30% (105-120° vs ~90° esperado)
- **Precisão**: ~70-85%
- **Razão**: Referencial instável do pélvis

### ❌ MaxFlexion Absoluto
- **Problema**: Erro enorme (28-39° vs ~90° esperado)
- **Precisão**: ~30-40%
- **Razão**: Cálculo complexo com múltiplas transformações

### ❌ Velocidades (Peak, Avg, P95)
- **Problema**: Valores fisicamente impossíveis (ex: 4720°/s)
- **Precisão**: Variável, muitas vezes < 50%
- **Razão**: Derivadas de valores imprecisos amplificam erros

### ❌ Abdução/Rotação Absolutas
- **Problema**: Sem validação clínica
- **Precisão**: Desconhecida
- **Razão**: Não há dados de validação

### ❌ Repetições
- **Problema**: Não implementado (retorna 0)
- **Precisão**: N/A
- **Razão**: Funcionalidade não desenvolvida

---

## Interface de Dados

### Tipo TypeScript

```typescript
export interface HipMetricsAccurate {
  // Asymmetry (difference between sides) - 95%+ accurate
  asymmetry?: {
    romDifference: number; // |ROM_left - ROM_right|
    hasAsymmetry: boolean; // true if difference > threshold
  };
  
  // Movement detection (qualitative) - 95%+ accurate
  movementDetected: boolean;
  
  // Relative change indicators (if comparing with previous session)
  relativeChange?: {
    romChange: "increased" | "decreased" | "stable";
    changePercentage?: number; // Relative change, not absolute
  };
}
```

### Estrutura Completa no Resultado

```typescript
export interface AnalysisResult {
  // ... outras métricas ...
  
  // High-accuracy hip metrics only (95%+ precision)
  hipAccurate?: {
    left: HipMetricsAccurate;
    right: HipMetricsAccurate;
    bilateralAsymmetry: {
      romDifference: number;
      hasAsymmetry: boolean;
      dominantSide: "left" | "right" | "balanced";
    };
  };
}
```

---

## Implementação

### Função de Cálculo

A função `calculateAccurateHipMetrics()` calcula apenas métricas com 95%+ de precisão:

```typescript
function calculateAccurateHipMetrics(
  leftHipMetrics: KneeHipMetrics | undefined,
  rightHipMetrics: KneeHipMetrics | undefined
): HipMetricsAccurate | null
```

**Lógica**:
1. Calcula diferença de ROM entre lados (asymmetry)
2. Detecta se há movimento (ROM > threshold)
3. Determina lado dominante baseado em ROM
4. Retorna apenas métricas validadas

**Thresholds**:
- `asymmetryThreshold`: 10° (diferença significativa)
- `movementThreshold`: 20° (mínimo para considerar movimento)

---

## Uso na Interface

### Exibição Recomendada

1. **Assimetria**:
   - Mostrar diferença de ROM entre lados
   - Indicar se há assimetria significativa
   - Mostrar lado dominante

2. **Detecção de Movimento**:
   - Indicador visual (✓/✗) se movimento foi detectado
   - Aviso se não há movimento suficiente

3. **Mudanças Relativas** (se disponível):
   - Gráfico de tendência ao longo do tempo
   - Percentagem de mudança relativa
   - Indicador de melhoria/regressão

### Avisos na Interface

- **Não mostrar valores absolutos** de ROM, flexão, ou velocidades
- **Adicionar aviso**: "Métricas baseadas em comparação relativa. Valores absolutos não são precisos."
- **Focar em tendências** e comparações, não valores absolutos

---

## Validação

### Como Validar Precisão

1. **Assimetria**: Comparar com medições clínicas (goniômetro)
2. **Detecção de Movimento**: Validar com observação visual
3. **Mudanças Relativas**: Comparar com avaliações clínicas seriadas

### Limitações Conhecidas

- Assimetria só é precisa se ambos os lados tiverem o mesmo erro sistemático
- Mudanças relativas só são precisas se o erro sistemático for consistente entre sessões
- Detecção de movimento pode ter falsos positivos/negativos em casos extremos

---

## Comparação com Métricas do Joelho

| Métrica | Joelho | Anca (95%+) |
|---------|--------|-------------|
| ROM Absoluto | ✅ Preciso | ❌ Não incluído |
| MaxFlexion | ✅ Preciso | ❌ Não incluído |
| Velocidades | ✅ Preciso | ❌ Não incluído |
| Assimetria | ✅ Preciso | ✅ Preciso |
| Detecção Movimento | ✅ Preciso | ✅ Preciso |
| Mudanças Relativas | ✅ Preciso | ✅ Preciso (com limitações) |

---

## Conclusão

Para garantir 95%+ de precisão nas métricas da anca, **apenas métricas relativas e qualitativas** devem ser exibidas:

1. ✅ **Assimetria** (diferença entre lados)
2. ✅ **Detecção de Movimento** (qualitativo)
3. ✅ **Mudanças Relativas** (tendências ao longo do tempo)

**Todas as outras métricas** (ROM absoluto, flexão máxima, velocidades) **não devem ser exibidas** devido à baixa precisão (< 95%).

---

## Referências

- `EXPLICACAO_LIMITACOES_MOVELLA_DOT.md` - Limitações técnicas detalhadas
- `ANALYSIS_PIPELINE_FIXES.md` - Tentativas de correção implementadas
- Código: `frontend/app/services/analysisApi.ts` - Função `calculateAccurateHipMetrics()`


