# Interaktives Game of Life

Ein interaktives Conway's Game of Life: **Klicke auf eine freie Fläche** und es
erscheint ein zufällig ausgewähltes *lebendes* Gebilde (Oszillator, Raumschiff,
Methuselah oder eine Glider Gun) in einer **zufälligen Farbe, die sich vererbt
und beim Wachsen mischt**.

Gebaut mit **React + Vite** und Canvas-Rendering. Gehostet über **GitHub Pages**.

➡️ Live: `https://<dein-github-name>.github.io/interactive-game-of-life-/`

## Mechanik

### Conway's Regeln
Jede Zelle hat 8 Nachbarn und ist lebendig oder tot:
- Eine **lebende** Zelle mit **2 oder 3** Nachbarn überlebt.
- Eine **lebende** Zelle mit weniger als 2 (Einsamkeit) oder mehr als 3
  (Überbevölkerung) Nachbarn stirbt.
- Eine **tote** Zelle mit **genau 3** Nachbarn wird geboren.

Das Gitter ist **toroidal** (Ränder verbunden), damit Raumschiffe endlos fliegen.

### Farbvererbung mit Mischung
- Jedes neu gespawnte Gebilde bekommt eine zufällige, kräftige Farbe.
- Überlebende Zellen behalten ihre Farbe.
- Wird eine Zelle **geboren**, erbt sie den **Durchschnitt** der Farben ihrer
  3 lebenden Eltern-Nachbarn. Treffen zwei Gebilde aufeinander, verschmelzen
  ihre Farben dadurch organisch.

### Mustertypen (bewusst keine statischen „Still Lifes")
| Kategorie | Verhalten | Enthaltene Muster |
|-----------|-----------|-------------------|
| Oszillator | kehrt periodisch zum Start zurück | Blinker, Toad, Beacon, Pulsar, Pentadecathlon |
| Raumschiff | wandert über das Gitter | Glider, Lightweight Spaceship |
| Methuselah | winziger Start, lange chaotische Entwicklung | R-Pentomino, Acorn, Diehard |
| Gun | unbegrenztes Wachstum | Gosper Glider Gun (seltener) |

## Bedienung
- **Klick** ins Feld → zufälliges Gebilde in zufälliger Farbe.
- **▶/⏸** Start/Pause der Simulation.
- **⏭ Schritt** – eine Generation weiter (nur im Pausemodus).
- **✨ Zufall** – mehrere zufällige Gebilde verteilen.
- **🗑 Leeren** – Feld zurücksetzen.
- **Tempo** – Generationen pro Sekunde (1–60).

## Lokal entwickeln
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production-Build nach dist/
npm run preview  # gebauten Build lokal ansehen
```

## Deployment (GitHub Pages)
Der Workflow `.github/workflows/deploy.yml` baut bei jedem Push auf den
Feature-Branch bzw. `main` und veröffentlicht `dist/` auf GitHub Pages.

Einmalig im Repo aktivieren: **Settings → Pages → Build and deployment →
Source: „GitHub Actions"**.

Der `base`-Pfad in `vite.config.js` ist auf `/interactive-game-of-life-/`
gesetzt (Repo-Name). Bei Umbenennung des Repos hier anpassen.

## Projektstruktur
```
src/
  lib/
    engine.js     # Simulation: Schritt-Logik + Farbvererbung (typed arrays)
    patterns.js   # Bibliothek der lebenden Muster
    color.js      # HSL→RGB, zufällige Farbe
  components/
    GameCanvas.jsx# Canvas-Rendering, Render-Loop, Klick-Interaktion
  App.jsx         # Steuerung & Layout
```
