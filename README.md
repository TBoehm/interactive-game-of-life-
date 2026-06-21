# Interaktives Game of Life

Ein interaktives Conway's Game of Life: Ein Klick auf eine freie Fläche lässt
ein zufällig ausgewähltes _lebendes_ Gebilde (Oszillator, Raumschiff, Methuselah
oder eine Glider Gun) in einer **zufälligen Farbe, die sich vererbt und beim
Wachsen mischt**, erscheinen.

Gebaut mit **React + Vite** und Canvas-Rendering. Gehostet über **GitHub Pages**.

➡️ Live: <https://tboehm.github.io/interactive-game-of-life-/>

## Was es simuliert

Es ist kein „Spiel" im klassischen Sinn (man gewinnt nicht), sondern eine
**Simulation von künstlichem Leben** — ein _zellulärer Automat_, 1970 von John
Conway erfunden. Auf einem Gitter aus Zellen, die lebendig oder tot sind,
entscheiden drei simple Regeln über die nächste Generation. Das Faszinierende:
Aus diesen Mini-Regeln entsteht überraschend komplexes Verhalten — Strukturen
pulsieren, wandern, kollidieren und vermehren sich ganz ohne zentrale
Steuerung. Genau das ist _Emergenz_: ein komplexes Ganzes aus einfachen Teilen.

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

| Kategorie  | Verhalten                                    | Enthaltene Muster                             |
| ---------- | -------------------------------------------- | --------------------------------------------- |
| Oszillator | kehrt periodisch zum Start zurück            | Blinker, Toad, Beacon, Pulsar, Pentadecathlon |
| Raumschiff | wandert über das Gitter                      | Glider, Lightweight Spaceship                 |
| Methuselah | winziger Start, lange chaotische Entwicklung | R-Pentomino, Acorn, Diehard                   |
| Gun        | unbegrenztes Wachstum                        | Gosper Glider Gun (seltener)                  |

### Geometrie-Modi (Quadrat / Hexagon / Dreieck / 3D)

Conways Regel hängt am Quadratgitter; andere Kachelungen (und die dritte
Dimension) haben eine andere Nachbarzahl und brauchen daher eine andere Regel.

| Modus   | Nachbarn | Regel             | Hintergrund                                                                    |
| ------- | -------- | ----------------- | ------------------------------------------------------------------------------ |
| Quadrat | 8        | `B3/S23`          | Conways klassische Regel.                                                      |
| Hexagon | 6        | `B2o/S2m34H`      | **Nicht-totalistisch** (Callahan 1997): es zählt die _Anordnung_ der Nachbarn. |
| Dreieck | 12       | `B456/S45`        | Bays' validierte GL-Regel „Life 4546" (Bays 1994), reich an Oszillatoren.      |
| 3D      | 26       | `B67/S567` (5766) | Bays' 3D-Analog „Life 5766" (Bays 1987), Würfelgitter, per Maus drehbar.       |

Warum nicht totalistisch beim Hexagon? Bays (2005) zeigte, dass _zählende_
6-Nachbar-Hexregeln keine echte „Game of Life"-Regel ergeben — Muster zerfallen
zu Staub. Die isotrope nicht-totalistische Regel **B2o/S2m34H** unterscheidet
dagegen die Anordnung der Nachbarn (ortho/meta/para) und hat echte Oszillatoren
(Flipper P2/4/8), ein 2c/4-Raumschiff und ist sogar Turing-vollständig.

Beim Dreieck ist das 12-Nachbar-Gitter exakt Bays' (1994) Dreiecksnachbarschaft.
Statt einer selbst getunten Regel nutzen wir seine validierte GL-Regel **„Life
4546"** (`B456/S45`) — begrenztes Wachstum mit Gleitern und (laut Bays) die
ergiebigste seiner sechs Dreiecksregeln. Die Hex- und Dreieck-Kreaturen wurden
offline gegen die jeweilige Regel geerntet und verifiziert (`src/lib/*.test.js`).

Der **3D-Modus** läuft auf einem Würfelgitter mit 26 Nachbarn (Moore) und nutzt
Bays' **„Life 5766"** (`B67/S567`, Bays 1987) — den echten 3D-Analog zu Conways
Life (enthält dessen Regel und hat einen 3D-Gleiter). Gerendert mit **Three.js**
(WebGL, instanzierte Würfel); die Ansicht ist per Maus drehbar. Die
Simulationslogik ist dieselbe geometrieunabhängige Engine wie in 2D.

Quellen: [Bays, _Game of Life in Hexagonal and Pentagonal Tessellations_, Complex
Systems 15 (2005)](https://wpmedia.wolfram.com/sites/13/2018/02/15-3-4.pdf) ·
[Bays, _Cellular Automata in the Triangular Tessellation_, Complex Systems 8
(1994)](https://content.wolfram.com/sites/13/2018/02/08-2-4.pdf) ·
[Bays, _Candidates for the Game of Life in Three Dimensions_, Complex Systems 1
(1987)](https://content.wolfram.com/uploads/sites/13/2018/02/01-3-1.pdf) ·
[Wikipedia: 3D Life](https://en.wikipedia.org/wiki/3D_Life) ·
[LifeWiki: B2o/S2m34H](https://conwaylife.com/wiki/OCA:B2o/S2m34H) ·
[LifeWiki: Hexagonal neighbourhood](https://conwaylife.com/wiki/Hexagonal_neighbourhood)

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

## Tests

Die Simulationslogik (Engine + Topologie) ist mit **Vitest** abgedeckt — u. a.
Conway-Regeln (Blinker, Block, Glider), Farbvererbung/-mischung,
Nachbarschafts-Symmetrie aller drei Geometrien sowie Hit-Testing.

```bash
npm test         # einmalig
npm run test:watch
```

Die Tests laufen auch im CI und müssen vor jedem Deploy grün sein.

## Code-Qualität (ESLint + Prettier)

```bash
npm run lint          # ESLint (flat config, React-Hooks-Regeln)
npm run format        # Prettier schreibt Formatierung
npm run format:check  # Prettier prüft nur (CI)
```

ESLint und Prettier sind über `eslint-config-prettier` konfliktfrei aufeinander
abgestimmt. Lint und Format-Check laufen im CI vor Tests und Build.

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
