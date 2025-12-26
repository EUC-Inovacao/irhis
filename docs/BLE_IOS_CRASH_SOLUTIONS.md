# Bluetooth iOS Crash - Soluções e Alternativas

## Problema Atual
O app crasha ao chamar `scan()` no iOS quando aguarda a promise retornada pelo `react-native-ble-manager`.

## Solução Implementada (Testar Primeiro)
✅ **Não aguardar a promise no iOS** - Apenas chamar `scan()` e confiar nos eventos `BleManagerDiscoverPeripheral` para receber resultados.

## Se Ainda Crashar - Alternativas

### Opção 1: react-native-ble-plx (Recomendado)
Mais estável no iOS, melhor documentação, e mantido ativamente.

**Instalação:**
```bash
cd frontend
npm install react-native-ble-plx
npx expo prebuild --clean
```

**Migração:**
- Substituir `react-native-ble-manager` por `react-native-ble-plx`
- API diferente mas mais robusta
- Melhor suporte para iOS

### Opção 2: expo-bluetooth (Se disponível)
Se você está usando Expo, pode haver um módulo oficial.

### Opção 3: Verificar Versão do react-native-ble-manager
```bash
npm list react-native-ble-manager
```
- Versão atual: ^12.4.0
- Tentar versão mais recente ou versão específica conhecida por funcionar

### Opção 4: Verificar Logs Nativos do Xcode
1. Abrir projeto no Xcode: `cd frontend/ios && open demoirhisn.xcworkspace`
2. Rodar app pelo Xcode
3. Verificar logs nativos quando crashar
4. Procurar por erros do CoreBluetooth ou CBCentralManager

## Checklist de Permissões (Já Configurado)
- ✅ NSBluetoothAlwaysUsageDescription
- ✅ NSBluetoothPeripheralUsageDescription  
- ✅ UIBackgroundModes com bluetooth-central
- ✅ Plugin configurado no app.json

## Próximos Passos
1. **Testar a solução atual** (não aguardar promise no iOS)
2. Se ainda crashar, considerar migrar para `react-native-ble-plx`
3. Verificar logs nativos do Xcode para identificar causa exata

