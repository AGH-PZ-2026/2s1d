# Plan Realizacji Projektu: Zintegrowany System Zarządzania Aparaturą Pomiarową (AGH)

Poniższy plan opiera się na dostarczonych wymaganiach biznesowych (plik `wymagania.txt`) oraz założeniach stosu technologicznego (FastAPI + React/TS). Projekt zakłada realizację iteracyjną, bez tzw. "scope creep", dostarczając kluczową funkcjonalność w określonych oknach czasowych.

## Etap 1: Fundament Systemu (~3 tygodnie)
*Cel: Zbudowanie kluczowej wartości (MVP) umożliwiającej zarządzanie przedmiotami i zebranie wczesnego feedbacku.*

**Zarządzanie przedmiotami i lokalizacją**
*   **Hierarchia kategorii (US-01):** Modele drzewiaste dla kategorii, dodawanie flag/statusów (dostępny, wypożyczony, etc.).
*   **Dodawanie przedmiotów (US-02):** Utworzenie podstawowych modeli przedmiotu (nazwa, producent, opis, data zakupu, status, kategoria).
*   **Identyfikacja QR (US-03) oraz "Szybkie akcje" (US-04):** Generowanie wewnętrznych UUID, przypisywanie istniejących QR. Dedykowany widok mobilny/desktopowy po zeskanowaniu QR do szybkiej zmiany statusu na "uszkodzony" (dla właścicieli).
*   **Lokalizacje (US-01, US-02 z sekcji Lokalizacje):** Definiowanie punktów na mapie, wewnętrznych i zewnętrznych lokalizacji. Przypisywanie do konkretnej szafy/półki.

**Wypożyczenia i Wyszukiwanie**
*   **Wypożyczenie klasyczne (US-01):** Przepływ wymagający potwierdzeń po stronie wypożyczającego i właściciela (Oczekuje -> Zarezerwowany -> Wypożyczony -> Dostępny).
*   **Filtrowanie (US-01):** Paginated table na frontendzie z filtrami po statusach, producentach, właścicielach.

**Role, Użytkownicy i Uprawnienia**
*   **Integracja SSO i Brak Dostępów Domyślnych (US-03, US-04):** Logowanie przez SSO AGH. Po zalogowaniu nowy użytkownik posiada 0 uprawnień dopóki nie otrzyma ich od administratora.
*   **Opiekunowie (US-01):** Przypisywanie odpowiedzialności (osoby/grupy) za przedmioty.

---

## Etap 2: Rozbudowa Systemu (~2 tygodnie)
*Cel: Rozszerzenie przepływów biznesowych, wdrożenie audytu i import początkowych zasobów.*

**Rozbudowa możliwości operacyjnych**
*   **Zdjęcia (US-05):** Upload, przechowywanie i wyświetlanie historii zdjęć przedmiotów (dokumentacja stanu).
*   **Delegowanie uprawnień (US-02):** Właściciele mogą wskazywać delegatów do "zarządzania" lub "edycji" z jasno rozdzielonymi prawami.
*   **Rejestracja dla osób spoza SSO (US-03):** Formularz rejestracji wstrzymany do momentu akceptacji przez admina.

**Nowe przepływy wypożyczeń i audyt**
*   **Wypożyczenia oparte na zaufaniu (US-02) i Asynchroniczne (US-03):** Uproszczenie formalności dla obiektów małej wartości (samodzielny odbiór / zwrot użytkownika w systemie).
*   **Raportowanie terminów (US-05):** Generowanie plików PDF i CSV z przekroczeniami terminów zwrotu dla adminów i opiekunów (z wykorzystaniem biblioteki `fpdf2`).
*   **Audit Log (US-02):** Mechanizm śledzenia operacji w celach audytowych (kto, kiedy, co zmienił - np. event sourcing na tabeli dziennika).

**Migracja Danych**
*   **Import Excel (US-04):** Obsługa przesyłania plików `.xlsx` (`openpyxl`), mapowanie kolumn, walidacja błędów.

---

## Etap 3: Usprawnienia i Automatyzacja (~2 tygodnie)
*Cel: Domknięcie i polerowanie procesów, migracja historyczna, masowe generowanie etykiet.*

*   **Szybkie wypożyczenia zewnętrzne (US-04):** Przepływ dla osób zewnętrznych (bez konta) - ręczne wprowadzanie odbiorcy i terminu przez właściciela.
*   **Powiadomienia (US-03):** Konfiguracja e-maili (lub Push) przed końcem terminu zwrotu oraz przy akceptacjach rezerwacji (kolejkowanie zadań / workery).
*   **Migracja ze starego systemu (US-04):** Opracowanie importera z uwzględnieniem dawnej struktury bazodanowej.
*   **Seryjne etykietowanie (US-05):** Generowanie kodów QR `(qrcode)` w paczkach po zaznaczeniu wielu obiektów i ich eksport do wydruku z opcjami zmiany rozmiaru.
