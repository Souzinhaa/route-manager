# Quick Start

## 1. Verificar Docker

```bash
docker --version
docker-compose --version
```

## 2. Build & Run

```bash
docker-compose up -d
```

Pronto! Esperar 30s:
- Frontend: http://localhost:3010
- Backend: http://localhost:8010
- DB: localhost:5442

## 3. Test

1. Abrir http://localhost:3010
2. Register: email/password
3. Login
4. Dashboard → Add endereços → Optimize

## 4. Parar

```bash
docker-compose down
```

Limpar volumes:
```bash
docker-compose down -v
```

## Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Troubleshoot

**Port 3000/8000 já em uso?**
```bash
# Mudar no docker-compose.yml ou:
docker-compose down -v
```

**DB não inicializa?**
```bash
docker-compose down -v
docker-compose up -d db
# Esperar 10s
docker-compose up -d
```

**Sem Google Maps API?**
- Geocoding funcionará sem coords
- Google Maps URL ainda gera (sem rota visual)
- Adicionar chave em .env depois

## Next Steps

- Instalar Google Maps API key em .env
- Usar `/upload` para NFE (XML/PDF/PNG)
- Dashboard mostra histórico de rotas
- Cada rota salva com distance/duration/cost
