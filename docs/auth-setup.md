# Configurar Login com Google

## Visão geral

O app agora suporta múltiplos usuários com login via Google. Cada usuário vê apenas seus próprios dados. O fluxo usa **Supabase Auth** como intermediário — o Supabase gerencia o OAuth com o Google e emite um JWT que o servidor Node.js valida.

---

## Passo 1 — Supabase: ativar Google como provider

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Authentication → Providers → Google**
3. Ative o provider e deixe a tela aberta (você vai precisar do **Callback URL** que aparece lá)

---

## Passo 2 — Google Cloud Console: criar credenciais OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Tipo: **Web application**
5. Em **Authorized redirect URIs**, adicione o **Callback URL** copiado do Supabase no passo anterior
   - Formato: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
6. Salve e copie o **Client ID** e o **Client Secret**

---

## Passo 3 — Supabase: colar as credenciais do Google

1. Volte ao Supabase Dashboard → **Authentication → Providers → Google**
2. Cole o **Client ID** e **Client Secret** do passo anterior
3. Em **Authentication → URL Configuration**, configure:
   - **Site URL**: URL do seu app no Render (ex: `https://meu-app.onrender.com`)
   - **Redirect URLs**: adicione também `https://meu-app.onrender.com`
4. Salve

---

## Passo 4 — Obter as chaves do Supabase

No Supabase Dashboard → **Settings → API**:

- **anon (public)** → `SUPABASE_ANON_KEY` no `.env`
- **service_role** → `SUPABASE_KEY` no `.env`

> ⚠️ A `service_role` key nunca deve aparecer no frontend. Ela fica apenas no servidor.

---

## Passo 5 — Rodar o migration SQL

No Supabase Dashboard → **SQL Editor**, rode o conteúdo da seção "Multi-usuário" do `schema.sql` (ao final do arquivo). Isso adiciona a coluna `user_id` em todas as tabelas.

---

## Passo 6 — Configurar variáveis no Render

No painel do Render → **Environment**, adicione:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=<service_role key>
SUPABASE_ANON_KEY=<anon key>
```

Faça o deploy (push para `main` no GitHub).

---

## Migração dos dados existentes

Na **primeira vez** que você fizer login com Google, o app detecta automaticamente que não há dados com seu `user_id` e chama `/api/claim-data` para migrar todos os dados existentes (sem `user_id`) para a sua conta. Isso acontece em segundo plano — você verá seus dados normalmente após o login.

---

## Acesso local (desenvolvimento)

Sem as variáveis `SUPABASE_URL`/`SUPABASE_KEY` no `.env`, o servidor roda em modo de memória sem autenticação — comportamento igual ao anterior.
