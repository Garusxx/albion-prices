# Railway deploy

Najprostszy deploy na Railway: dwa serwisy z tego samego repo.

## 1. Backend service

1. Railway -> New Project -> Deploy from GitHub repo.
2. Wybierz repo.
3. Service Settings -> Root Directory:

```txt
/backend
```

4. Service Variables:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.prod
```

5. Settings -> Networking -> Public Networking -> Generate Domain.
6. Sprawdz backend:

```txt
https://TWOJ-BACKEND.railway.app/health
```

## 2. Frontend service

1. W tym samym projekcie Railway dodaj drugi serwis z tego samego GitHub repo.
2. Service Settings -> Root Directory:

```txt
/frontend
```

3. Service Variables:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.prod
NEXT_PUBLIC_API_BASE_URL=https://TWOJ-BACKEND.railway.app
```

4. Settings -> Networking -> Public Networking -> Generate Domain.
5. Otworz frontend domain.

## Wazne

`NEXT_PUBLIC_API_BASE_URL` jest wbudowywane podczas buildu frontendu, wiec po
wpisaniu albo zmianie backend domain zrob redeploy frontendu.

