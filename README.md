# CVisualise

Aplikacja webowa: plik CV w Markdown (`.md`) → eleganckie CV A4 → edycja → PDF.

Pliki `.md` pod konkretne oferty przygotowuje AI na podstawie Twoich danych i instrukcji [`docs/FORMAT.md`](docs/FORMAT.md). CVisualise je importuje, wyświetla, pozwala poprawić i eksportuje do PDF.

## Uruchomienie

Wymaga Node.js 20+.

```bash
npm install
npm run dev
```

Aplikacja działa pod adresem http://localhost:5173. Wszystko dzieje się lokalnie w przeglądarce — CV nie jest nigdzie wysyłane.

Inne polecenia: `npm test` (testy parsera), `npm run build` (wersja produkcyjna w `dist/`), `npm run preview` (podgląd wersji produkcyjnej).

## Publikacja (GitHub Pages)

Każdy push na gałąź `main` uruchamia workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): testy, build i publikację folderu `dist/` na GitHub Pages. Aplikacja jest w całości statyczna, więc `dist/` można też wgrać na dowolny zwykły hosting (najlepiej z HTTPS — wymaga go kopiowanie do schowka).

## Praca z aplikacją

1. **Format dla AI** — skopiuj instrukcję formatu i wyślij ją do AI razem ze swoimi danymi i treścią oferty.
2. **Importuj .md** (⌘O) albo przeciągnij plik na okno.
3. Edytuj:
   - **Treść** — nagłówek i sekcje (zmiana kolejności, dodawanie, usuwanie). Kliknięcie fragmentu CV w podglądzie otwiera jego edycję.
   - **Wygląd** — krój pisma, kolor, wielkość tekstu, interlinia, odstępy, marginesy oraz **Dopasuj do 1 strony**.
   - **Markdown** — cały plik źródłowy; błędy są pokazywane z numerem wiersza.
4. **Zapisz .md** (⌘S) — pobiera aktualną wersję (z ustawieniami wyglądu).
5. **Eksportuj PDF** (⌘P) — okno drukowania → „Zapisz jako PDF”, marginesy *Domyślne*, skala 100%, bez nagłówków i stopek. Nazwa pliku jest proponowana automatycznie (`Imie_Nazwisko_CV_Stanowisko.pdf`). PDF zawiera prawdziwy tekst w poprawnej kolejności czytania, więc dobrze go czytają systemy ATS.
   Na telefonie PDF powstaje w samej aplikacji, bez okna drukowania (iOS dopisuje do wydruku nagłówek i stopkę, których nie da się wyłączyć): przycisk **PDF** tworzy plik, który można pobrać albo udostępnić. Tekst jest zapisywany osadzonymi czcionkami Arimo, Gelasio i Open Sans (licencja SIL OFL, `src/assets/fonts`), przyciętymi do alfabetu łacińskiego skryptem `scripts/subset-fonts.sh`.

Cofnij / ponów: przyciski w pasku lub ⌘Z / ⇧⌘Z (poza polami tekstowymi). Bieżąca wersja jest zapisywana w pamięci przeglądarki — po odświeżeniu strony wraca. Pliki `.md` są Twoją właściwą kopią.

## Format

Pełna specyfikacja: [`docs/FORMAT.md`](docs/FORMAT.md). Skrót:

```markdown
---
cvisualise: 1
role: "Stanowisko"
email: "imie@example.com"
phone: "+48 000 000 000"
location: "Miasto"
---

# Imię Nazwisko

## Profil
Tekst bez nagłówka, tuż pod kontaktem.

## Doświadczenie
### Firma | Stanowisko :: 01.2023 - obecnie
- Punkt.

## Klauzula
Stopka małą czcionką.
```

Pliki z poprzedniego CV Studio (`cv-studio: 1`) są w pełni obsługiwane.

## Struktura

- `src/lib/format.ts` — parser i zapis formatu, ustawienia, rodzaje sekcji.
- `src/lib/blocks.ts`, `src/lib/inline.tsx` — treść sekcji i formatowanie w linii (bez HTML, bezpieczne linki).
- `src/components/CvDocument.tsx` + `src/styles/cv.css` — dokument CV (ekran i druk).
- `src/components/Preview.tsx` — podgląd A4, licznik stron, dopasowanie do jednej strony.
- `src/components/*Editor.tsx` — panele Treść / Wygląd / Markdown.
- `examples/przyklad.md`, `examples/szablon.md` — przykład i pusty szablon.
