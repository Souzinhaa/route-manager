# Route Manager 🚚

SaaS de otimização de rotas de entrega para logística brasileira. Roteiriza endereços pela melhor ordem (TSP/VRP), extrai endereços de NFes automaticamente e exporta para Google Maps com economia calculada.

## Problema Resolvido

Entregadores e despachantes gastam horas planejando rotas manualmente, aumentando combustível, tempo e custos. Route Manager automatiza isso em 30 segundos, mostrando economia exata de km e tempo.

## Tecnologias

- **Frontend**: React 18 + Vite + Router 6
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Otimização**: Google OR-Tools + Haversine distance
- **Geocoding**: Google Maps API
- **Parsing**: XML (NFe), PDF (OCR), PNG/JPG (OCR)
- **Deploy**: Docker Compose, otimizado para VPS low-cost (2GB RAM)

## Setup Local

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

### 2. Subir containers

```bash
docker-compose up -d
```

Esperar ~30s:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- DB: localhost:5432

### 3. Testar

1. Registrar em http://localhost:3000/register
2. Dashboard → Add waypoints → Optimize
3. Ou Upload NFE (XML/PDF/PNG) para auto-extrair endereços

## Features Implementadas

### Autenticação
- JWT register/login
- Credits system (pronto para pagamento)

### Roteirização
- **TSP**: Traveling Salesman Problem (menor distância)
- **VRP**: Vehicle Routing (constraints no roadmap)
- OR-Tools engine
- Geocoding automático Google Maps
- Link Google Maps até 200 paradas

### Upload Smart
- NFe XML → extrai endereços automaticamente
- NFe PDF → OCR com pytesseract
- Imagens PNG/JPG → OCR
- Revisar/desselecionar antes de otimizar

### Histórico
- Todas as rotas salvam
- Calcula distância, duração, custo combustível
- Link persistente Maps

---

## 3 Features que Aumentam Conversão (Zero Custo)

### 1️⃣ **Comparador de Rotas**
**O que:** Lado a lado 3 versões da mesma rota:
- Ordem atual (do usuário)
- Ordem aleatória
- Rota otimizada ✅

**Por quê:** Usuário VÊ economia de 30-40% imediatamente. Justifica inscrição. "Veja quanto você perde com rota errada."

**Custo:** Mínimo — só roda 2 otimizações extras em memória, sem carregar DB.

---

### 2️⃣ **Relatório de Economia em PDF**
**O que:** Gera PDF com:
- Km economizados
- Tempo economizado
- Custo combustível estimado economizado
- Tabela: parada → distância acumulada
- QR code → link Maps

**Por quê:** Usuário compartilha com chefe/cliente. "Economizamos R$ 450 essa semana." Prova ROI da ferramenta. Viral natural.

**Custo:** ~100 linhas de código (ReportLab). Uma requisição GET.

---

### 3️⃣ **Templates de Rotas**
**O que:** Salvar rotas frequentes com um click:
- "Rota Centro-Sul Segunda" → template
- Próxima segunda: "Carregar template" → popula dashboard
- Edita se precisar, otimiza, pronto

**Por quê:** Aumenta uso semanal 2-3x. Usuário volta toda semana. Menos atrito = mais conversão.

**Custo:** Tabela nova (Route_Template), 2 endpoints POST/GET. Campo select no Dashboard.

---

## Estrutura

```
backend/
  ├── app/
  │   ├── main.py
  │   ├── config.py
  │   ├── models/db.py (+ novo: RouteTemplate)
  │   ├── routes/
  │   │   ├── auth.py
  │   │   ├── routes.py (+ novo: routes_compare, routes_report)
  │   │   └── templates.py (novo)
  │   └── services/
  │       ├── ortools_service.py
  │       ├── geocoding.py
  │       ├── nfe_parser.py
  │       └── report_generator.py (novo)
  └── requirements.txt

frontend/
  ├── src/pages/
  │   ├── Dashboard.jsx (+ template dropdown)
  │   ├── Results.jsx (+ tab: Comparar Rotas)
  │   └── Reports.jsx (novo)
  └── src/services/
      └── api.js (+ novo: fetchReport)
```

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Routes
- `POST /routes/upload` - Upload arquivo
- `POST /routes/optimize` - Otimizar rota
- `POST /routes/save` - Salvar rota
- `GET /routes/history` - Histórico
- **NEW:** `POST /routes/compare` - Comparar 3 versões
- **NEW:** `GET /routes/{id}/report` - PDF economia

### Templates (novo)
- **NEW:** `POST /templates` - Criar template
- **NEW:** `GET /templates` - Listar templates usuário
- **NEW:** `GET /templates/{id}` - Carregar template no dashboard
- **NEW:** `DELETE /templates/{id}` - Deletar template

### Health
- `GET /health` - Health check

## Infra

- Pentium T4500 (x86_64) + 2GB RAM
- PostgreSQL 15-alpine (256M)
- FastAPI 1 worker (384M)
- React + Nginx (128M)
- Docker Compose com limits