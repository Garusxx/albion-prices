# Production deploy

## 1. Configure API URL

Copy the example env file:

```bash
cp .env.production.example .env
```

Set `NEXT_PUBLIC_API_BASE_URL` to the public backend URL.

For local production test:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

For a VPS:

```bash
NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:4000
```

## 2. Build and run

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Frontend:

```txt
http://YOUR_SERVER_IP:3000
```

Backend health check:

```txt
http://YOUR_SERVER_IP:4000/health
```

## 3. Stop

```bash
docker compose -f docker-compose.prod.yml down
```
