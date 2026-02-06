# Configurar Database no Azure

## Problema

O erro "Database not configured" ocorre porque as variáveis de ambiente do banco de dados não estão configuradas no Azure App Service.

## Solução - Configurar Variáveis do Banco de Dados no Azure

O backend agora suporta **duas formas** de configuração:

### Opção 1: Variáveis Separadas (Recomendado)

Configure as variáveis individuais do banco de dados.

### Opção 2: String de Conexão Completa

Configure apenas `DATABASE_URL` com a string completa.

---

## Configuração com Variáveis Separadas (Opção 1)

### Passo 1: Acessar Azure Portal

1. Acesse: https://portal.azure.com
2. Navegue para: **Resource Groups** → `cloud-shell-storage-westeurope` → `irhis-api`

### Passo 2: Configurar Application Settings

1. No menu lateral, clique em **Configuration**
2. Vá para a aba **Application settings**
3. Adicione as seguintes variáveis (clique em **+ New application setting** para cada uma):

   **Variável 1:**
   - **Name**: `DB_HOST`
   - **Value**: Seu host do banco de dados (ex: `seu-banco.mysql.database.azure.com`)

   **Variável 2:**
   - **Name**: `DB_PORT`
   - **Value**: `3306` (ou a porta do seu banco)

   **Variável 3:**
   - **Name**: `DB_NAME`
   - **Value**: Nome do seu banco de dados

   **Variável 4:**
   - **Name**: `DB_USER`
   - **Value**: Usuário do banco de dados

   **Variável 5:**
   - **Name**: `DB_PASSWORD`
   - **Value**: Senha do banco de dados

   **Nota**: Consulte o arquivo `backend/env.example` para ver o formato esperado.

4. Clique em **Save** no topo da página
5. **IMPORTANTE**: Reinicie o App Service após salvar

### Passo 3: Reiniciar o App Service

1. No menu lateral, vá em **Overview**
2. Clique em **Restart** (ou **Stop** e depois **Start**)
3. Aguarde alguns minutos para o serviço reiniciar

---

## Configuração com String Completa (Opção 2 - Alternativa)

Se preferir usar uma única variável `DATABASE_URL`:

1. No Azure Portal, adicione:
   - **Name**: `DATABASE_URL`
   - **Value**: `mysql+pymysql://usuario:senha@host:porta/nome_banco`

   **Nota**: 
   - A senha precisa ser URL-encoded. Caracteres especiais: `@` vira `%40`, `!` vira `%21`, etc.
   - Consulte o arquivo `backend/env.example` para ver exemplos

## Verificação

Para verificar se está funcionando:

1. Configure as variáveis do banco no Azure (Passo 2)
2. Reinicie o App Service (Passo 3)
3. Tente fazer login novamente no app
4. O erro "Database not configured" não deve mais aparecer

## Configuração Local (Desenvolvimento)

Para desenvolvimento local, crie um arquivo `.env` na pasta `backend/` baseado no arquivo `backend/env.example`:

```bash
cd backend
cp env.example .env
# Edite o .env com suas credenciais locais
```

**IMPORTANTE**: O arquivo `.env` está no `.gitignore` e não será commitado. Nunca commite credenciais reais!

## Notas Importantes

- **Segurança**: As credenciais são sensíveis. Mantenha-as seguras.
- **Encoding**: Caracteres especiais na senha (como `@` e `!`) são automaticamente codificados pelo backend
- **Prioridade**: Se `DATABASE_URL` estiver configurada, ela será usada. Caso contrário, o backend constrói a string a partir das variáveis `DB_*`
- **SSL**: O backend configura SSL automaticamente para conexões Azure MySQL

## Troubleshooting

Se ainda receber "Database not configured":

1. Verifique se a variável `DATABASE_URL` está salva corretamente no Azure
2. Verifique se o App Service foi reiniciado após salvar
3. Verifique os logs do Azure para ver erros de conexão com o banco
4. Teste a string de conexão localmente para garantir que está correta
