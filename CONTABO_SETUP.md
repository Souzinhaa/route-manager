# Setup Contabo VPS 10 do Zero

Route Manager + PostgreSQL em Docker. Ubuntu 22.04 LTS.

## 1. SSH e Update Inicial

```bash
ssh root@<seu-ip-contabo>

apt update && apt upgrade -y
apt install -y curl wget git htop tmux
```

## 2. Instalar Docker + Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
bash get-docker.sh
rm get-docker.sh

# Compose plugin
apt install -y docker-compose-plugin

# Verificar
docker --version
docker compose version
```

## 3. Clonar Repositório

```bash
cd /opt
git clone https://github.com/seu-usuario/route-manager.git
cd route-manager
git checkout feature/contabo-vps-resources
```

## 4. Configurar Variáveis de Ambiente

```bash
cat > .env << 'EOF'
POSTGRES_PASSWORD=sua-senha-super-segura-aqui
SECRET_KEY=gere-com-python-secrets-generate-strong-token
GOOGLE_MAPS_API_KEY=se-tiver
WEB_WORKERS=4
MAX_UPLOAD_SIZE_MB=100
ACCESS_TOKEN_EXPIRE_MINUTES=480
EOF
```

### Gerar SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 5. Build e Deploy

```bash
docker compose up -d

# Verificar se subiu
docker compose ps
docker compose logs -f app
```

Esperar ~30s para postgres ficar saudável. App vai conectar automaticamente.

## 6. Testes

```bash
# Health check
curl http://localhost:8000/health

# Acessar UI
# http://<seu-ip-contabo>:8000
```

## 7. Monitorar Recursos

```bash
# Em tempo real
docker stats

# Logs postgres
docker compose logs db

# Logs app
docker compose logs app
```

## 8. (Opcional) Nginx Reverse Proxy

Se quiser https + domínio próprio:

```bash
apt install -y nginx certbot python3-certbot-nginx

# Criar config
cat > /etc/nginx/sites-available/route-manager << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Ativar
ln -sf /etc/nginx/sites-available/route-manager /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# SSL (Let's Encrypt)
certbot --nginx -d seu-dominio.com
```

## 9. Problemas Comuns

### Postgres não sobe
```bash
# Ver logs
docker compose logs db

# Limpar volume se corrompido
docker compose down -v
docker compose up -d
```

### App conecta mas queries lentas
PostgreSQL precisa de warmup. Deixar rodando 5min. Se persistir:
```bash
# Reduzir effective_cache_size no docker-compose.yml
# De 3GB para 2GB (deixar mais RAM pro OS)
```

### Porta 8000 já em uso
```bash
# Ver o que está usando
lsof -i :8000

# Ou mudar porta no docker-compose.yml (app > ports)
```

### Upgrade de branch (nova versão)
```bash
cd /opt/route-manager
git pull origin feature/contabo-vps-resources
docker compose build --no-cache
docker compose up -d
```

## 10. Automação de Backup

```bash
# Cron job: backup postgres todo dia às 2am
crontab -e

# Adicionar linha:
0 2 * * * cd /opt/route-manager && docker compose exec -T db pg_dump -U postgres route_manager > /backups/route_manager_$(date +\%Y\%m\%d).sql
```

## Performance Expected

Com Contabo VPS 10:
- App boot: ~5 segundos
- Postgres first query: ~500ms (warmup), depois <50ms
- Concurrent requests: 50+ sem pico de CPU
- Memory: ~2.5GB em repouso, pode chegar a 3.5GB sob carga

Se não bater essas métricas, check:
```bash
docker stats          # CPU/MEM em tempo real
docker compose logs   # Erros
```

---

Dúvidas? Ver logs: `docker compose logs -f`
