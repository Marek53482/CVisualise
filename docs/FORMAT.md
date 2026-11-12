# CVisualise - format pliku CV (.md)

Ten dokument to instrukcja dla AI generującego CV. **To nie jest CV do zaimportowania.** Wygeneruj osobny plik `.md` (UTF-8) zgodny z poniższym formatem. Nie otaczaj pliku blokiem kodu, nie dopisuj komentarzy ani instrukcji poza treścią CV.

## Pełny przykład

```markdown
---
cvisualise: 1
role: "Nazwa stanowiska z oferty"
email: "adres e-mail kandydata"
phone: "numer telefonu kandydata"
location: "miasto kandydata"
website: ""
font: "arial"
font-size: 10
line-height: 1.34
section-gap: 18
margin-x: 14
margin-top: 9
margin-bottom: 12
accent: "#173247"
---

# Imię Nazwisko kandydata

## Profil

Kilka zdań profilu zawodowego kandydata dopasowanego do oferty.

## Umiejętności

- **Obszar umiejętności:** konkretne umiejętności kandydata w tym obszarze.
- **Kolejny obszar:** konkretne umiejętności kandydata w tym obszarze.

## Doświadczenie

### Pracodawca | Stanowisko :: MM.RRRR - MM.RRRR
- Konkretne zadanie lub osiągnięcie kandydata.
- Kolejny punkt, z **pogrubieniem** ważnej informacji.

### Pracodawca | Stanowisko :: MM.RRRR - obecnie
- Konkretne zadanie lub osiągnięcie kandydata.

## Wykształcenie

### Szkoła lub uczelnia | Kierunek :: RRRR - RRRR
Wydział, stopień, specjalizacja lub inne szczegóły.

## Języki

**Język:** poziom. **Kolejny język:** poziom.

## Klauzula

Treść klauzuli o przetwarzaniu danych osobowych wymaganej w ofercie lub używanej przez kandydata.
```

## Struktura

- **Blok ustawień** na samej górze, między liniami `---`. Jedno ustawienie w wierszu: `klucz: "tekst"` albo `klucz: liczba`. Tekst zawsze w podwójnym cudzysłowie; cudzysłów w środku zapisz jako `\"`.
- **`# Imię Nazwisko`** - dokładnie jeden nagłówek pierwszego poziomu, przed sekcjami.
- **`## Nazwa sekcji`** - rozpoczyna sekcję. Nazwy, liczba i kolejność sekcji są dowolne.
- **`### Firma | Stanowisko :: data`** - wpis (praca, szkoła, projekt). Tekst przed ` :: ` jest pogrubiony po lewej, data trafia na prawą stronę tego samego wiersza. Bez ` :: ` wpis nie ma daty.
- Pod wpisem: punkty `- …` lub zwykły akapit.
- Wszystkie wartości w przykładzie są tylko opisami miejsc do wypełnienia. Zastąp je prawdziwymi danymi kandydata, a pola, których nie znasz, zostaw puste (`""`) albo pomiń.

## Sekcje specjalne (rozpoznawane po nazwie)

| Nazwa sekcji | Zachowanie |
| --- | --- |
| `Profil`, `Profil zawodowy`, `O mnie`, `Summary`, `Profile` | Bez widocznego nagłówka - tekst stoi tuż pod danymi kontaktowymi. |
| `Doświadczenie…`, `Experience…` | Ciaśniejsze odstępy między punktami. |
| `Umiejętności…`, `Kompetencje…`, `Skills…` | Etykieta przed dwukropkiem na początku punktu jest pogrubiona. |
| `Języki…`, `Languages…` | Tekst o 10% mniejszy; nazwy języków przed dwukropkiem pogrubione. |
| `Klauzula`, `Zgoda`, `RODO`, `Consent` | Stopka małą czcionką z cienką linią, bez nagłówka. Umieść jako ostatnią sekcję. |

## Formatowanie tekstu

- `**pogrubienie**`, `*kursywa*`, `` `kod` ``.
- Link: `[Tekst](https://example.com)` - dozwolone `https://`, `http://`, `mailto:`, `tel:`.
- Punkt listy: `- tekst` (jeden wiersz źródła na punkt, bez zagnieżdżeń). Lista numerowana: `1. tekst`.
- Pusta linia rozdziela akapity; pojedynczy koniec wiersza daje nową linię w CV.
- Cytat: `> tekst`. Pozioma linia: `---` (poza blokiem ustawień).
- Ręczny podział strony: `<!-- pagebreak -->` w osobnym wierszu (zwykle niepotrzebny).
- Nie używaj HTML, tabel, obrazów, bloków kodu ani nagłówków `####`.

## Ustawienia

Wszystkie ustawienia są opcjonalne - brakujące przyjmą wartości domyślne. Jeśli użytkownik załączył swoje poprzednie CV w tym formacie, **skopiuj z niego ustawienia wyglądu (`font`, `font-size`, `line-height`, `section-gap`, `margin-*`, `accent`) i dane kontaktowe**, aby kolejne CV wyglądały spójnie. Wartość `role` zawsze ustaw na nowo według oferty.

| Klucz | Znaczenie | Domyślnie / zakres |
| --- | --- | --- |
| `cvisualise` | Wersja formatu (`cv-studio` też działa) | `1` |
| `role` | Stanowisko pod nazwiskiem - wpisz nazwę stanowiska z oferty, na którą jest CV | `""` |
| `email`, `phone`, `location`, `website` | Dane kontaktowe w nagłówku; puste są pomijane | `""` |
| `font` | Krój pisma | `"arial"`; także `"helvetica"`, `"verdana"`, `"georgia"` |
| `font-size` | Wielkość tekstu w pt | `10`; 9-12 |
| `line-height` | Interlinia | `1.34`; 1.15-1.65 |
| `section-gap` | Odstęp nad sekcją w px | `18`; 6-22 |
| `margin-x` | Margines lewy i prawy w mm | `14`; 8-24 |
| `margin-top` | Margines górny w mm | `9`; 6-24 |
| `margin-bottom` | Margines dolny w mm | `12`; 6-24 |
| `accent` | Kolor nazwiska i nagłówków | `"#173247"`; sześć cyfr hex |

## Zasady treści

- W `role` wpisz nazwę stanowiska z oferty, na którą przygotowujesz CV (np. tak, jak brzmi w ogłoszeniu). Nie kopiuj stanowiska z poprzedniego CV.
- Dopasuj profil, kolejność umiejętności i akcenty w doświadczeniu do konkretnej oferty, ale **nie wymyślaj** faktów, dat, firm, wyników, certyfikatów ani linków. Używaj wyłącznie danych kandydata.
- **Nigdy nie używaj długiej pauzy „—” ani półpauzy „–”.** W całym pliku stosuj wyłącznie krótki łącznik `-`, także w zakresach dat (`01.2023 - 06.2024`) i wtrąceniach (`C1 - swobodna komunikacja`). Jeśli zdanie wymagałoby pauzy, użyj łącznika z odstępami ` - `, przecinka albo podziel je na dwa zdania.
- Pisz konkretnie, bez zaimków i ogólników - najlepiej zaczynając punkty od rzeczownika lub czasownika opisującego działanie („Prowadzenie…”, „Przygotowanie…”).
- Pisz w języku oferty. Nazwy sekcji też w tym języku (rozpoznawane są nazwy polskie i angielskie z tabeli powyżej).
- Celem jest jedna czytelna strona A4: zwykle 4-7 sekcji, 1-4 punkty na wpis, profil do ok. 5 zdań.
- Daty wyłącznie z danych kandydata, w formacie `MM.RRRR` lub `RRRR`; zakres przez ` - `, trwające: `obecnie` (lub `present` w CV angielskim). Jeśli daty nie ma w danych, pomiń ` :: data` zamiast ją zgadywać.
- Klauzula RODO jako ostatnia sekcja, jeśli oferta jej wymaga lub kandydat jej używa.

## Polecenie dla AI

> Przygotuj CV pod poniższą ofertę jako plik .md zgodny z formatem CVisualise (załączony FORMAT.md). Korzystaj wyłącznie z moich danych. Nie używaj długich pauz „—”, tylko krótkiego łącznika „-”. Jako `role` wpisz stanowisko z oferty. Jeśli załączam swoje poprzednie CV, skopiuj z niego ustawienia wyglądu i dane kontaktowe. Zwróć tylko zawartość pliku .md.
