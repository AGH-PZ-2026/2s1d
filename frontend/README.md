Aplikacja kliencka oparta na frameworku React.

## Instalacja lokalna

1. Zainstaluj zaleznosci:
   npm install

## Uruchamianie

Uruchom serwer deweloperski:
npm run dev

Po uruchomieniu aplikacja dostepna pod adresem:
http://localhost:5173

## Struktura projektu

- public/ - zasoby statyczne (obrazy, ikony)
- src/components/ - reużywalne komponenty UI
- src/hooks/ - własne hooki Reacta
- src/pages/ - komponenty odpowiadajace za widoki
- src/services/ - komunikacja z API
- src/types/ - definicje interfejsów i typów TypeScript
- src/utils/ - funkcje pomocnicze i formatowanie

## Budowanie wersji produkcyjnej

Przygotowanie paczki do wdrozenia:
npm run build