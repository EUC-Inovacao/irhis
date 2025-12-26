# Dados Obtidos da Análise Movella DOT

## Resumo Executivo

Este documento descreve os **dados e métricas** que conseguimos extrair e calcular através da análise dos dados capturados pelos sensores **Movella DOT**. O sistema permite análise biomecânica detalhada de movimentos, com foco especial em articulações do membro inferior (joelho e quadril).

---

## 1. Dados Brutos do Sensor

### 1.1 Formato de Dados Exportados

Os sensores Movella DOT exportam dados em formato CSV com os seguintes campos:

| Campo | Descrição | Unidade | Formato |
|-------|-----------|---------|---------|
| `PacketCounter` | Contador sequencial de pacotes | - | Inteiro |
| `SampleTimeFine` | Timestamp preciso do sensor | Microsegundos | Inteiro |
| `Euler_X` | Ângulo de Euler no eixo X | Graus (°) | Float |
| `Euler_Y` | Ângulo de Euler no eixo Y | Graus (°) | Float |
| `Euler_Z` | Ângulo de Euler no eixo Z | Graus (°) | Float |
| `FreeAcc_X` | Aceleração livre no eixo X (sem gravidade) | m/s² | Float |
| `FreeAcc_Y` | Aceleração livre no eixo Y (sem gravidade) | m/s² | Float |
| `FreeAcc_Z` | Aceleração livre no eixo Z (sem gravidade) | m/s² | Float |
| `Status` | Status do sensor (flags de clipping, etc.) | - | Inteiro |

### 1.2 Metadados do Arquivo

Cada arquivo CSV contém também metadados importantes:

- **DeviceTag**: Identificação do sensor (1-5)
- **FirmwareVersion**: Versão do firmware do sensor
- **AppVersion**: Versão da aplicação Movella
- **SyncStatus**: Status de sincronização
- **OutputRate**: Taxa de amostragem (ex: 60Hz)
- **FilterProfile**: Perfil de filtro aplicado
- **Measurement Mode**: Modo de medição (ex: Sensor fusion Mode - Extended(Euler))
- **StartTime**: Timestamp de início da captura

### 1.3 Mapeamento de Sensores

No protocolo padrão usado no projeto:

| DeviceTag | Segmento Corporal | Lado |
|-----------|-------------------|------|
| 1 | Coxa (acima do joelho) | Direito |
| 2 | Perna (malleolus peroneal) | Direito |
| 3 | Coxa (acima do joelho) | Esquerdo |
| 4 | Perna (malleolus peroneal) | Esquerdo |
| 5 | Pélvis (região L5/sacro) | - |

---

## 2. Dados Processados e Calculados

### 2.1 Orientação e Quaternions

**Conversão Euler → Quaternion**:
- Os ângulos de Euler (ZYX intrinsic) são convertidos para quaternions
- Quaternions permitem cálculos mais precisos e evitam problemas de gimbal lock
- Formato: `[w, x, y, z]` (Hamilton convention)

**Aplicações**:
- Cálculo de orientação absoluta de cada segmento corporal
- Transformação entre sistemas de coordenadas
- Cálculo de ângulos relativos entre segmentos

---

## 3. Análise de Articulações

### 3.1 Análise de Joelho

#### 3.1.1 Ângulo Articular do Joelho

**Método de Cálculo**:
- Combina orientações da coxa e da perna (shank)
- Usa produto escalar entre eixos ósseos rotacionados
- Retorna série temporal de ângulos em graus

**Dados Obtidos**:
- **Série temporal de ângulos**: Valores de ângulo do joelho ao longo do tempo
- **ROM (Range of Motion)**: Amplitude total de movimento (máximo - mínimo)
- **Flexão máxima**: Valor máximo de flexão alcançado
- **Extensão máxima**: Valor mínimo de extensão (normalmente próximo a 0°)

#### 3.1.2 Velocidades Angulares

**Cálculo**:
- Derivada temporal dos ângulos articulares
- Usa diferenças finitas centrais para maior precisão
- Unidade: graus por segundo (°/s)

**Métricas de Velocidade**:
- **Velocidade média**: Média das velocidades absolutas
- **Velocidade de pico**: Valor máximo absoluto de velocidade
- **Percentil 95**: 95º percentil das velocidades (remove outliers)

#### 3.1.3 Detecção de Repetições

**Algoritmo**:
- Detecção de picos locais na série de ângulos
- Filtragem por amplitude mínima (threshold dinâmico baseado no ROM)
- Distância mínima entre picos (ex: 0.6 segundos)

**Dados Obtidos**:
- **Número de repetições**: Contagem total de movimentos completos
- **Posições dos picos**: Timestamps de cada repetição
- **Cadência**: Repetições por minuto (se aplicável)

#### 3.1.4 Métricas de Assimetria

**Comparação Entre Lados**:
- Diferença de ROM entre joelho esquerdo e direito
- Diferença no número de repetições
- Identificação do lado dominante

**Dados Obtidos**:
- **Diferença de ROM**: `|ROM_esquerdo - ROM_direito|`
- **Diferença de repetições**: `|Reps_esquerdo - Reps_direito|`
- **Lado dominante**: "left", "right", ou "balanced"

---

### 3.2 Análise de Quadril

⚠️ **Nota Importante**: A análise de quadril tem limitações conhecidas. Consulte `MOVELLA_DOT_HIP_LIMITATIONS.md` para detalhes.

#### 3.2.1 Flexão de Quadril

**Método de Cálculo**:
- Usa referencial relativo à pélvis
- Calcula ângulo sagital (plano de flexão/extensão)
- Aplica unwrapping cumulativo para valores contínuos

**Dados Obtidos**:
- **Série temporal de flexão**: Valores de flexão ao longo do tempo
- **ROM de flexão**: Amplitude de movimento no plano sagital
- **Flexão máxima**: Valor máximo alcançado
- **Extensão máxima**: Valor mínimo (baseline)

#### 3.2.2 Abdução/Addução de Quadril

**Método de Cálculo**:
- Análise no plano frontal (Y-Z)
- Projeção do eixo da coxa no plano frontal
- Ângulo relativo à linha vertical

**Dados Obtidos**:
- **Série temporal de abdução**: Valores positivos = abdução, negativos = adução
- **Amplitude de abdução**: Máxima abdução alcançada
- **Amplitude de adução**: Máxima adução alcançada

#### 3.2.3 Rotação de Quadril

**Método de Cálculo**:
- Análise no plano transverso (X-Z)
- Rotação em torno do eixo longitudinal da coxa
- Ângulo de rotação interna/externa

**Dados Obtidos**:
- **Série temporal de rotação**: Valores positivos = rotação interna, negativos = externa
- **Amplitude de rotação**: Máxima rotação em qualquer direção

---

## 4. Análise de Centro de Massa (CoM)

### 4.1 Modelo Segmentar

**Baseado em**:
- Dados antropométricos de De Leva (1996)
- Modelo biomecânico padrão de 5 segmentos

**Segmentos Incluídos**:
- Pélvis
- Coxa esquerda
- Coxa direita
- Perna esquerda
- Perna direita

**Parâmetros Antropométricos**:
- **Comprimentos**: Baseados em percentagem da altura corporal
  - Coxa: 24.5% da altura
  - Perna: 24.6% da altura
  - Largura da pélvis: 14.6% da altura
- **Massa**: Baseada em percentagem da massa corporal total
  - Coxa: 10.0%
  - Perna: 4.65%
  - Pélvis: 14.2%
- **Posição do CoM**: Percentagem do comprimento do segmento
  - Coxa: 40.9% a partir da articulação proximal
  - Perna: 44.5% a partir da articulação proximal

### 4.2 Cálculo do Centro de Massa

**Método**:
- Calcula posição do CoM de cada segmento usando orientações dos sensores
- Combina todos os segmentos usando média ponderada pela massa
- Retorna posição 3D do CoM total ao longo do tempo

**Dados Obtidos**:
- **Série temporal de posição CoM**: Coordenadas (X, Y, Z) ao longo do tempo
- **Amplitude vertical**: Variação máxima na direção vertical (Y) em centímetros
- **Amplitude mediolateral**: Variação máxima na direção esquerda-direita (X) em centímetros
- **Amplitude anteroposterior**: Variação máxima na direção frente-trás (Z) em centímetros
- **RMS (Root Mean Square)**: Deslocamento RMS total em centímetros

---

## 5. Métricas Temporais e de Atividade

### 5.1 Janela de Atividade

**Detecção Automática**:
- Usa RMS (Root Mean Square) móvel da velocidade angular
- Identifica início e fim do movimento ativo
- Remove períodos de repouso/inatividade

**Dados Obtidos**:
- **tOn**: Índice de início da atividade
- **tOff**: Índice de fim da atividade
- **Duração total**: Tempo total de atividade em segundos

### 5.2 Sincronização Temporal

**Alinhamento de Sensores**:
- Usa `SampleTimeFine` para sincronização precisa
- Interpolação temporal quando necessário
- Garante que todos os sensores estejam alinhados no tempo

**Aplicações**:
- Cálculo preciso de ângulos articulares
- Análise de coordenação entre segmentos
- Detecção de assimetrias temporais

---

## 6. Métricas de Qualidade dos Dados

### 6.1 Status do Sensor

**Flags de Status**:
- **Clipping de Acelerômetro**: Detecta saturação nos eixos X, Y, Z
- **Clipping de Giroscópio**: Detecta saturação nos eixos X, Y, Z
- **Clipping de Magnetômetro**: Detecta saturação nos eixos X, Y, Z (se disponível)

**Uso**:
- Identificar períodos com dados de baixa qualidade
- Filtrar ou marcar dados problemáticos
- Alertar sobre problemas de calibração

### 6.2 Validação de Dados

**Verificações Automáticas**:
- Comprimento mínimo de dados
- Presença de todos os sensores necessários
- Consistência temporal entre sensores
- Valores fisiológicos plausíveis

---

## 7. Resumo de Todas as Métricas Disponíveis

### 7.1 Métricas por Articulação (Joelho)

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| ROM | Amplitude total de movimento | Graus (°) |
| Flexão Máxima | Valor máximo de flexão | Graus (°) |
| Extensão Máxima | Valor mínimo de extensão | Graus (°) |
| Velocidade Média | Velocidade angular média | °/s |
| Velocidade de Pico | Velocidade angular máxima | °/s |
| Percentil 95 | 95º percentil de velocidade | °/s |
| Repetições | Número de movimentos completos | Contagem |
| Cadência | Repetições por minuto | Reps/min |

### 7.2 Métricas de Assimetria

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| Diferença de ROM | Diferença absoluta entre lados | Graus (°) |
| Diferença de Repetições | Diferença absoluta entre lados | Contagem |
| Lado Dominante | Identificação do lado mais ativo | Categórico |

### 7.3 Métricas de Centro de Massa

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| Amplitude Vertical | Variação máxima vertical | Centímetros (cm) |
| Amplitude Mediolateral | Variação máxima esquerda-direita | Centímetros (cm) |
| Amplitude Anteroposterior | Variação máxima frente-trás | Centímetros (cm) |
| RMS | Deslocamento RMS total | Centímetros (cm) |

### 7.4 Métricas Temporais

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| Duração Total | Tempo total de captura | Segundos (s) |
| Duração Ativa | Tempo de movimento ativo | Segundos (s) |
| Taxa de Amostragem | Frequência de captura | Hz |

---

## 8. Limitações e Considerações

### 8.1 Limitações Conhecidas

1. **Análise de Quadril**:
   - Precisão limitada devido à complexidade da articulação (3 DOF)
   - Drift de orientação pode afetar resultados
   - Consulte `MOVELLA_DOT_HIP_LIMITATIONS.md` para detalhes

2. **Calibração**:
   - Requer calibração inicial precisa
   - Alinhamento correto dos sensores é crítico
   - Baseline deve ser estabelecido corretamente

3. **Ambiente**:
   - Campos magnéticos podem afetar precisão
   - Movimentos muito rápidos podem causar clipping
   - Superfícies metálicas podem interferir

### 8.2 Quando Usar Cada Métrica

**Métricas Confiáveis**:
- ✅ Análise de joelho (articulação tipo dobradiça)
- ✅ ROM e amplitude de movimento
- ✅ Contagem de repetições
- ✅ Detecção de assimetrias grosseiras

**Métricas com Limitações**:
- ⚠️ Análise detalhada de quadril (usar com cautela)
- ⚠️ Valores absolutos de ângulo (preferir valores relativos)
- ⚠️ Velocidades muito altas (podem ter ruído)

---

## 9. Formato de Saída

### 9.1 Estrutura de Dados

Os resultados da análise são estruturados em formato JSON com:

```json
{
  "joint_angles": {
    "calculated": true,
    "angles": [
      {
        "sensor1": "thigh",
        "sensor2": "shank",
        "angles": [/* série temporal */]
      }
    ]
  },
  "movement_metrics": {
    "repetitions": 10,
    "range_of_motion": {
      "max_rom": 120.5,
      "min_rom": 0.0,
      "average_rom": 60.2
    },
    "angular_velocity": {
      "max_velocity": 450.3,
      "min_velocity": 0.0,
      "average_velocity": 125.7
    },
    "dominant_side": "right",
    "cadence": {
      "reps_per_minute": 30,
      "time_per_rep": 2.0,
      "sets": 1
    }
  },
  "center_of_mass": {
    "vertical_amp_cm": 5.2,
    "ml_amp_cm": 3.1,
    "ap_amp_cm": 2.8,
    "rms_cm": 4.5
  }
}
```

---

## 10. Aplicações Clínicas

### 10.1 Casos de Uso

**Avaliação de Movimento**:
- Quantificação objetiva de amplitude de movimento
- Monitoramento de progresso em reabilitação
- Detecção de assimetrias entre lados

**Análise de Exercícios**:
- Contagem automática de repetições
- Avaliação de qualidade de movimento
- Feedback em tempo real

**Pesquisa**:
- Coleta de dados biomecânicos
- Análise de padrões de movimento
- Validação de protocolos de exercício

### 10.2 Interpretação Clínica

**ROM Normal (Joelho)**:
- Flexão: ~0° a 140°
- Extensão: ~0° a 5° de hiperextensão

**Velocidades Típicas**:
- Movimentos lentos: 50-200°/s
- Movimentos moderados: 200-400°/s
- Movimentos rápidos: 400-600°/s

**Assimetria Significativa**:
- Diferença de ROM > 10° entre lados
- Diferença de repetições > 1 entre lados

---

## 11. Referências Técnicas

### 11.1 Algoritmos Utilizados

- **Conversão Euler → Quaternion**: ZYX intrinsic rotation
- **Cálculo de Ângulos Articulares**: Produto escalar entre eixos ósseos
- **Derivada Temporal**: Diferenças finitas centrais
- **Detecção de Picos**: Algoritmo de peak detection com threshold dinâmico
- **Modelo Segmentar**: Baseado em De Leva (1996)

### 11.2 Bibliotecas e Ferramentas

- **Three.js**: Manipulação de quaternions e rotações
- **TypeScript**: Tipagem forte para cálculos precisos
- **Movella DOT SDK**: Comunicação com sensores via BLE

---

## 12. Conclusão

O sistema de análise Movella DOT permite extrair uma **grande variedade de dados biomecânicos** a partir dos sensores IMU:

✅ **Dados Brutos**: Orientação, aceleração, timestamps  
✅ **Dados Processados**: Ângulos articulares, velocidades, acelerações  
✅ **Métricas Clínicas**: ROM, repetições, assimetrias, CoM  
✅ **Análise Temporal**: Duração, cadência, janelas de atividade  

**Principais Forças**:
- Análise precisa de joelho (articulação tipo dobradiça)
- Métricas objetivas e quantificáveis
- Análise de assimetrias entre lados
- Cálculo de centro de massa

**Limitações**:
- Análise de quadril tem precisão limitada
- Requer calibração e alinhamento corretos
- Sensível a condições ambientais

---

**Data**: Dezembro 2024  
**Versão**: 1.0  
**Projeto**: IRHIS - Sistema de Análise de Movimento

