#!/bin/sh
#reset bazy danych ( usuwa WSZYSTKIE dane z bazy)
set -e

echo "To polecenie usunie wszystkie dane z bazy."
printf "wpisz 'tak' aby kontynuować: "
read confirm

if [ "$confirm" != "tak" ]; then
  echo "anulowano usuwanie"
  exit 0
fi

docker compose down -v
docker compose up -d db
sleep 5
docker compose run --rm backend alembic upgrade head
echo "baza zresetowana"