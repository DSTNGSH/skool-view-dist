# Install skool-view (Chrome / Edge / Brave)

Persoonlijke fork, lokaal gebouwd. Draait **volledig in je eigen browser** met je **eigen ingelogde
Skool-sessie** — geen centrale server, geen gedeelde credentials.

> Deze fork bouwt alleen de **Chrome**-variant (unpacked). Geen releases-pagina, geen zip-download —
> je bouwt zelf lokaal vanuit de broncode. Firefox: niet gebouwd/getest in deze fork.

## Install

1. Bouw de extensie lokaal:
   ```bash
   npm install
   npm run build:chrome
   ```
   Output komt in `dist/`.
2. Open **`chrome://extensions`** (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Zet **Developer mode** aan (schakelaar rechtsboven).
4. Klik **Load unpacked** en selecteer de `dist/`-map. Verplaats of verwijder deze map daarna niet —
   Chrome laadt de extensie er bij elke start opnieuw uit.
5. Open het puzzelstukje-menu in de toolbar en **pin** skool-view zodat de knop zichtbaar blijft.

## Use it

1. Ga naar een Skool-community waar je lid van bent.
2. Klik op de **skool-view-toolbarknop** — of druk op **`Alt+S`** — om de weergave aan/uit te zetten.

## What it can access, and why

- Alleen **`skool.com`** — draait op geen enkele andere site.
- **Je sessiecookies** — zodat het kan lezen en posten **als jou**, precies zoals de normale site.
  Niets wordt ergens anders naartoe gestuurd dan Skool's eigen servers; er is geen skool-view-server.
- **Lokale opslag** — onthoudt thema + of de weergave aanstaat.

## Updates

Unpacked extensies updaten **niet automatisch**. Bij een wijziging: `npm run build:chrome` opnieuw
draaien, dan het **herlaad**-icoontje op de skool-view-kaart in `chrome://extensions` klikken.

## Uninstall

`chrome://extensions` → skool-view → **Remove**.

## Notes

- Een "Disable developer-mode extensions"-melding kan bij opstarten verschijnen — normaal voor
  unpacked extensies, gewoon wegklikken.
- Beheerde/werk-machines blokkeren unpacked extensies soms via beleid. Is **Load unpacked**
  grijs/uitgeschakeld, dan is dat de reden.
