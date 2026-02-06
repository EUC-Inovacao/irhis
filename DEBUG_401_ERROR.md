# Guia de Diagnóstico - Erro 401 Unauthorized

## O que foi implementado

1. **Interceptor de requisição**: Adiciona automaticamente o token do AsyncStorage em todas as requisições
2. **Interceptor de resposta**: Logs detalhados para debug de erros 401

## Onde verificar o problema

### 1. Logs do Console (Frontend)

Agora você verá logs detalhados no console quando houver erro 401:
- Se o token está sendo enviado
- Qual é a resposta exata do servidor
- Headers da requisição

**Como verificar:**
- Abra o console do React Native/Expo
- Procure por mensagens que começam com `[API]`
- Especialmente mensagens de erro 401

### 2. Azure App Service - Logs

**Onde acessar:**
1. Portal do Azure (https://portal.azure.com)
2. Navegue para: Resource Groups → `cloud-shell-storage-westeurope` → `irhis-api`
3. No menu lateral, vá em **Log stream** ou **Logs**

**O que procurar:**
- Erros de autenticação
- Mensagens sobre tokens inválidos
- Erros de CORS (se houver)

### 3. Azure App Service - CORS Configuration

**Onde verificar:**
1. Portal do Azure → `irhis-api` → **CORS** (no menu lateral)
2. Verifique se está configurado para aceitar requisições do seu frontend

**Possíveis problemas:**
- CORS não configurado para aceitar requisições do app mobile
- Origens permitidas não incluem o domínio do app

### 4. Azure App Service - Authentication/Authorization

**Onde verificar:**
1. Portal do Azure → `irhis-api` → **Authentication** (no menu lateral)
2. Verifique se há alguma configuração de autenticação que possa estar bloqueando requisições

**Possíveis problemas:**
- Azure AD Authentication habilitado e bloqueando requisições
- Configuração de autenticação conflitando com JWT customizado

### 5. Verificar Token no App

**Como verificar se o token está sendo salvo:**
1. No código, adicione um console.log temporário após o login
2. Ou use o React Native Debugger para inspecionar o AsyncStorage

**Onde verificar no código:**
- `frontend/app/context/AuthContext.tsx` - função `login()`
- Verifique se o token está sendo salvo corretamente

### 6. Verificar SECRET_KEY do Backend

**Problema possível:**
- O `SECRET_KEY` usado para gerar o token no login pode ser diferente do usado para validar
- No Azure, verifique se há uma variável de ambiente `SECRET_KEY` configurada

**Onde verificar:**
1. Portal do Azure → `irhis-api` → **Configuration** → **Application settings**
2. Procure por `SECRET_KEY` ou `FLASK_SECRET_KEY`
3. Deve ser o mesmo valor usado em `backend/app.py` (linha 33)

### 7. Verificar se o Token Expirou

**Como verificar:**
- Tokens JWT têm expiração (no código atual: 1 dia)
- Se você fez login há mais de 1 dia, o token pode ter expirado
- Solução: Fazer login novamente

### 8. Testar a API Diretamente

**Usando Postman ou curl:**

```bash
# 1. Primeiro, fazer login para obter o token
curl -X POST https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email", "password": "sua-senha", "role": "doctor"}'

# 2. Usar o token retornado para fazer uma requisição autenticada
curl -X GET https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net/doctors/me/patients \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Próximos Passos

1. **Execute o app novamente** e verifique os logs no console
2. **Verifique os logs do Azure** para ver o que o backend está recebendo
3. **Teste a API diretamente** com Postman/curl para isolar se o problema é no frontend ou backend
4. **Verifique as configurações do Azure** mencionadas acima

## Informações Úteis para Debug

- **URL da API**: `https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net`
- **Chave de armazenamento do token**: `@IRHIS:token`
- **Formato do token**: JWT com algoritmo HS256
- **Expiração do token**: 1 dia (24 horas)

## Se o problema persistir

Compartilhe:
1. Logs do console do app (especialmente os que começam com `[API]`)
2. Logs do Azure App Service
3. Resultado do teste direto da API com Postman/curl
4. Configurações de CORS e Authentication do Azure
