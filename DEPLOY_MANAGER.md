# Route Manager + Deploy Manager Integration

Esse projeto foi otimizado para rodar no **Deploy Manager v2.0** (portal Node.js).

## Setup no Portal

### 1. Criar App

No portal, criar app Docker:

**Nome:** Route Manager (ou outro)  
**Git URL:** https://github.com/Souzinhaa/route-manager.git  
**Branch:** main  
**Dockerfile Path:** backend/Dockerfile (se só backend) ou deixar padrão  
**Deploy Mode:** Docker  
**Porta:** 8010  

### 2. Variáveis de Ambiente

No portal, na aba **Environment Variables**, adicionar:

```
POSTGRES_DB=route_manager
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha_forte_aqui
SECRET_KEY=chave_secreta_minimo_32_chars
GOOGLE_MAPS_API_KEY=sua_chave_google_maps
```

⚠️ **IMPORTANTE:** Não usar valores entre aspas. Portal injeta diretamente.

### 3. Docker Compose

Esse compose tá otimizado pra receber vars do portal.

Quando faz **Deploy**:
1. Portal clona repo
2. Portal detecta `docker-compose.yml` automaticamente
3. Portal cria arquivo `.env.dm` com as vars (no diretório do compose)
4. Compose carrega `.env.dm` e injeta nas services
5. Services (postgres, backend, frontend) rodam com as vars corretas

**Não é necessário** ter arquivo `.env` local no repo.

### 4. Healthcheck

O compose já tem healthcheck em todas services. Portal aguarda eles ficarem "healthy" antes de considerar deploy OK.

- **db:** `pg_isready`
- **backend:** `curl http://localhost:8000/health`

### 5. Monitoramento

No portal, acompanhar:
- **Logs:** Real-time via WebSocket
- **Status Compose:** Ver cada serviço (postgres, backend, frontend)
- **Stats:** CPU/Memory de cada container
- **Timeline:** Eventos de deploy (git clone, compose up, etc)

## Estrutura de Vars

| Var | Uso | Obrigatória |
|-----|-----|-------------|
| `POSTGRES_DB` | Nome do banco postgres | ✅ Sim |
| `POSTGRES_USER` | User postgres | ✅ Sim |
| `POSTGRES_PASSWORD` | Password postgres | ✅ Sim |
| `SECRET_KEY` | JWT secret backend | ✅ Sim |
| `GOOGLE_MAPS_API_KEY` | Google Maps (optional, funciona sem) | ❌ Não |

## Troubleshoot

**Compose não detectou automaticamente:**
- Na aba da app, clique em "Detect Compose File"
- Portal vai procurar nos locais padrão

**Variáveis não pegaram:**
- Verificar no log: procurar por `[COMPOSE] Iniciando serviços...`
- Se tiver vars no comando, significa que portal injetou
- Verificar em "Compose Status" se serviços tão up com os values certos

**Container morreu logo após start:**
- Ver logs via "Container Logs"
- Logs do compose via "Compose Logs"
- Verificar se banco postgres tá healthy (verde)

## Redeploy

Qualquer mudança (pull code novo, update de vars):
1. Portal clica "Deploy" novamente
2. Git pull automático
3. Docker rebuild
4. Compose up com as vars novas

Tá automático. Sem downtime se fizer right.

## Backup

Arquivo de dados PostgreSQL fica em volume docker (`db_data`). Portal manage via `docker volume`.

Uploads fica em `/app/uploads` (volume `uploads_data`).

Backups regulares = bom.
