# Interaktives Game of Life

Ein interaktives Conway's Game of Life: Ein Klick auf eine freie Fläche lässt
ein zufällig ausgewähltes *lebendes* Gebilde (Oszillator, Raumschiff, Methuselah
oder eine Glider Gun) in einer **zufälligen Farbe, die sich vererbt und beim
Wachsen mischt**, erscheinen.

Gebaut mit **React + Vite** und Canvas-Rendering. Gehostet über **GitHub Pages**.

➡️ Live: <https://tboehm.github.io/interactive-game-of-life-/>

## Was es simuliert

Es ist kein „Spiel" im klassischen Sinn (man gewinnt nicht), sondern eine
**Simulation von künstlichem Leben** — ein *zellulärer Automat*, 1970 von John
Conway erfunden. Auf einem Gitter aus Zellen, die lebendig oder tot sind,
entscheiden drei simple Regeln über die nächste Generation. Das Faszinierende:
Aus diesen Mini-Regeln entsteht überraschend komplexes Verhalten — Strukturen
pulsieren, wandern, kollidieren und vermehren sich ganz ohne zentrale
Steuerung. Genau das ist *Emergenz*: ein komplexes Ganzes aus einfachen Teilen.

Dieses Projekt erweitert die klassische Simulation um drei Ideen:

1. **Klick zum Erschaffen** — statt einzelne Zellen zu setzen, genügt ein Klick
   auf eine freie Fläche, und ein komplettes „lebendes" Gebilde erscheint,
   zufällig aus einer Bibliothek bekannter Muster gewählt.
2. **Nur bewegte Muster** — keine reglos dasitzenden Stillleben, sondern
   Oszillatoren, Raumschiffe, Methuselahs und eine Glider Gun.
3. **Farben, die leben und sich vererben** — jedes Gebilde startet in einer
   Zufallsfarbe; geborene Zellen erben den Farb-Durchschnitt ihrer Eltern.
   Kollidieren zwei Gebilde, verschmelzen ihre Farben zu Mischtönen.

Das Ergebnis ist ein lebendiges, sich ständig veränderndes Bild — ein
meditativer, generativer Sandkasten, in dem aus drei Regeln und ein paar Klicks
ein farbiges, sich selbst entwickelndes Leben entsteht.

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
- **ℹ Über** – Kurzerklärung im Overlay.
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
Standard-Branch und veröffentlicht `dist/` auf GitHub Pages.

Einmalig im Repo zu aktivieren: **Settings → Pages → Build and deployment →
Source: „GitHub Actions"**.

Der `base`-Pfad in `vite.config.js` ist auf `/interactive-game-of-life-/`
gesetzt (Repo-Name). Bei einem Fork oder umbenanntem Repo ist er dort
entsprechend anzupassen.

## Projektstruktur
```
src/
  lib/
    engine.js      # Simulation: Schritt-Logik + Farbvererbung (typed arrays)
    patterns.js    # Bibliothek der lebenden Muster
    color.js       # HSL→RGB, zufällige Farbe
  components/
    GameCanvas.jsx # Canvas-Rendering, Render-Loop, Klick-Interaktion
    AboutModal.jsx # „Über"-Overlay mit Erklärung
  App.jsx          # Steuerung & Layout
```

## Lizenz
MIT — frei zur Nutzung, Veränderung und Weitergabe.
