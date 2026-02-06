# Solução para Erro 401 "Invalid token"

## Problema Identificado

O erro 401 "Invalid token" está ocorrendo porque:

1. **O token foi gerado com um `SECRET_KEY`** (provavelmente `'your-secret-key'` do código local)
2. **O Azure está usando um `SECRET_KEY` diferente** para validar o token
3. Quando o JWT é validado, a assinatura não confere, resultando em "Invalid token"

## Solução Definitiva - Configurar SECRET_KEY no Azure

### Passo 1: Acessar Azure Portal

1. Acesse: https://portal.azure.com
2. Navegue para: **Resource Groups** → `cloud-shell-storage-westeurope` → `irhis-api`

### Passo 2: Configurar Application Setting

1. No menu lateral, clique em **Configuration**
2. Vá para a aba **Application settings**
3. Clique em **+ New application setting**
4. Configure:
   - **Name**: `SECRET_KEY`
   - **Value**: Uma chave secreta forte e única (consulte `backend/env.example` para referência)
5. Clique em **OK**
6. Clique em **Save** no topo da página
7. **IMPORTANTE**: Reinicie o App Service após salvar

### Passo 3: Reiniciar o App Service

1. No menu lateral, vá em **Overview**
2. Clique em **Restart** (ou **Stop** e depois **Start**)
3. Aguarde alguns minutos para o serviço reiniciar

### Passo 4: Configuração Local (Desenvolvimento)

Para desenvolvimento local, crie um arquivo `.env` na pasta `backend/` baseado no arquivo `backend/env.example`:

```bash
cd backend
cp env.example .env
# Edite o .env com suas credenciais locais
```

**IMPORTANTE**: O arquivo `.env` está no `.gitignore` e não será commitado. Nunca commite credenciais reais!

**Nota**: O código do backend já foi atualizado para usar variáveis de ambiente (já implementado).

### Passo 5: Fazer Login Novamente

Após configurar o `SECRET_KEY` no Azure:

1. No app mobile, faça **logout**
2. Faça **login novamente** para gerar um novo token com a chave correta
3. O dashboard deve carregar normalmente

## Solução Temporária Implementada

Já implementei uma solução temporária no frontend que:

- **Detecta automaticamente** quando o token é inválido
- **Limpa o token** do AsyncStorage
- **Força o usuário a fazer login novamente**

Isso evita loops infinitos de requisições com token inválido.

## Verificação

Para verificar se está funcionando:

1. Configure o `SECRET_KEY` no Azure (Passo 2)
2. Reinicie o App Service (Passo 3)
3. Faça login novamente no app
4. Verifique os logs do console - não deve mais aparecer "Invalid token"
5. O dashboard deve carregar normalmente

## Notas Importantes

- **Segurança**: Em produção, use uma chave secreta forte e única
- **Consistência**: O `SECRET_KEY` deve ser o mesmo usado para gerar E validar tokens
- **Variáveis de Ambiente**: Sempre use variáveis de ambiente para secrets em produção
- **Endpoints 404**: Alguns endpoints como `/doctors/me/dashboard` e `/doctors/me/latest-feedback` retornam 404 porque não estão implementados no backend. Isso é normal e não afeta o funcionamento principal.
