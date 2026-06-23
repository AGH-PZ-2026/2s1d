# Wdrożenie produkcyjne

## Wariant Docker

Docker jest obecnie główną ścieżką uruchomienia. Kontener aplikacji uruchamia
serwer Node/Hono, serwuje zbudowane pliki SPA z `dist/client`, API `/api/*`
oraz pliki zdjęć przez `/storage/*`. Nie używa `wrangler dev`.

1. Skopiuj `.env.example` do `.env`.
2. Ustaw mocne wartości:
   - `MYSQL_ROOT_PASSWORD`,
   - `MYSQL_PASSWORD`,
   - `JWT_SECRET` (minimum 32 losowe znaki),
   - `GOOGLE_CLIENT_ID` dla produkcyjnego logowania Google, jeśli ma być użyte,
   - `INITIAL_ADMIN_EMAIL`.
     Opcjonalnie dostosuj `DB_CONNECTION_LIMIT` do limitów MySQL i liczby
     instancji aplikacji.
3. Upewnij się, że `DEV_BYPASS_AUTH=false`. Walidator Docker blokuje produkcyjne
   uruchomienie z `DEV_BYPASS_AUTH=true`, placeholderami albo zbyt krótkim
   `JWT_SECRET`.
4. Jeżeli aplikacja działa za reverse proxy, ustaw `TRUST_PROXY=true` tylko wtedy,
   gdy proxy usuwa przychodzące od klienta `X-Forwarded-For`, `X-Real-IP` i
   ustawia je samodzielnie. Bez tego zostaw `TRUST_PROXY=false`.
5. Sprawdź konfigurację przed startem:

```bash
set -a
. ./.env
set +a
docker compose --env-file .env config >/dev/null
MYSQL_HOST=db MYSQL_USER="$MYSQL_USER" MYSQL_PASSWORD="$MYSQL_PASSWORD" \
  MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" MYSQL_DATABASE="$MYSQL_DATABASE" \
  JWT_SECRET="$JWT_SECRET" \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" INITIAL_ADMIN_EMAIL="$INITIAL_ADMIN_EMAIL" \
  DEV_BYPASS_AUTH="$DEV_BYPASS_AUTH" TRUST_PROXY="$TRUST_PROXY" \
  NOTIFICATIONS_INTERVAL_MINUTES="$NOTIFICATIONS_INTERVAL_MINUTES" \
  DB_CONNECTION_LIMIT="$DB_CONNECTION_LIMIT" DB_QUEUE_LIMIT="$DB_QUEUE_LIMIT" \
  pnpm run validate:docker
```

6. Zbuduj i uruchom:

```bash
docker compose up --build -d
```

7. Uruchom migracje jednorazowym kontenerem narzędziowym:

```bash
docker compose --profile tools build migrate
docker compose --profile tools run --rm migrate
```

Zdjęcia są przechowywane w wolumenie `photos_data`. Baza danych w wolumenie
`mysql_data`. Oba wolumeny muszą mieć backup i test odtworzenia.
Kontener zapisuje zdjęcia w `/data/photos`; `docker-compose.yml` mapuje ten
katalog na wolumen `photos_data`.

Przykład wygenerowania sekretów:

```bash
openssl rand -base64 48
```

Backup:

```bash
scripts/backup-docker.sh
```

Skrypt tworzy katalog `backups/<timestamp>/` z `mysql.sql` oraz
`photos.tar.gz`. Katalog `backups/` jest ignorowany przez Git.

Test odtworzenia w środowisku testowym:

```bash
scripts/restore-docker.sh backups/<timestamp> --force
docker compose --profile tools build migrate
docker compose --profile tools run --rm migrate
curl --fail http://127.0.0.1:${APP_PORT:-8787}/api/health
```

Restore nadpisuje dane w bazie i wolumenie zdjęć, dlatego wymaga jawnego
`--force`.

Serwer Docker uruchamia cykliczne tworzenie powiadomień in-app o zbliżającym
się terminie zwrotu. Domyślny interwał to 60 minut (`NOTIFICATIONS_INTERVAL_MINUTES=60`).
Jednorazowe uruchomienie zadania:

```bash
docker compose exec app pnpm run notifications:run
```

Kanały e-mail i push są celowo wyłączone w API, dopóki nie zostanie podłączony
dostawca wysyłki.

## Reverse Proxy, TLS i logi

Kontener aplikacji nasłuchuje HTTP na porcie `8787`. W produkcji wystaw go przez
reverse proxy z TLS, np. nginx, Caddy, Traefik albo bramę uczelnianą.

Wymagania dla proxy:

- wymuszaj HTTPS i przekierowanie HTTP -> HTTPS;
- ustaw HSTS na domenie produkcyjnej po potwierdzeniu poprawnego certyfikatu;
- limituj rozmiar body do co najmniej 10 MB plus narzut multipart, bo zdjęcia
  mają limit aplikacyjny 10 MB;
- przekazuj `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`;
- jeżeli ustawiasz `TRUST_PROXY=true`, proxy musi usuwać wersje tych nagłówków
  przysłane przez klienta przed dodaniem własnych;
- kieruj `/api/*`, `/storage/*` i pozostałe ścieżki do tego samego kontenera,
  bo API, zdjęcia i SPA routing obsługuje serwer Node.

Logi aplikacji są strukturalne JSON na stdout/stderr. Produkcyjne uruchomienie
musi mieć skonfigurowaną retencję logów poza kontenerem (np. journald, Loki,
ELK, Cloud logging) oraz alert dla restart loopów i błędów `return due notifications failed`.

Po wdrożeniu sprawdź:

- `GET /api/health` zwraca `200` oraz `{"status":"ok","database":"ok"}`;
- logowanie Google działa dla skonfigurowanego administratora;
- niezalogowane `GET /api/v1/items/` zwraca `401`;
- dodanie, odczyt i pobranie zdjęcia działa z wolumenu zdjęć;
- backup MySQL i `photos_data` można odtworzyć w środowisku testowym.

## Google OAuth w Dockerze

Backend nie używa sekretu klienta Google. Frontend pobiera `credential` z
Google Identity Services i wysyła go do `POST /api/v1/auth/google-login`.
Backend weryfikuje token przez Google `tokeninfo`, sprawdza `aud` względem
`GOOGLE_CLIENT_ID` oraz domenę konta `@agh.edu.pl`.

W Google Cloud Console skonfiguruj klienta OAuth typu **Web application**:

- `Authorized JavaScript origins`: publiczny adres aplikacji, np.
  `https://inventory.example.edu.pl`;
- `Authorized redirect URIs`: nie są używane przez ten flow, ale Google Cloud
  może wymagać wpisu; użyj publicznego adresu aplikacji lub jego ścieżki
  logowania, zgodnie z UI Google Cloud;
- `GOOGLE_CLIENT_ID` w `.env`: pełny identyfikator kończący się
  `.apps.googleusercontent.com`.

`DEV_BYPASS_AUTH=true` pozwala w development traktować `credential` jako email.
Nie wolno używać tego trybu w Docker production; `scripts/validate-docker-env.mjs`
blokuje taki start.

## Wariant Cloudflare Worker

Ta ścieżka zostaje w repo jako alternatywa/legacy. Domyślna produkcja jest
Docker-first; Worker wymaga osobnej konfiguracji Cloudflare i nie korzysta z
dockerowego `.env`.

### Wymagane zasoby

- MySQL 8.4 dostępny z Cloudflare Hyperdrive, z TLS i kopiami zapasowymi.
- Konfiguracja Hyperdrive wskazująca produkcyjną bazę.
- Bucket R2 `pz-item-photos`.
- Domena aplikacji w Cloudflare.
- Klient OAuth typu Web application dla domeny aplikacji.
- Konto `@agh.edu.pl`, które zostanie pierwszym administratorem.

### Konfiguracja

1. W `wrangler.jsonc`, w `env.production`, zastąp wszystkie wartości `<YOUR_...>`:
   - identyfikatorem Hyperdrive,
   - domeną aplikacji,
   - identyfikatorem klienta Google OAuth,
   - adresem pierwszego administratora.
2. W Google Cloud dodaj domenę aplikacji do dozwolonych źródeł JavaScript.
3. Ustaw sekret JWT interaktywnie:

```bash
pnpm exec wrangler secret put JWT_SECRET --env production
```

Sekret musi być unikalną, losową wartością. Nie zapisuj go w repozytorium ani w `vars`.

Nie włączaj `DEV_BYPASS_AUTH` poza lokalnym developmentem. Do pracy lokalnej
utwórz `.dev.vars` z `.dev.vars.example`; plik `.dev.vars` jest ignorowany przez
Git.

### Baza danych

Przed pierwszym wdrożeniem uruchom migracje przeciwko produkcyjnej bazie:

```bash
MYSQL_HOST=... MYSQL_PORT=3306 MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... pnpm run db:migrate
```

Jeżeli instalacja ma udostępniać katalog pracowników, zaimportuj tabele referencyjne koidc (`pracownicy`, `stopnie`, `grupy`, `zespoly`). Bez nich `/api/v1/staff` celowo zwraca `503`.

### Kontrola i wdrożenie

```bash
pnpm install --frozen-lockfile
pnpm run types:worker:check
pnpm run check
pnpm run lint
pnpm test
pnpm run build:worker
pnpm audit --prod
pnpm run deploy:worker:dry-run
pnpm run deploy:worker
```

Walidator blokuje wdrożenie z placeholderami, włączonym `DEV_BYPASS_AUTH`,
brakiem harmonogramu powiadomień, brakiem observability albo błędnym formatem
domeny produkcyjnej.

Po wdrożeniu Workera sprawdź:

- `GET /api/health` zwraca `200` oraz `{"status":"ok","database":"ok"}`;
- logowanie Google działa dla skonfigurowanego administratora;
- niezalogowane `GET /api/v1/items/` zwraca `401`;
- dodanie, odczyt i pobranie zdjęcia działa z R2;
- backup MySQL można odtworzyć w środowisku testowym.

### Wycofanie

Kod Worker można wycofać przez `pnpm exec wrangler rollback --env production`. Migracje DB wymagają osobnego, wcześniej przetestowanego planu; nie cofaj ich automatycznie po wdrożeniu kodu.
