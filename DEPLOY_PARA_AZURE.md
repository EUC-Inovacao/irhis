# Deploy das Mudanças para Azure

## Situação Atual

- ✅ Código corrigido localmente (branch `final-implementations`)
- ❌ Azure ainda tem código antigo com bugs
- ✅ GitHub Actions configurado para deploy automático

## Processo de Deploy

### Opção 1: Merge para Main (Recomendado)

```bash
# 1. Fazer commit das mudanças
git add .
git commit -m "Fix: Update signup endpoint to use database, add CreateAccountScreen, configure Azure API"

# 2. Fazer push do branch atual
git push origin final-implementations

# 3. Criar Pull Request no GitHub e fazer merge para main
# OU fazer merge local:
git checkout main
git merge final-implementations
git push origin main
```

### Opção 2: Push Direto para Main

```bash
# 1. Fazer commit das mudanças
git add .
git commit -m "Fix: Update signup endpoint to use database, add CreateAccountScreen, configure Azure API"

# 2. Fazer merge local para main
git checkout main
git merge final-implementations

# 3. Push para main (vai triggerar deploy automático)
git push origin main
```

## O que acontece depois

1. **GitHub Actions detecta o push** para `main`
2. **Faz build** do backend
3. **Faz deploy automático** para Azure App Service
4. **Aguarde 2-5 minutos** para o deploy completar

## Verificar Deploy

1. Acesse: https://github.com/[seu-repo]/actions
2. Veja o workflow "Build and deploy Python app to Azure Web App - irhis-api"
3. Aguarde até ver "✅ Deploy to Azure Web App" com sucesso

## IMPORTANTE: Configurar Variáveis no Azure

**ANTES** de testar, configure as variáveis de ambiente no Azure:

1. Azure Portal → `irhis-api` → **Configuration** → **Application settings**
2. Adicione:
   - `DB_HOST` = `irhis.mysql.database.azure.com`
   - `DB_PORT` = `3306`
   - `DB_NAME` = `irhis_db`
   - `DB_USER` = `irhisadmin`
   - `DB_PASSWORD` = `Euc@2026!MySql`
   - `SECRET_KEY` = `your-secret-key`
3. **Salve e reinicie** o App Service

## Testar após Deploy

1. Aguarde o deploy completar (2-5 minutos)
2. Tente criar uma conta no app
3. Deve funcionar! ✅

## Troubleshooting

Se ainda der erro após deploy:

1. **Verifique os logs do Azure**: Portal → `irhis-api` → **Log stream**
2. **Verifique se as variáveis estão configuradas**: Configuration → Application settings
3. **Verifique se o App Service foi reiniciado** após configurar variáveis
4. **Verifique o workflow do GitHub**: Actions → veja se houve erros no build
