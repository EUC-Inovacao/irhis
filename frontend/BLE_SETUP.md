# Guia Rápido - Configurar BLE no iPhone Físico

## Problema: "Device is busy"

O erro indica que o iPhone precisa ser preparado. Siga estes passos:

### Passo 1: Preparar o iPhone

1. **Desbloqueie o iPhone**
2. **Conecte via USB ao Mac**
3. **No iPhone, aparecerá um popup "Confiar neste computador?"** → Toque em "Confiar"
4. **Digite o código do iPhone** se solicitado
5. **Deixe o iPhone desbloqueado** durante o build

### Passo 2: Verificar conexão

```bash
# Verificar se o iPhone está reconhecido
xcrun devicectl list devices
```

Deve mostrar o iPhone como "connected".

### Passo 3: Tentar build novamente

```bash
cd frontend

# Limpar cache e tentar novamente
rm -rf ios/build
npx expo run:ios --device
```

### Se ainda der erro:

**Opção A: Abrir no Xcode (mais confiável)**

```bash
cd frontend/ios
open demoirhisn.xcworkspace
```

No Xcode:
1. Selecione o dispositivo "iPhone do João" no topo
2. Clique em "Run" (▶️) ou pressione Cmd+R
3. O Xcode vai instalar e rodar no iPhone

**Opção B: Usar EAS Build (cloud - mais lento mas mais confiável)**

```bash
cd frontend
npm run build:dev:ios
```

Isso cria um build na nuvem que você pode instalar via TestFlight ou link direto.

## Após o build funcionar:

1. O app será instalado no iPhone
2. Abra o app no iPhone
3. No terminal, rode:
   ```bash
   npm run start:dev-client
   ```
4. Escaneie o QR code que aparecer
5. O BLE deve funcionar! ✅

## Troubleshooting

- **"Device is busy"**: Desbloqueie o iPhone e confie no computador
- **"No developer disk image"**: Abra o Xcode uma vez para instalar componentes
- **"Code signing error"**: Verifique se tem Apple Developer account configurado

