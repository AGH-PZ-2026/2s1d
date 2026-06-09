import { expect, test, type Page, type Route } from '@playwright/test';

const user = {
  id: 1,
  email: 'pracownik@agh.edu.pl',
  role: 'admin',
  is_active: true,
  is_approved: true,
};

const categories = [
  {
    id: 1,
    name: 'Urządzenia',
    parent_id: null,
    description: 'Sprzęt uczelni',
  },
  {
    id: 2,
    name: 'Pomiarowe',
    parent_id: 1,
    description: 'Urządzenia pomiarowe',
  },
  {
    id: 3,
    name: 'Oscyloskopy',
    parent_id: 2,
    description: 'Dowolny poziom zagłębienia',
  },
];

const statuses = [
  { id: 1, name: 'Dostępny', is_system: true },
  { id: 2, name: 'Wypożyczony', is_system: true },
  { id: 3, name: 'Zarezerwowany', is_system: true },
  { id: 4, name: 'Uszkodzony', is_system: true },
  { id: 5, name: 'Oczekuje zatwierdzenia', is_system: true },
  { id: 6, name: 'Zaginiony', is_system: false },
];

const locations = [
  {
    id: 1,
    name: 'D-17 / 101 / Szafa A / Półka 2',
    kind: 'internal',
    building: 'D-17',
    room: '101',
    cabinet: 'Szafa A',
    shelf: 'Półka 2',
    mapX: 35,
    mapY: 45,
  },
  {
    id: 2,
    name: 'Delegacja CERN',
    kind: 'external',
    building: 'CERN',
    room: null,
    cabinet: null,
    shelf: null,
    mapX: null,
    mapY: null,
  },
];

const owners = [
  { id: 1, email: 'opiekun@agh.edu.pl' },
  { id: 2, email: 'laborant@agh.edu.pl' },
];

const groups = [
  { id: 1, name: 'Laboratorium elektroniki' },
  { id: 2, name: 'Zespół aparatury pomiarowej' },
];

const items = [
  {
    id: 1,
    systemId: 'ITEM-AGH-0001',
    name: 'Oscyloskop Tektronix TBS1102',
    manufacturer: 'Tektronix',
    description: 'Oscyloskop laboratoryjny 100MHz',
    purchaseDate: '2024-03-15',
    categoryId: 3,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 2,
    systemId: 'ITEM-AGH-0002',
    name: 'Multimetr UNI-T UT61E',
    manufacturer: 'UNI-T',
    description: 'Cyfrowy multimetr laboratoryjny',
    purchaseDate: '2023-11-08',
    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },
  {
    id: 3,
    systemId: 'ITEM-AGH-0003',
    name: 'Analizator widma Rigol',
    manufacturer: 'Rigol',
    description: 'Analizator do ćwiczeń laboratoryjnych',
    purchaseDate: '2025-01-10',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 4,
    systemId: 'ITEM-AGH-0004',
    name: 'Kamera termowizyjna FLIR',
    manufacturer: 'FLIR',
    description: 'Kamera do diagnostyki układów',
    purchaseDate: '2025-02-12',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 5,
    systemId: 'ITEM-AGH-0005',
    name: 'Zasilacz laboratoryjny Korad',
    manufacturer: 'Korad',
    description: 'Zasilacz programowalny',
    purchaseDate: '2025-03-14',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 2,
  },
  {
    id: 6,
    systemId: 'ITEM-AGH-0006',
    name: 'Czujnik temperatury Pt100',
    manufacturer: 'AGH',
    description: 'Czujnik do stanowisk studenckich',
    purchaseDate: '2025-04-16',
    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },
];

const borrowings = [
  {
    id: 1,
    itemId: 1,
    borrowerId: 2,
    externalBorrower: null,
    mode: 'classic',
    status: 'pending',
    plannedReturnAt: '2026-06-16T12:00:00.000Z',
    approvedAt: null,
    handedOverAt: null,
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-01T07:30:00.000Z',
  },
  {
    id: 2,
    itemId: 2,
    borrowerId: 1,
    externalBorrower: null,
    mode: 'trusted',
    status: 'borrowed',
    plannedReturnAt: '2026-05-01T12:00:00.000Z',
    approvedAt: '2026-04-01T08:00:00.000Z',
    handedOverAt: '2026-04-01T09:00:00.000Z',
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-04-01T07:30:00.000Z',
  },
  {
    id: 3,
    itemId: 1,
    borrowerId: 1,
    externalBorrower: null,
    mode: 'asynchronous',
    status: 'reserved',
    plannedReturnAt: '2026-07-01T12:00:00.000Z',
    approvedAt: '2026-06-01T08:00:00.000Z',
    handedOverAt: null,
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-01T07:30:00.000Z',
  },
];

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.addInitScript((sessionUser) => {
    window.localStorage.setItem('access_token', 'e2e-token');
    window.localStorage.setItem('auth_user', JSON.stringify(sessionUser));
  }, user);
});

test('US role i dostęp: niezalogowany użytkownik nie widzi zasobów, rejestracja wymaga zatwierdzenia, a mock SSO nadaje rolę', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/items');

  await expect(page.getByText('Wymagane logowanie')).toBeVisible();
  await page.getByRole('link', { name: /Przejdź do logowania/ }).click();
  await expect(page.getByRole('heading', { name: /Logowanie/ })).toBeVisible();

  await page.locator('#register-email').fill('nowy.pracownik@agh.edu.pl');
  await page.locator('#register-password').fill('bezpieczne-haslo');
  await page.getByRole('button', { name: 'Zarejestruj' }).click();
  await expect(
    page.getByText('Konto wymaga zatwierdzenia przez administratora')
  ).toBeVisible();

  await page.locator('#mock-email').fill('admin@agh.edu.pl');
  await page.getByLabel('Rola').selectOption('admin');
  await page.getByRole('button', { name: 'Zaloguj' }).click();

  await expect(
    page.getByRole('main').getByText('admin@agh.edu.pl')
  ).toBeVisible();
  await expect(page.locator('dd', { hasText: 'Administrator' })).toBeVisible();
});

test('US-01 kategorie i statusy: drzewo, CRUD kategorii oraz własne i bazowe statusy', async ({
  page,
}) => {
  await page.goto('/categories');

  await expect(page.getByText('Urządzenia')).toBeVisible();
  await page.getByTitle('Rozwiń').click();
  await expect(page.getByText('Pomiarowe', { exact: true })).toBeVisible();
  await page.getByTitle('Rozwiń').click();
  await expect(page.getByText('Oscyloskopy')).toBeVisible();

  await page.getByRole('button', { name: '+ Nowa kategoria główna' }).click();
  await page.getByPlaceholder('Wprowadź nazwę kategorii').fill('Kable');
  await page.getByPlaceholder('Opcjonalny opis kategorii').fill('Akcesoria');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByText('Kable')).toBeVisible();

  await page.goto('/statuses');
  for (const name of [
    'Dostępny',
    'Wypożyczony',
    'Zarezerwowany',
    'Uszkodzony',
    'Oczekuje zatwierdzenia',
    'Zaginiony',
  ]) {
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '+ Dodaj flagę' }).click();
  await page.getByPlaceholder('np. Do utylizacji').fill('W kalibracji');
  await page.locator('.modal').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByText('W kalibracji')).toBeVisible();

  await page.goto('/categories');
  await page.getByTitle('Edytuj').first().click();
  await page.locator('#category-name').fill('Urządzenia laboratoryjne');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Urządzenia laboratoryjne')).toBeVisible();

  await page.getByTitle('Usuń').first().click();
  await page
    .getByRole('button', { name: 'Usuń kategorię i jej podkategorie' })
    .click();
  await expect(page.getByText('Urządzenia laboratoryjne')).toHaveCount(0);
});

test('US-02/03/05 przedmioty: dodawanie, identyfikacja, klasyfikacja, mapa lokalizacji i zdjęcia', async ({
  page,
}) => {
  await page.goto('/items');

  await expect(
    page.getByRole('cell', { name: 'Oscyloskop Tektronix TBS1102' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Tektronix' }).first()
  ).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Oscyloskopy' })).toBeVisible();
  await page.getByRole('row', { name: /Oscyloskop Tektronix/ }).click();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'D-17 / 101 / Szafa A / Półka 2'
  );

  await page.getByLabel('Zmień lokalizację').selectOption('2');
  await expect(
    page.getByText('Lokalizacja przedmiotu została zaktualizowana.')
  ).toBeVisible();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'Delegacja CERN'
  );

  await page.getByLabel('Zmień lokalizację').selectOption('1');
  await page.getByLabel('Nowy punkt na mapie').fill('D-17 / 102 / Szafa B');
  await page.getByLabel('Budynek').fill('D-17');
  await page.getByLabel('Pokój').fill('102');
  await page.getByLabel('Szafa').fill('Szafa B');
  await page.getByLabel('Półka').fill('Półka 1');
  await page.getByLabel('mapX').fill('72');
  await page.getByLabel('mapY').fill('64');
  await page.getByRole('button', { name: 'Dodaj punkt i przypisz' }).click();
  await expect(
    page.getByText('Nowy punkt lokalizacji został dodany i przypisany.')
  ).toBeVisible();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'D-17 / 102 / Szafa B'
  );

  await expect(page.getByText(/Strona 1 z 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Następna' }).click();
  await expect(
    page.getByRole('cell', { name: 'Zasilacz laboratoryjny Korad' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Poprzednia' }).click();

  await page.getByRole('button', { name: /Producent/ }).click();
  await expect(
    page.getByRole('cell', { name: 'AGH', exact: true })
  ).toBeVisible();

  await page.getByLabel('Producent').fill('Tektronix');
  await expect(
    page.getByRole('cell', { name: 'Oscyloskop Tektronix TBS1102' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Multimetr UNI-T UT61E' })
  ).toHaveCount(0);

  await page.getByLabel('Producent').fill('');
  await page.getByLabel('Status').selectOption('2');
  await expect(
    page.getByRole('cell', { name: 'Wypożyczony' }).first()
  ).toBeVisible();
  await page.getByLabel('Status').selectOption('');

  await page.getByRole('button', { name: '+ Dodaj przedmiot' }).click();
  await page.getByPlaceholder('np. Laptop Dell').fill('Generator funkcyjny');
  await page.getByPlaceholder('np. Dell').fill('Rigol');
  await page.getByPlaceholder('Opcjonalny opis').fill('Generator do zajęć');
  await page.locator('.modal select').nth(0).selectOption('3');
  await page.locator('.modal select').nth(1).selectOption('1');
  await page.locator('.modal select').nth(2).selectOption('1');
  await page.locator('.modal select').nth(3).selectOption('1');
  await page.locator('.modal select').nth(4).selectOption('1');
  await page
    .locator('.modal')
    .getByRole('button', { name: 'Utwórz' })
    .evaluate((button) => (button as HTMLButtonElement).click());

  await expect(
    page.getByText('Przedmiot został dodany pomyślnie.')
  ).toBeVisible();
  await expect(page.getByText('Generator funkcyjny')).toBeVisible();
  await expect(page.getByText('Grupa: Laboratorium elektroniki')).toBeVisible();

  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles({
    name: 'stan-techniczny.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake image'),
  });
  await expect(page.getByText('stan-techniczny.png')).toBeVisible();
});

test('US-03/04 QR: skan pokazuje szczegóły, lokalizację i szybką zmianę statusu na uszkodzony', async ({
  page,
}) => {
  await page.goto('/qr');

  await page.getByLabel('Kod QR').fill('ITEM-AGH-0001');
  await page.getByRole('button', { name: 'Sprawdź' }).click();

  await expect(page.getByText('Oscyloskop Tektronix TBS1102')).toBeVisible();
  await expect(page.getByText('D-17 / 101 / Szafa A / Półka 2')).toBeVisible();
  await expect(page.getByText('Dostępny')).toBeVisible();

  await page.getByRole('button', { name: 'Oznacz jako uszkodzony' }).click();
  await expect(page.getByText('Uszkodzony')).toBeVisible();

  await page.getByLabel('Kod QR').fill('LEGACY-AGH-42');
  await page.getByRole('button', { name: 'Sprawdź' }).click();
  await expect(page.getByText('Multimetr UNI-T UT61E')).toBeVisible();
  await expect(page.getByText('Delegacja CERN')).toBeVisible();

  await page.getByRole('button', { name: 'Skanuj kamerą' }).click();
  await expect(
    page.getByText('Ta przeglądarka nie udostępnia skanowania kodów QR.')
  ).toBeVisible();
});

test('US wypożyczenia: klasyczne, zaufane, asynchroniczne, zewnętrzne i komentarz zwrotu', async ({
  page,
}) => {
  await page.goto('/borrowings');

  await expect(page.getByText('Klasyczne')).toBeVisible();
  await expect(page.getByText('Zaufane')).toBeVisible();
  await expect(page.getByText('Asynchroniczne')).toBeVisible();

  await page.getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(
    page.getByText('Status wypożyczenia został zaktualizowany.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Wydaj' }).first().click();
  await expect(
    page.getByText('Status wypożyczenia został zaktualizowany.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Nowy wniosek' }).click();
  await page.locator('.modal select').nth(1).selectOption('asynchronous');
  await page.getByRole('button', { name: 'Utwórz wniosek' }).click();
  await expect(
    page.getByText('Wniosek o wypożyczenie został utworzony.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Wypożyczenie zewnętrzne' }).click();
  await page.getByPlaceholder('Nazwa osoby lub instytucji').fill('CERN');
  await page.getByRole('button', { name: 'Wypożycz', exact: true }).click();
  await expect(
    page.getByText('Wypożyczenie zewnętrzne zostało utworzone.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Zwrot' }).first().click();
  await page
    .getByPlaceholder('np. Bez uszkodzeń')
    .fill('Widoczne pęknięcie obudowy');
  await page.getByRole('button', { name: 'Potwierdź zwrot' }).click();
  await expect(page.getByText('Wypożyczenie zostało zwrócone.')).toBeVisible();
});

test('US delegacje: właściciel dodaje delegata z poziomem edycji lub zarządzania', async ({
  page,
}) => {
  await page.goto('/delegations');

  await page.getByRole('button', { name: '+ Dodaj delegata' }).click();
  await page.getByPlaceholder('np. 1').first().fill('2');
  await page.locator('.modal select').selectOption('manage');
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click();

  await expect(page.getByText('Użytkownik #2')).toBeVisible();
  await expect(page.getByText('Zarządzanie')).toBeVisible();
});

test('US audit log: administrator widzi datę, użytkownika, rodzaj operacji oraz wartości przed i po', async ({
  page,
}) => {
  await page.goto('/audit-logs');

  await expect(
    page.getByRole('heading', { name: 'Logi audytu' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: /Użytkownik #1/ }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: /Przedmiot #1/ }).first()
  ).toBeVisible();

  for (const action of [
    'Utworzenie przedmiotu',
    'Zmiana statusu',
    'Dodanie zdjęcia',
    'Zmiana delegatów',
    'Zwrot przedmiotu',
  ]) {
    await expect(page.getByText(action)).toBeVisible();
  }

  await expect(page.getByText('{"status":"Dostępny"}').first()).toBeVisible();
  await expect(page.getByText('{"status":"Uszkodzony"}')).toBeVisible();
  await expect(page.getByText('{"permission":"manage"}')).toBeVisible();
});

test('US narzędzia: raporty, import, druk QR i powiadomienia', async ({
  page,
}) => {
  await page.goto('/reports/overdue');
  await expect(page.getByText('Multimetr UNI-T UT61E')).toBeVisible();
  await page
    .getByLabel('Pokaż wszystkie przedmioty jako administrator')
    .check();
  await expect(page.getByText('Oscyloskop Tektronix TBS1102')).toBeVisible();
  await page.getByRole('button', { name: 'Pobierz CSV' }).click();
  await page.getByRole('button', { name: 'Pobierz PDF' }).click();

  await page.goto('/import');
  await page
    .locator('label')
    .filter({ hasText: 'manufacturer' })
    .getByRole('textbox')
    .fill('producer_column');
  await page.getByLabel('Plik .xlsx').setInputFiles({
    name: 'import.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('xlsx'),
  });
  await page.getByRole('button', { name: 'Importuj' }).click();
  await expect(page.getByText('Przetworzone wiersze')).toBeVisible();
  await expect(page.getByText('Brak kategorii w wierszu 3')).toBeVisible();

  await page.goto('/batch-qr');
  await page
    .getByRole('row', { name: /Oscyloskop/ })
    .getByRole('checkbox')
    .check();
  await page
    .getByRole('row', { name: /Multimetr/ })
    .getByRole('checkbox')
    .check();
  await page.getByRole('combobox').selectOption('large');
  await page.getByRole('button', { name: 'Pobierz PDF' }).click();
  await expect(page.getByRole('button', { name: 'Pobierz PDF' })).toBeEnabled();

  await page.goto('/notifications');
  await page.getByLabel('Push').check();
  await page.getByLabel('Godziny przed terminem zwrotu').fill('24');
  await page.getByRole('button', { name: 'Zapisz preferencje' }).click();
  await expect(
    page.getByText('Preferencje powiadomień zostały zapisane.')
  ).toBeVisible();
  await expect(page.getByText('accepted')).toBeVisible();
  await expect(page.getByText('return_due')).toBeVisible();
});

async function mockApi(page: Page) {
  let currentCategories = [...categories];
  let currentStatuses = [...statuses];
  let currentItems = [...items];
  let currentLocations = [...locations];
  let currentBorrowings = [...borrowings];
  let currentDelegations = [
    { id: 1, user_id: 1, group_id: null, permission: 'edit' },
  ];
  let photos = [
    {
      id: 1,
      itemId: 1,
      originalFilename: 'odbior.jpg',
      contentType: 'image/jpeg',
      addedAt: '2026-06-01T10:00:00.000Z',
      uploadedById: 1,
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/auth/mock-sso' && method === 'POST') {
      const body = request.postDataJSON() as { email: string; role: string };
      return json(route, {
        access_token: 'e2e-token',
        token_type: 'bearer',
        user: { ...user, email: body.email, role: body.role },
      });
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      const body = request.postDataJSON() as { email: string };
      return json(route, {
        id: 99,
        email: body.email,
        is_active: false,
        is_approved: false,
        role: 'user',
      });
    }

    if (path === '/api/v1/categories/' && method === 'GET') {
      return json(route, currentCategories);
    }
    if (path === '/api/v1/categories/' && method === 'POST') {
      const body = request.postDataJSON() as {
        name: string;
        description?: string;
      };
      const created = {
        id: currentCategories.length + 10,
        name: body.name,
        parent_id: body.parentId ?? null,
        description: body.description,
      };
      currentCategories = [...currentCategories, created];
      return json(route, created);
    }
    if (path.match(/\/api\/v1\/categories\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').at(-1));
      const body = request.postDataJSON() as {
        name?: string;
        description?: string;
      };
      const current = currentCategories.find((category) => category.id === id);
      const updated = { ...current!, ...body };
      currentCategories = currentCategories.map((category) =>
        category.id === id ? updated : category
      );
      return json(route, updated);
    }
    if (path.match(/\/api\/v1\/categories\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').at(-1));
      currentCategories = currentCategories.filter(
        (category) => category.id !== id && category.parent_id !== id
      );
      return route.fulfill({ status: 204 });
    }

    if (path === '/api/v1/item-status/' && method === 'GET') {
      return json(route, currentStatuses);
    }
    if (path === '/api/v1/item-status/' && method === 'POST') {
      const body = request.postDataJSON() as { name: string };
      const created = {
        id: currentStatuses.length + 10,
        name: body.name,
        is_system: false,
      };
      currentStatuses = [...currentStatuses, created];
      return json(route, created);
    }

    if (path === '/api/v1/items/' && method === 'GET') {
      return json(route, currentItems);
    }
    if (path === '/api/v1/items/' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentItems.length + 10,
        systemId: `ITEM-AGH-${currentItems.length + 1}`,
        ...body,
      };
      currentItems = [
        ...currentItems,
        created as (typeof currentItems)[number],
      ];
      return json(route, created);
    }
    if (path === '/api/v1/locations/' && method === 'GET') {
      return json(route, currentLocations);
    }
    if (path === '/api/v1/locations/' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentLocations.length + 10,
        ...body,
      };
      currentLocations = [
        ...currentLocations,
        created as (typeof currentLocations)[number],
      ];
      return json(route, created);
    }
    if (path.match(/\/api\/v1\/items\/\d+\/location/) && method === 'PATCH') {
      const itemId = Number(path.split('/').at(-2));
      const locationId = Number(url.searchParams.get('locationId'));
      currentItems = currentItems.map((item) =>
        item.id === itemId ? { ...item, locationId } : item
      );
      return json(route, { message: 'Location updated' });
    }
    if (path === '/api/v1/auth/users' && method === 'GET') {
      return json(route, owners);
    }
    if (path === '/api/v1/groups/' && method === 'GET') {
      return json(route, groups);
    }

    if (path.match(/\/api\/v1\/items\/\d+\/photos\/$/) && method === 'GET') {
      return json(route, photos);
    }
    if (path.match(/\/api\/v1\/items\/\d+\/photos\/$/) && method === 'POST') {
      const created = {
        id: photos.length + 1,
        itemId: 1,
        originalFilename: 'stan-techniczny.png',
        contentType: 'image/png',
        addedAt: '2026-06-09T10:00:00.000Z',
        uploadedById: 1,
      };
      photos = [...photos, created];
      return json(route, created);
    }

    if (path === '/api/v1/qr-codes/scan/ITEM-AGH-0001') {
      return json(route, {
        id: 1,
        system_id: 'ITEM-AGH-0001',
        name: 'Oscyloskop Tektronix TBS1102',
        description: 'Oscyloskop laboratoryjny 100MHz',
        qr_data: 'ITEM-AGH-0001',
      });
    }
    if (path === '/api/v1/qr-codes/scan/LEGACY-AGH-42') {
      return json(route, {
        id: 2,
        system_id: 'ITEM-AGH-0002',
        name: 'Multimetr UNI-T UT61E',
        description: 'Cyfrowy multimetr laboratoryjny',
        qr_data: 'LEGACY-AGH-42',
      });
    }
    if (path === '/api/v1/quick-actions/1' && method === 'GET') {
      return json(route, {
        id: 1,
        name: 'Oscyloskop Tektronix TBS1102',
        location: 'D-17 / 101 / Szafa A / Półka 2',
        owner_id: 1,
        status: 'Dostępny',
      });
    }
    if (path === '/api/v1/quick-actions/2' && method === 'GET') {
      return json(route, {
        id: 2,
        name: 'Multimetr UNI-T UT61E',
        location: 'Delegacja CERN',
        owner_id: 2,
        status: 'Wypożyczony',
      });
    }
    if (path === '/api/v1/quick-actions/1/mark-damaged') {
      return json(route, {
        id: 1,
        name: 'Oscyloskop Tektronix TBS1102',
        location: 'D-17 / 101 / Szafa A / Półka 2',
        owner_id: 1,
        status: 'Uszkodzony',
      });
    }

    if (path === '/api/v1/borrowings/' && method === 'GET') {
      return json(route, currentBorrowings);
    }
    if (path === '/api/v1/borrowings/requests' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentBorrowings.length + 10,
        borrowerId: 1,
        externalBorrower: null,
        status: 'pending',
        approvedAt: null,
        handedOverAt: null,
        returnedAt: null,
        returnComment: null,
        createdAt: '2026-06-09T10:00:00.000Z',
        ...body,
      };
      currentBorrowings = [
        created as (typeof currentBorrowings)[number],
        ...currentBorrowings,
      ];
      return json(route, created);
    }
    if (path === '/api/v1/borrowings/external' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentBorrowings.length + 10,
        borrowerId: null,
        mode: 'external',
        status: 'borrowed',
        approvedAt: '2026-06-09T10:00:00.000Z',
        handedOverAt: '2026-06-09T10:00:00.000Z',
        returnedAt: null,
        returnComment: null,
        createdAt: '2026-06-09T10:00:00.000Z',
        ...body,
      };
      currentBorrowings = [
        created as (typeof currentBorrowings)[number],
        ...currentBorrowings,
      ];
      return json(route, created);
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/approve/)) {
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === 1 ? { ...item, status: 'reserved' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === 1)
      );
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/handover/)) {
      const id = Number(path.split('/').at(-2));
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === id ? { ...item, status: 'borrowed' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === id)
      );
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/reject/)) {
      return json(route, {});
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/return/)) {
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === 2 ? { ...item, status: 'returned' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === 2)
      );
    }

    if (path === '/api/v1/items/1/delegations/' && method === 'GET') {
      return json(route, currentDelegations);
    }
    if (path === '/api/v1/items/1/delegations/' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = { id: currentDelegations.length + 1, ...body };
      currentDelegations = [
        ...currentDelegations,
        created as (typeof currentDelegations)[number],
      ];
      return json(route, created);
    }

    if (path === '/api/v1/borrowings/overdue') {
      const includeAll = url.searchParams.get('includeAll') === 'true';
      return json(route, [
        {
          borrowingId: 2,
          itemName: 'Multimetr UNI-T UT61E',
          borrowerId: 1,
          externalBorrower: null,
          plannedReturnAt: '2026-05-01T12:00:00.000Z',
          daysOverdue: 39,
        },
        ...(includeAll
          ? [
              {
                borrowingId: 4,
                itemName: 'Oscyloskop Tektronix TBS1102',
                borrowerId: 2,
                externalBorrower: null,
                plannedReturnAt: '2026-04-01T12:00:00.000Z',
                daysOverdue: 69,
              },
            ]
          : []),
      ]);
    }
    if (
      path === '/api/v1/borrowings/overdue.csv' ||
      path === '/api/v1/borrowings/overdue.pdf'
    ) {
      return route.fulfill({
        status: 200,
        contentType: path.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        body: path.endsWith('.pdf')
          ? Buffer.from('%PDF overdue')
          : 'borrowingId,itemName\n2,Multimetr UNI-T UT61E\n',
      });
    }

    if (path === '/api/v1/excel/upload' && method === 'POST') {
      return json(route, {
        total_rows_processed: 3,
        successful_rows: 2,
        errors: [
          { row_number: 3, error_message: 'Brak kategorii w wierszu 3' },
        ],
      });
    }

    if (path === '/api/v1/batch-qr/print' && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF e2e'),
      });
    }

    if (path === '/api/v1/notifications/preferences' && method === 'GET') {
      return json(route, {
        emailEnabled: true,
        pushEnabled: false,
        returnDueNoticeHours: 48,
      });
    }
    if (path === '/api/v1/notifications/preferences' && method === 'PUT') {
      return json(route, request.postDataJSON());
    }
    if (path === '/api/v1/notifications/events' && method === 'GET') {
      return json(route, [
        {
          id: 1,
          eventType: 'accepted',
          channel: 'email',
          payload: 'Wniosek o wypożyczenie zaakceptowany',
          scheduledAt: '2026-06-10T08:00:00.000Z',
          sentAt: null,
        },
        {
          id: 2,
          eventType: 'return_due',
          channel: 'push',
          payload: 'Termin zwrotu za 24 godziny',
          scheduledAt: '2026-06-15T12:00:00.000Z',
          sentAt: null,
        },
      ]);
    }

    if (path === '/api/v1/audit-logs/' && method === 'GET') {
      return json(route, [
        {
          id: 1,
          user_id: 1,
          item_id: 1,
          action: 'ITEM_CREATED',
          old_value: null,
          new_value: { name: 'Oscyloskop Tektronix TBS1102' },
          timestamp: '2026-06-01T08:00:00.000Z',
        },
        {
          id: 2,
          user_id: 1,
          item_id: 1,
          action: 'STATUS_CHANGED',
          old_value: { status: 'Dostępny' },
          new_value: { status: 'Uszkodzony' },
          timestamp: '2026-06-02T09:00:00.000Z',
        },
        {
          id: 3,
          user_id: 2,
          item_id: 1,
          action: 'PHOTO_ADDED',
          old_value: null,
          new_value: { filename: 'stan-techniczny.png' },
          timestamp: '2026-06-03T10:00:00.000Z',
        },
        {
          id: 4,
          user_id: 1,
          item_id: 1,
          action: 'DELEGATES_CHANGED',
          old_value: null,
          new_value: { permission: 'manage' },
          timestamp: '2026-06-04T11:00:00.000Z',
        },
        {
          id: 5,
          user_id: 1,
          item_id: 2,
          action: 'BORROWING_RETURNED',
          old_value: { status: 'Wypożyczony' },
          new_value: { status: 'Dostępny' },
          timestamp: '2026-06-05T12:00:00.000Z',
        },
      ]);
    }

    return route.fulfill({
      status: 404,
      body: `No e2e mock for ${method} ${path}`,
    });
  });
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
