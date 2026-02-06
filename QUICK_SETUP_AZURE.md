# Quick Setup - Azure Configuration

## ⚠️ O que está faltando

O erro "Database not configured" significa que as variáveis de ambiente do banco de dados **não estão configuradas no Azure**.

## ✅ Solução Rápida (5 minutos)

### Passo 1: Acessar Azure Portal

1. Vá para: https://portal.azure.com
2. Navegue: **Resource Groups** → `cloud-shell-storage-westeurope` → `irhis-api`

### Passo 2: Configurar Application Settings

1. Menu lateral → **Configuration**
2. Aba **Application settings**
3. Clique em **+ New application setting** e adicione **TODAS** estas variáveis:

#### Variáveis do Banco de Dados (OBRIGATÓRIAS):

```
Name: DB_HOST
Value: irhis.mysql.database.azure.com
```

```
Name: DB_PORT
Value: 3306
```

```
Name: DB_NAME
Value: irhis_db
```

```
Name: DB_USER
Value: irhisadmin
```

```
Name: DB_PASSWORD
Value: Euc@2026!MySql
```

#### Variável de Autenticação (OBRIGATÓRIA):

```
Name: SECRET_KEY
Value: your-secret-key
```

**Nota**: Use uma chave secreta forte. Pode ser qualquer string, mas deve ser a mesma usada para gerar e validar tokens JWT.

### Passo 3: Salvar e Reiniciar

1. Clique em **Save** (canto superior direito)
2. Aguarde a confirmação "Settings saved successfully"
3. Vá para **Overview** (menu lateral)
4. Clique em **Restart**
5. Aguarde 2-3 minutos para o serviço reiniciar

### Passo 4: Testar

1. Tente fazer login novamente no app
2. O erro "Database not configured" deve desaparecer

## 🔍 Verificação

Se ainda não funcionar, verifique:

1. **Todas as 6 variáveis estão configuradas?**
   - DB_HOST ✅
   - DB_PORT ✅
   - DB_NAME ✅
   - DB_USER ✅
   - DB_PASSWORD ✅
   - SECRET_KEY ✅

2. **O App Service foi reiniciado após salvar?**
   - Verifique em **Overview** → **Status** deve estar "Running"

3. **Os valores estão corretos?**
   - Sem espaços extras no início/fim
   - Senha com caracteres especiais corretos

## 📝 Checklist

- [ ] DB_HOST configurado
- [ ] DB_PORT configurado
- [ ] DB_NAME configurado
- [ ] DB_USER configurado
- [ ] DB_PASSWORD configurado
- [ ] SECRET_KEY configurado
- [ ] Settings salvos
- [ ] App Service reiniciado
- [ ] Testado login novamente

## 🆘 Ainda com problemas?

Verifique os logs do Azure:
1. Azure Portal → `irhis-api` → **Log stream**
2. Procure por erros relacionados a conexão com banco de dados
