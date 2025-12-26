# 🔐 API Credentials Setup

## Quando receber as credenciais da API externa:

### 1. **Atualizar o Token no Código**

No arquivo `frontend/app/services/movementApiService.ts`, linha 6:

```typescript
// Substituir esta linha:
const API_TOKEN = null; // Will be set when credentials are received

// Por:
const API_TOKEN = "SEU_TOKEN_AQUI"; // Token fornecido pelo developer
```

### 2. **Testar a Integração**

Após configurar o token, teste:

1. **Health Check**: A API deve retornar status "ok"
2. **Upload de arquivo**: Deve funcionar sem erro 401
3. **Análise**: Deve retornar dados completos de movimento

### 3. **Verificar Logs**

No console do app, você deve ver:

- ✅ "API token set for authentication"
- ✅ "API health check successful"
- ✅ Dados de análise completos

### 4. **URL da API Externa**

```
https://eucp-movement-analysis-api-dev-h9ayfwarcxeag6e0.westeurope-01.azurewebsites.net
```

### 5. **Endpoints Disponíveis**

- `GET /health` - Verificação de saúde
- `POST /analyze` - Upload e análise de arquivos
- `GET /integration_test` - Teste de integração

### 6. **Formato do Token**

O token deve ser usado no header:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## 🚀 **Status Atual**

- ✅ Integração direta implementada
- ✅ Tratamento de erros robusto
- ✅ Fallback para análise local
- ⏳ Aguardando credenciais de autenticação

**Próximo passo**: Configurar o token quando receber as credenciais!

