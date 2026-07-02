# skool-view

Persoonlijke, **local-first** browser-extensie voor Skool-communities. Rendert een snellere,
tweekoloms weergave over dezelfde data die Skool al levert aan je ingelogde browser — geen
centrale server, geen gedeelde credentials. Draait volledig binnen je eigen ingelogde sessie.

Dit is een **eigen fork** van [rocleemusic/skool-view-dist](https://github.com/rocleemusic/skool-view-dist)
(GPL-3.0), doorontwikkeld voor eigen gebruik. Basisstructuur en kernlogica komen van het origineel;
zie `LICENSE` voor de licentievoorwaarden.

De overlay staat **standaard uit**; aanzetten op de actieve Skool-tab via de toolbar-knop of **Alt+S**.

## Deze fork versus het origineel

Alleen **Chrome** wordt gebouwd en gebruikt (unpacked, lokaal). Firefox-ondersteuning uit het
origineel is aanwezig in de broncode maar wordt in deze fork niet gebouwd of getest.

Eigen toevoegingen bovenop het origineel:
- **Tel-systeem** (`ui/feed/statOverrides.svelte.js`) — corrigeert verouderde like/reactie-aantallen
  uit de feed-lijst door het volledige bericht op de achtergrond op te halen.
- **Memberlevel-cache** (`ui/memberLevels.svelte.js`) — leaderboard-scrape als fallback voor de
  levelbadge.
- **Zoom-widget** (`content/zoomWidget.js`).
- **Download als Markdown** (`ui/lib/download.js`) — een post + reacties wegschrijven als
  `.md`-bestand.
- **Zoekfunctie** (`ui/searchQuery.svelte.js` + `FeedList.svelte`) — doorzoekt de lokaal gecrawlde
  corpus op titel, tekst en auteur.
- **Composer-vormgeving** (`ui/detail/ComposerIcons.svelte`) — het commentveld pixelgetrouw gemaakt
  aan Skool's eigen weergave (avatar, pil-vorm, iconenrij, Cancel/Comment-knoppen).

Volledige wijzigingsgeschiedenis van deze fork staat niet hier, maar in de workspace-logboeken:
`Kennis/Logboeken/Scripts/Html/Geheugenlogboek_Weergeven_Skool_ChromeExtensie/`.

## Build from source

```bash
npm install
npm run build:chrome   # productie-build voor Chrome, output in dist/
npm run check          # svelte-check / type check
```

Laden in Chrome: `chrome://extensions` → Developer mode aan → **Load unpacked** → selecteer de
`dist/`-map. Ga daarna naar een Skool-community en druk op **Alt+S**.

## How it works

- **Manifest V3**-extensie — Svelte + Vite.
- Reads komen van Skool's eigen dataroutes; de overlay mount in een Shadow-DOM-root op de actieve tab.
- Een kleine, datagedreven mapping-laag (`src/skool/mapping.json`) isoleert Skool's response-vormen,
  zodat een veldnaamwijziging een fix in één bestand blijft.

## License

[GPL-3.0](LICENSE) — origineel © 2026 rocleemusic, deze fork zonder aparte auteursclaim.
