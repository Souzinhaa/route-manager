# Deployment Guide: Vercel + Render + Neon

Arquitetura: Frontend (Vercel) + Backend (Render) + Database (Neon)

## 1. Database Setup (Neon)

1. Acessa [neon.tech](https://neon.tech)
2. Cria novo projeto PostgreSQL
3. Copia connection string:
   ```
   postgresql+psycopg2://user:password@host.neon.tech/dbname
   ```

## 2. Backend Deployment (Render)

### Conectar repo GitHub
1. Acessa [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. Seleciona branch (main)

### Configurar build & deploy
- **Build Command**: (deixa vazio — usa Dockerfile)
- **Start Command**: (deixa vazio — usa Dockerfile CMD)

### Environment Variables (copiar do .env.example)
```
DATABASE_URL = postgresql+psycopg2://...   (de Neon)
SECRET_KEY = gera string aleatória 32+ chars
GOOGLE_MAPS_API_KEY = sua chave
CORS_ORIGINS = https://seu-frontend.vercel.app
COOKIE_SECURE = true
PORT = 8000
WEB_WORKERS = 4
```

### Deploy
- Render faz auto-deploy quando faz push pra main
- URL gerada: `https://seu-backend.onrender.com`

## 3. Frontend Deployment (Vercel)

### Conectar repo GitHub
1. Acessa [vercel.com](https://vercel.com)
2. Add New Project → Import seu repo
3. Seleciona "Root Directory: `frontend/`"

### Build settings (auto-detecta Vite)
- Build Command: `npm run build`
- Output Directory: `dist`
- Não precisa mexer — Vercel detona sozinho

### Environment Variables
```
VITE_API_URL = https://seu-backend.onrender.com
```
(Substitui `seu-backend` com o nome real do serviço Render)

### Deploy
- Auto-deploy quando faz push pra main
- URL: `https://seu-projeto.vercel.app`

## 4. Connect Frontend to Backend

Frontend faz fetch pra `VITE_API_URL/api/*`. Antes de deploy, update:

1. Backend em Render:
   ```
   CORS_ORIGINS = https://seu-projeto.vercel.app
   ```

2. Frontend em Vercel:
   ```
   VITE_API_URL = https://seu-backend.onrender.com
   ```

## 5. Testing

### Health check
```bash
curl https://seu-backend.onrender.com/health
```

### DB connection
Backend logs mostram se conectou OK em Neon:
```
[startup] database tables ready.
```

### CORS
Frontend consegue fazer requests pro backend

## ⚠️ Known Limitations

### Uploads no Render
- **Problema**: `/app/uploads` é ephemeral — persiste dentro da instância mas not across redeploys
- **Solução curto-prazo**: Uploads funcionam até próximo redeploy/restart
- **Solução longo-prazo**: Usar S3/Cloudinary ou armazenar no banco (PostgreSQL BYTEA)

### Connection pool Neon
- Pool reduzido pra `pool_size=3, max_overflow=2`
- Neon free tier limita ~20 conexões simultâneas
- Render pode ficar num dynotype compartilhado — recursos limitados
- Monitorar em logs se vê `pool exhausted` errors

### DATABASE_URL format
- Neon dá `postgresql://...` — código auto-converte pra `postgresql+psycopg2://`
- Se não converter, copia string direto de Neon e usa em DATABASE_URL

## Troubleshooting

| Problema | Causa | Fix |
|----------|-------|-----|
| Frontend 403/CORS error | CORS_ORIGINS errado | Update no Render env var |
| Backend 500 | DATABASE_URL inválido | Check string Neon ou tenta copiar direto |
| Backend timeout | DB pool exhausted | Monitorar conexões, aumentar pool_size |
| Upload falha | Render ephemeral storage | Uploads funcionam até restart; usar S3 pra permanente |
| Timeout build | Node modules grandes | Vercel cache, Render cache — aguarda 2o build |

## URLs após deploy

```
Frontend:  https://seu-projeto.vercel.app
Backend:   https://seu-backend.onrender.com
Database:  postgresql://host.neon.tech/dbname
```

Update CORS_ORIGINS no backend pra URL final do frontend!

## Próximos passos

### Crítico
- [ ] Testar fluxo auth: login → route optimization → upload
- [ ] Verificar logs Render pra erros DB
- [ ] Monitora CORS na network tab do browser (dev tools)

### Recomendado (depois)
- [ ] Implementar S3/Cloudinary pra uploads persistentes
- [ ] Aumentar pool_size se vir muitos timeouts
- [ ] Setup monitoring/alerting (Render tem dashboard)
- [ ] Backup automático Neon (free tier oferece 7-day recovery)

### Escalabilidade futura
- Render free tier: ~3 active connections, pode ficar lento
- Neon free tier: 3GB storage, 3 projects limit
- Vercel free: unlimited deployments, good for frontend scaling
