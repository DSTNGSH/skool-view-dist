# Install skool-view (Chrome / Edge / Brave)

A faster, custom view over Skool communities. It runs **entirely in your own browser** using **your
own logged-in Skool session** — there's no central server and no shared credentials.

> Chrome support ships as an **unpacked** extension for now (you load it yourself). A one-click
> Chrome Web Store version is planned. On **Firefox**? Use [`INSTALL.md`](INSTALL.md) instead.

## Install

1. Download the latest **`skool-view-chrome-<version>.zip`** from the
   [releases page](https://github.com/rocleemusic/skool-view-dist/releases/latest).
2. **Unzip it into a permanent folder** — e.g. `Documents\skool-view-chrome`. Don't delete or move
   this folder afterward: Chrome loads the extension from it on every launch, so if it moves or
   disappears, the extension breaks.
3. Open **`chrome://extensions`** (Edge: `edge://extensions`, Brave: `brave://extensions`).
4. Turn on **Developer mode** (toggle, top-right).
5. Click **Load unpacked** and select the unzipped folder.
6. Open the toolbar's **puzzle-piece** menu and **pin** skool-view so its button shows.

## Use it

1. Go to any Skool community you're a member of.
2. Click the **skool-view toolbar button** — or press **`Alt+S`** — to toggle the custom view on/off.

## What it can access, and why (same as Firefox)

- **`skool.com` only** — it never runs on any other site.
- **Your session cookies** — so it can read and post **as you**, exactly like the normal site.
  Nothing is sent anywhere except Skool's own servers; there is no skool-view server.
- **Local storage** — remembers your theme + whether the view is on.

## Updates

Unpacked extensions **do not auto-update**. When a new version ships: download the new zip, unzip it
over the same folder (replace the files), then click the **reload** icon on the skool-view card in
`chrome://extensions`.

## Uninstall

`chrome://extensions` → skool-view → **Remove**.

## Notes

- A "Disable developer-mode extensions" prompt may appear on startup — that's expected for unpacked
  extensions; dismiss it.
- Managed/work machines often block unpacked extensions by policy. If **Load unpacked** is greyed
  out, that's why.
