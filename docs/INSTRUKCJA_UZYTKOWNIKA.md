# Instrukcja użytkownika

Instrukcja dotyczy interfejsu **System Zarządzania Inwentaryzacją** sprawdzonego
23 czerwca 2026 r. Opisuje wyłącznie zachowania potwierdzone w interfejsie lub
przez reguły działającego systemu. Nie opisuje instalacji ani administracji
technicznej.

## Dostęp i konto

1. Otwórz adres systemu otrzymany od administratora.
2. Wybierz **Logowanie**.
3. W instalacji z logowaniem Google użyj konta w domenie `@agh.edu.pl`.
4. Po zalogowaniu sprawdź email i rolę w lewym dolnym rogu menu.

Bez zalogowania chronione strony pokazują komunikat **Wymagane logowanie**.
Nowe konto utworzone przez formularz **Rejestracja** wymaga hasła o długości co
najmniej 8 znaków i zatwierdzenia przez administratora. Formularz potwierdza
rejestrację komunikatem **Konto wymaga zatwierdzenia przez administratora**.
Po zatwierdzeniu konta zaloguj się w sekcji **Logowanie e-mailem** przy użyciu
adresu i hasła podanych podczas rejestracji.

## Role i uprawnienia

- **Użytkownik**: korzysta z ewidencji, QR, wypożyczeń, raportów i własnych
  ustawień. Zakres zmian konkretnego przedmiotu zależy od opieki lub delegacji.
- **Administrator**: dodatkowo zarządza użytkownikami i grupami, widzi logi
  audytu, wykonuje import oraz może usuwać przedmioty.
- **Opiekun przedmiotu**: może edytować przedmiot, lokalizację i delegacje oraz
  obsługiwać dotyczące go wypożyczenia.
- Delegacja **Edycja** pozwala zmieniać status, opis i opiekuna.
- Delegacja **Zarządzanie** daje pełną edycję przedmiotu oraz zarządzanie jego
  delegacjami.

Przedmiot może mieć jednego opiekuna: osobę albo grupę. Nie można wybrać obu.

## Dashboard i menu

Dashboard pokazuje liczbę przedmiotów, wypożyczonych i przeterminowanych pozycji,
liczbę kategorii oraz stan połączenia z bazą. Skróty prowadzą do przedmiotów,
wypożyczeń, skanera QR, importu, druku etykiet i raportu przeterminowań.

Menu administratora zawiera dodatkowo **Użytkownicy**, **Grupy** i **Logi
audytu**. **Import Excel** jest stroną tylko dla administratora, choć odnośnik
może być widoczny również dla zwykłego użytkownika; próba wejścia kończy się
komunikatem o braku uprawnień.

## Przedmioty

### Wyszukiwanie

1. Otwórz **Przedmioty**.
2. Użyj pola wyszukiwania, aby szukać po nazwie, opisie, modelu, numerze
   seryjnym lub inwentarzowym.
3. W razie potrzeby ustaw producenta, kategorię, status, lokalizację albo
   opiekuna.
4. Kliknij nagłówek tabeli, aby zmienić sortowanie.
5. Kliknij wiersz, aby otworzyć szczegóły.

### Dodawanie

1. Kliknij **+ Dodaj przedmiot**.
2. Podaj nazwę. Pozostałe pola opisowe są opcjonalne.
3. Wybierz opiekuna: osobę albo grupę. Opiekun jest wymagany.
4. Opcjonalnie wybierz kategorię, status i lokalizację.
5. Zapisz formularz.

Jeżeli nie podasz identyfikatora systemowego, system nada go automatycznie w
postaci `INV-000001`. Numer kolejny będzie zależał od danych instalacji.

### Szczegóły i lokalizacja

Po wybraniu przedmiotu zobaczysz jego dane, opiekuna, status, lokalizację, mapę,
zdjęcia i delegacje. Osoba z odpowiednim uprawnieniem może:

- edytować dane przedmiotu;
- wybrać istniejącą lokalizację;
- utworzyć punkt wewnętrzny lub zewnętrzny i przypisać go do przedmiotu;
- wskazać współrzędne na mapie lub wpisać je ręcznie;
- dodać zdjęcie z pliku akceptowanego przez przeglądarkę.

Administrator może usunąć przedmiot tylko wtedy, gdy nie ma on historii
wypożyczeń. Operacja wymaga potwierdzenia.

## Kategorie i statusy

### Kategorie

Ekran **Kategorie** przedstawia drzewo kategorii. Można dodać kategorię główną
lub podkategorię, zmienić jej nazwę i położenie w drzewie albo ją usunąć.
System blokuje duplikat nazwy pod tym samym rodzicem, cykl w drzewie oraz
usunięcie kategorii mającej podkategorie.

### Statusy i flagi

Ekran **Statusy** rozróżnia statusy systemowe i własne. Status systemowy jest
oznaczony jako **Chroniony** i nie można go edytować ani usunąć. Własną flagę
można dodać, zmienić i usunąć.

## Delegacje i grupy

Delegację dodaje się w szczegółach wybranego przedmiotu:

1. Otwórz przedmiot.
2. W sekcji dostępu wybierz **Dodaj delegację**.
3. Wybierz użytkownika albo grupę.
4. Ustaw poziom **Edycja** lub **Zarządzanie** i zapisz.

Ekran **Delegacje** pokazuje administratorowi wszystkie delegacje. Zwykły
użytkownik widzi delegacje swoich przedmiotów oraz przyznane bezpośrednio jemu
lub jego grupom. Usunąć delegację może administrator albo opiekun przedmiotu.

Administrator na ekranie **Grupy** może tworzyć, edytować i usuwać grupy,
ustawiać domyślny poziom uprawnienia oraz dodawać i usuwać członków.

## Wypożyczenia

### Nowy wniosek

1. Otwórz **Wypożyczenia** i kliknij **Nowy wniosek**.
2. Wybierz przedmiot.
3. Wybierz tryb: **Klasyczne**, **Zaufane** albo **Asynchroniczne**.
4. Podaj planowaną datę i godzinę zwrotu.
5. Kliknij **Utwórz wniosek**.

Nowy wniosek otrzymuje stan oczekujący. Opiekun przedmiotu lub administrator
może go zatwierdzić albo odrzucić. Po zatwierdzeniu użyj **Wydaj**, a po oddaniu
przedmiotu **Zwrot**. Przy zwrocie można dodać komentarz.

W trybie asynchronicznym odbiorca może sam potwierdzić wydanie zatwierdzonej
rezerwacji. W trybie klasycznym zwrot potwierdza opiekun lub administrator. W
pozostałych trybach zwrot może również potwierdzić odbiorca.

### Wypożyczenie zewnętrzne

1. Kliknij **Wypożyczenie zewnętrzne**.
2. Wybierz przedmiot, wpisz nazwę osoby lub instytucji i termin zwrotu.
3. Kliknij **Wypożycz**.

Tę operację może wykonać administrator lub opiekun przedmiotu. Wpis od razu ma
stan wypożyczony. System blokuje równoczesne aktywne wypożyczenie tego samego
przedmiotu.

## Kody QR

### Skanowanie

1. Otwórz **Skaner QR**.
2. Wpisz kod z etykiety i kliknij **Sprawdź** albo wybierz **Skanuj kamerą**.
3. Po znalezieniu przedmiotu sprawdź nazwę, kod, lokalizację i status.
4. Jeżeli masz prawo edycji, możesz wybrać **Oznacz jako uszkodzony**.

Skanowanie kamerą wymaga zgody na dostęp do kamery oraz przeglądarki obsługującej
wykrywanie kodów QR. Zgodność z konkretnymi telefonami i przeglądarkami trzeba
potwierdzić na urządzeniach używanych w docelowym wdrożeniu.

### Druk etykiet

1. Otwórz **Druk QR**.
2. Zaznacz wybrane przedmioty albo **Zaznacz wszystkie**.
3. Wybierz mały, średni lub duży rozmiar.
4. Kliknij **Pobierz PDF**.

## Raport przeterminowanych

Ekran **Raporty** pokazuje wypożyczenia ze stanem wypożyczonym, których planowany
termin zwrotu minął. Administrator widzi wszystkie takie wpisy. Zwykły
użytkownik widzi wpisy dotyczące przedmiotów, których jest opiekunem. Raport
można pobrać jako CSV lub PDF.

## Powiadomienia

Ekran **Powiadomienia** pokazuje zdarzenia dostępne w aplikacji. Można ustawić
wyprzedzenie przypomnienia o zwrocie od 1 do 720 godzin. System zapisuje też
powiadomienie po zatwierdzeniu wypożyczenia.

Kanały email i push nie są dostępne.

## Funkcje administratora

### Użytkownicy

Na ekranie **Użytkownicy** administrator może:

- zatwierdzić konto oczekujące;
- odrzucić konto po potwierdzeniu;
- nadać lub odebrać rolę administratora innemu użytkownikowi.

Administrator nie może odrzucić własnego konta ani zmienić własnej roli z tego
ekranu.

### Import z arkusza

1. Otwórz **Import Excel**.
2. Wybierz plik `.xlsx`.
3. Sprawdź mapowanie kolumn: `name`, `manufacturer`, `description`,
   `purchase_date`, `category_id`, `status_id`, `location_id`, `owner_id`.
4. Dopasuj nazwy do kolumn w swoim arkuszu.
5. Kliknij **Importuj**.
6. Sprawdź liczbę przetworzonych i zaimportowanych wierszy oraz błędy z numerami
   wierszy.

Import rzeczywistego pliku do docelowej instalacji jest **Unknown / needs
confirmation**. Przed dużym importem zacznij od kopii arkusza z kilkoma
wierszami i sprawdź raport.

### Logi audytu

Ekran **Logi audytu** pokazuje datę, użytkownika, przedmiot, rodzaj operacji oraz
wartości przed i po zmianie. Dostęp ma tylko administrator.

## Wylogowanie i problemy

Kliknij **Wyloguj** w lewym dolnym rogu. Gdy operacja się nie powiedzie:

1. Przeczytaj komunikat wyświetlony nad formularzem lub tabelą.
2. Sprawdź, czy konto jest aktywne i zatwierdzone.
3. Sprawdź, czy jesteś opiekunem przedmiotu albo masz właściwą delegację.
4. Przy skanowaniu sprawdź zgodę na kamerę; kod można też wpisać ręcznie.
5. Przy imporcie popraw wiersze wskazane w raporcie.
6. Jeżeli Dashboard pokazuje **Błąd** lub **Nieznany** dla bazy danych,
   skontaktuj się z administratorem.

## Zakres weryfikacji

Potwierdzono na aktualnej gałęzi Docker-first:

- typowanie TypeScript (`pnpm run check`);
- lint i formatowanie (`pnpm run lint`, `pnpm run format:check`);
- 21 testów logiki i 34 testy klienta (`pnpm test`);
- produkcyjny build SPA (`pnpm run build`);
- build alternatywnego Workera (`pnpm run build:worker`);
- aktualność typów Workera (`pnpm run types:worker:check`);
- walidator konfiguracji Docker z nie-placeholderowymi sekretami.

Nie potwierdzono na docelowym środowisku produkcyjnym:

- adresu i dostępności wdrożenia;
- produkcyjnego logowania Google;
- dostarczenia emaili lub push, ponieważ te kanały są wyłączone;
- pracy kamery na konkretnych urządzeniach;
- rzeczywistego importu `.xlsx`, backupu/restore i przechowywania zdjęć na
  docelowych wolumenach;
- danych pracowników z zewnętrznej bazy; bez tabel referencyjnych API zwraca
  kontrolowany błąd niedostępności.
