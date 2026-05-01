# Deploy Checklist

## Pre-Deploy

- [ ] Commit all changes: `git add . && git commit -m "deploy: configure Vercel/Render/Neon"`
- [ ] Push to main: `git push origin main`

## Step 1: Neon Database

- [ ] Create account + project at neon.tech
- [ ] Copy connection string: `postgresql://...`
- [ ] Save pra próximo passo

## Step 2: Render Backend

- [ ] Create account at render.com
- [ ] New Web Service → Connect GitHub repo
- [ ] Settings:
  - [ ] Root Directory: (deixa empty — usa raiz)
  - [ ] Build Command: (vazio)
  - [ ] Start Command: (vazio)
- [ ] Environment Variables:
  - [ ] `DATABASE_URL` = cole string Neon
  - [ ] `SECRET_KEY` = gera string aleatória
  - [ ] `GOOGLE_MAPS_API_KEY` = sua key (ou deixa vazio)
  - [ ] `CORS_ORIGINS` = `https://seu-frontend.vercel.app` (próximo passo)
  - [ ] `COOKIE_SECURE` = `true`
  - [ ] `WEB_WORKERS` = `4`
- [ ] Deploy → aguarda build + logs
- [ ] Testa health: `curl https://seu-service.onrender.com/health`
- [ ] Copia URL do serviço: `https://seu-service.onrender.com`

## Step 3: Vercel Frontend

- [ ] Create account at vercel.com
- [ ] Import project → seleciona GitHub repo
- [ ] Settings:
  - [ ] Root Directory: `frontend/`
  - [ ] Framework: Vite (auto-detecta)
  - [ ] Build: `npm run build`
  - [ ] Output: `dist`
- [ ] Environment Variables:
  - [ ] `VITE_API_URL` = cola URL Render do passo 2
- [ ] Deploy → aguarda build
- [ ] Copia URL do projeto: `https://seu-projeto.vercel.app`

## Step 4: Update Backend CORS

- [ ] Volta em Render
- [ ] Update `CORS_ORIGINS` = `https://seu-projeto.vercel.app` (de Vercel)
- [ ] Redeploy (auto-redeploy ou manual)

## Step 5: Test

- [ ] Abre `https://seu-projeto.vercel.app` no browser
- [ ] Tenta login/register
- [ ] Verifica console/Network tab pra CORS errors
- [ ] Se 403 CORS error: check CORS_ORIGINS no Render
- [ ] Tenta otimizar rota (pra testar /api/routes/optimize)

## Troubleshooting

Se algo falhar:

1. **Database error**: 
   - Copia string Neon direto, sem editar
   - Testa localmente com mesma string

2. **CORS 403**:
   - Render: update `CORS_ORIGINS` exatamente como URL Vercel
   - Wait 30s pra redeploy

3. **Backend timeout**:
   - Verifica Render logs pra DB connection issues
   - Tenta simples query: `curl https://backend.onrender.com/health`

4. **Frontend 404**:
   - Verifica SPA routing — deve voltar index.html
   - Neste caso, check vercel.json routes

5. **Build fail**:
   - Render: copia URL corretamente do GitHub
   - Vercel: check npm install + build na máquina local

## Post-Deploy

- [ ] Setup monitoring (Render dashboard)
- [ ] Bookmark URLs
- [ ] Documenta senhas/keys (use password manager)
- [ ] Próximo: considerar S3 pra uploads persistentes
