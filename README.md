# Route Manager 🚚

Otimização de rotas com suporte a NFE, PDF e imagens. Roteiriza endereços pela melhor ordem (TSP/VRP) e exporta para Google Maps.

## Tecnologias

- **Frontend**: React 18 + Vite
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Otimização**: Google OR-Tools + Haversine distance
- **Geocoding**: Google Maps API
- **Parsing**: XML, PDF (OCR), PNG (OCR)

## Setup

### 1. Copiar .env

```bash
cp .env.example .env
```

Editar `.env`:
```
POSTGRES_PASSWORD=seu_password_aqui
SECRET_KEY=seu_secret_key_aqui
GOOGLE_MAPS_API_KEY=sua_chave_google_maps
```

### 2. Build e run

```bash
docker-compose up -d
```

Esperar ~30s para containers iniciarem:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- DB: localhost:5432

### 3. Criar conta e testar

1. Registrar em http://localhost:3000/register
2. Login
3. Dashboard → Add waypoints → Optimize
4. Upload NFE (XML/PDF/PNG) para auto-extrair endereços

## Features

### Autenticação
- Register/Login com JWT
- Credits system (preparado para pagamento futuro)

### Roteirização
- **TSP**: Traveling Salesman (menor distância)
- **VRP**: Vehicle Routing (constraints futuros)
- Otimização com OR-Tools
- Geocoding com Google Maps API
- Link pronto para Google Maps (até 200 paradas)

### Upload
- XML NFE → extrai endereços automaticamente
- PDF NFE → OCR com pytesseract
- PNG/JPG → OCR
- Select/deselect antes de usar

### Histórico
- Salva todas as rotas
- Distance, duration, cost estimate
- Link persistente para Google Maps

## Estrutura

```
backend/
  ├── app/
  │   ├── main.py
  │   ├── config.py
  │   ├── models/db.py
  │   ├── models/schemas.py
  │   ├── routes/auth.py
  │   ├── routes/routes.py
  │   ├── routes/health.py
  │   ├── services/ortools_service.py
  │   ├── services/geocoding.py
  │   └── services/nfe_parser.py
  ├── requirements.txt
  ├── Dockerfile
  └── entrypoint.sh

frontend/
  ├── src/pages/
  ├── src/services/
  ├── src/App.jsx
  ├── src/index.css
  ├── Dockerfile
  ├── nginx.conf
  └── package.json

docker-compose.yml
migrations/001_initial.sql
```

## API Endpoints

### Auth
- `POST /auth/register` - Registrar
- `POST /auth/login` - Login (retorna JWT)
- `GET /auth/me` - Dados usuário

### Routes
- `POST /routes/upload` - Upload arquivo
- `POST /routes/optimize` - Otimizar rota
- `POST /routes/save` - Salvar rota
- `GET /routes/history` - Histórico
- `GET /health` - Health check

## Infra

- Otimizado para Pentium T4500 (x86_64) com 2GB RAM
- PostgreSQL 15-alpine (256M limit)
- FastAPI 1 worker (384M limit)
- React + Nginx (128M limit)
- Docker Compose com resource limits