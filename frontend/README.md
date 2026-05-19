# Frontend (React + Vite)

Aplikacja kliencka (SPA) oparta na bibliotece React oraz szybkim narzędziu budowania Vite, napisana w TypeScript.

## Instalacja lokalna

1. Upewnij się, że masz zainstalowany Node.js (rekomendowana wersja 20 LTS lub nowsza).
2. Zainstaluj zależności (w katalogu frontend):

```
npm install
```

## Uruchamianie lokalnie

Uruchom serwer deweloperski:

```
npm run dev
```

Po uruchomieniu serwera frontend dostępny będzie na:
http://127.0.0.1:5173

## Uruchamianie testów (Vitest)

Projekt posiada skonfigurowane środowisko testowe oparte na Vitest oraz React Testing Library.

### Uruchamianie testów Lokalnie

Uruchom testy w trybie automatycznego odświeżania (Watch mode):

```
npm run test
```

### Uruchamianie testów wewnątrz kontenera

Jeśli kontenery już działają w tle, możesz odpalić testy bezpośrednio w kontenerze:

```
docker compose exec frontend npm run test
```

Struktura projektu

- src/assets/ - pliki statyczne (style globalne, obrazki, ikony)
- src/components/ - reużywalne, niezależne komponenty UI (np. przyciski, formularze)
- src/hooks/ - własne, niestandardowe hooki Reacta (logika stanowa)
- src/pages/ - komponenty reprezentujące całe strony/widoki (używane w React Router)
- src/services/ - warstwa komunikacji z API backendu (zapytania fetch/axios)
- src/setupTest.ts - globalna konfiguracja środowiska testowego (jest-dom)
- vite.config.ts - główna konfiguracja Vite oraz Vitest
