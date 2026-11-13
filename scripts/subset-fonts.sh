#!/bin/sh
# Przycięte czcionki dla generatora PDF (src/lib/pdfExport.ts): tylko alfabet łaciński z polskimi znakami
# i typowa interpunkcja. Wymaga fonttools (pip install fonttools) i pakietów @expo-google-fonts z devDependencies.
set -e
cd "$(dirname "$0")/.."
OUT=src/assets/fonts
UNICODES="U+0020-007E,U+00A0-024F,U+2010-2027,U+2030-203A,U+2044,U+20AC,U+2122,U+2190-2193,U+2212"
mkdir -p "$OUT"
for f in \
  arimo/400Regular/Arimo_400Regular arimo/700Bold/Arimo_700Bold \
  arimo/400Regular_Italic/Arimo_400Regular_Italic arimo/700Bold_Italic/Arimo_700Bold_Italic \
  gelasio/400Regular/Gelasio_400Regular gelasio/700Bold/Gelasio_700Bold \
  gelasio/400Regular_Italic/Gelasio_400Regular_Italic gelasio/700Bold_Italic/Gelasio_700Bold_Italic \
  open-sans/400Regular/OpenSans_400Regular open-sans/700Bold/OpenSans_700Bold \
  open-sans/400Regular_Italic/OpenSans_400Regular_Italic open-sans/700Bold_Italic/OpenSans_700Bold_Italic
do
  name=$(basename "$f")
  pyftsubset "node_modules/@expo-google-fonts/$f.ttf" --unicodes="$UNICODES" --layout-features='' --no-hinting \
    --output-file="$OUT/$name.ttf"
done
cp node_modules/@expo-google-fonts/arimo/LICENSE_FONT "$OUT/LICENSE-Arimo.txt"
cp node_modules/@expo-google-fonts/gelasio/LICENSE_FONT "$OUT/LICENSE-Gelasio.txt"
cp node_modules/@expo-google-fonts/open-sans/LICENSE_FONT "$OUT/LICENSE-OpenSans.txt"
