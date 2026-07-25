# Particle Life — Implementierungsplan

Planungsdokument für eine Particle-Life-Umgebung **analog zu den bestehenden
Game-of-Life-Umgebungen** dieses Repos. Fachliche Grundlage:
[`particle-life-recherche.md`](./particle-life-recherche.md).

Stand: Juli 2026 · Status: **umgesetzt** (M0–M5), siehe
[Umsetzungsstand](#11-umsetzungsstand) am Ende.

---

## 0. Leitidee

Das Repo ist heute ein **Topologie-Baukasten**: eine Engine (`Life`), die auf
austauschbaren Geometrien (`square`, `hex`, `triangle`, `life3d`) mit
austauschbaren Regeln läuft, dazu ein Renderer, ein Musterkatalog und eine
Mustererkennung.

Particle Life fügt sich nicht als weitere _Topologie_ ein — es gibt kein Gitter —
sondern als **zweite Welt-Familie** mit exakt derselben Schichtung. Die Analogie
ist eins zu eins durchziehbar, und genau das ist das Entwurfsziel: wer
`engine.js` verstanden hat, versteht `physics.js` sofort.

| Game of Life                                         | Particle Life                                                | Anmerkung                               |
| ---------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `lib/topology.js` → `TOPOLOGIES`, `createTopology()` | `lib/particle/world.js` → `WORLDS`, `createWorld()`          | Geometrie: Torus 2D / Box 2D / Torus 3D |
| `DEFAULT_RULES` (B3/S23, B2o/S2m34H …)               | `DEFAULT_LAWS` (β-Zelt, minR/maxR, 1/d)                      | _das_ Regelwerk, pro Welt vorbelegt     |
| `topology.neighbors[]` (vorberechnet)                | `grid.js` (Zellliste, pro Schritt neu)                       | Nachbarschaft; statisch vs. dynamisch   |
| `lib/engine.js` → `class Life`, `step()`             | `lib/particle/physics.js` → `class ParticleLife`, `step(dt)` | Kern                                    |
| `lib/color.js`                                       | **unverändert wiederverwenden**                              | Typfarben statt Gebilde-Farben          |
| `lib/fade.js` (Cross-Fade)                           | `trails` im Renderer                                         | dasselbe Ziel: weiche Bewegung          |
| `lib/patterns.js` (Gebilde)                          | `lib/particle/presets.js` (Matrizen + Parameter)             | „Was man spawnen/laden kann"            |
| `lib/catalog.js` + `CatalogModal`                    | `presets.js` + derselbe `CatalogModal`                       | Katalog-UI wiederverwenden              |
| `PatternPreview.jsx` (Mini-Simulation)               | `MatrixPreview.jsx` (n×n-Heatmap)                            | Vorschaukachel                          |
| `lib/identify.js` (Muster benennen)                  | `lib/particle/identify.js` (Strukturen benennen)             | Stretch-Ziel, siehe M6                  |
| `GameCanvas.jsx` / `Game3DCanvas.jsx`                | `ParticleCanvas.jsx` / `Particle3DCanvas.jsx`                | Renderer                                |
| Klick → Gebilde spawnen                              | Klick → Partikeltropfen / Impuls                             | Interaktionsgeste                       |

---

## 1. Modellentscheidung

**Default ist Variante B aus der Recherche** (Tom-Mohr-Formulierung, § 3.2):
ein globales `rmax`, ein Formparameter `β`, eine Matrix `A[i][j] ∈ [−1, 1]`.

Begründung: kleinster Parameterraum bei größter Robustheit. Die Nahabstoßung ist
matrixunabhängig, dadurch kann die Matrix beliebig zufällig gewürfelt werden, ohne
dass das System explodiert — entscheidend für ein Projekt, dessen Kern das
_Herumspielen_ ist. Die CodeParade-Variante (drei Parameter pro Typpaar) hat den
reicheren Formenschatz, aber ein Zufallswurf landet dort viel häufiger im
Langweiligen.

```
        ⎧ r/β − 1                          0 ≤ r < β     (matrixunabhängig)
F(r,a) = ⎨ a · (1 − |2r − 1 − β| / (1−β))   β ≤ r ≤ 1
        ⎩ 0                                r > 1          (r = Abstand / rmax)
```

Die anderen beiden Gesetze bleiben als austauschbare `LAWS`-Einträge vorgesehen
(§ 3, `law.type`), werden aber erst in M5 implementiert — genau wie `topology.js`
heute mehrere Regeltypen (`totalistic`, `int-hex`) über ein Feld unterscheidet.

**Startparameter** (aus der Recherche verifiziert):
`β = 0.3`, `rmax = 0.02 · Weltbreite`, `friction = 0.85` (pro 1/60 s),
`dt = 0.02 s`, `force = 1.0`, 6 Typen, ~3000 Partikel, Wrap an.

---

## 2. Modulplan

Neue Dateien, mit grober Größenschätzung:

```
src/lib/particle/
  world.js       ~120  WORLDS, DEFAULT_LAWS, createWorld(kind, w, h, law)
  law.js          ~60  forceFactory(law) → (a, r) => f   + Konstanten
  grid.js        ~110  Zellliste per Counting-Sort, forEachNeighbor()
  physics.js     ~220  class ParticleLife: step(dt), spawn*, clear, reseed
  matrix.js      ~120  Generatoren: random, symmetric, chains, snakes, sparse
  presets.js     ~180  benannte Parametersätze + Matrizen
  rng.js          ~25  mulberry32, seedbar
  identify.js    ~200  (M6) Clustererkennung + Benennung
src/components/
  ParticleCanvas.jsx    ~280  2D-Renderer, rAF-Loop, Interaktion
  Particle3DCanvas.jsx  ~240  three.js Points
  MatrixEditor.jsx      ~140  n×n-Editor
  MatrixPreview.jsx      ~60  Heatmap-Kachel für den Katalog
src/lib/particle/*.test.js  ~350 gesamt
```

Angefasste Bestandsdateien: `App.jsx` (Modusleiste + eigene Steuerleiste),
`CatalogModal.jsx` (neuer Zweig in `itemsFor`), `AboutModal.jsx` (Abschnitt),
`styles.css`, `README.md`, `.github/workflows/deploy.yml` (Branch-Trigger).

---

## 3. Kern-APIs

### `world.js` — analog `topology.js`

```js
export const WORLDS = {
  particle2d: { label: 'Partikel',    dims: 2, wrap: true  },
  particle3d: { label: 'Partikel 3D', dims: 3, wrap: true  },
}

export const DEFAULT_LAWS = {
  particle2d: { type: 'beta', label: 'β-Zelt', beta: 0.3 },
  particle3d: { type: 'beta', label: 'β-Zelt', beta: 0.3 },
}

// Weltkoordinaten: [0, w) × [0, h) (× [0, d)), Seitenverhältnis = Canvas.
export function createWorld(kind, cssW, cssH, law, opts) → {
  kind, dims, w, h, d, wrap, law,
  rmax, friction, force, dt, types, count,
}
```

`rmax` wird **relativ** zur Weltbreite gehalten (Default 2 %), damit ein Resize
das Verhalten nicht verändert — dasselbe Motiv wie `buildGrid()` in
`GameCanvas.jsx`, das den Zustand über Resizes hinweg erhält.

### `physics.js` — analog `engine.js`

```js
export class ParticleLife {
  constructor(world, { seed })
  // Struct-of-Arrays, exakt wie Life.alive/r/g/b typisierte Arrays hält:
  px, py, pz : Float32Array(count)
  vx, vy, vz : Float32Array(count)
  type       : Uint8Array(count)
  matrix     : Float32Array(types * types)   // Zeile i = Wirkung von j auf i
  time, steps, activity                      // ↔ generation, population

  step(dt)                 // ein Integrationsschritt
  clear()                  // alle Partikel entfernen
  reseed({ count, types }) // Positionen neu würfeln, Matrix behalten
  reroll(generator)        // Matrix neu würfeln, Positionen behalten
  spawnBlob(x, y, n, type) // Klick: Tropfen setzen   ↔ spawnPattern()
  pulse(x, y, strength)    // Klick: radialer Impuls
  snapshot() / restore()   // für URL-Seed und Tests
}
```

**Schrittfunktion** (Pseudocode, entspricht der verifizierten Referenz):

```js
step(dt) {
  grid.build(px, py, count, rmax, world)          // Counting-Sort
  const fr = Math.pow(friction, 60 * dt)          // framerate-normalisiert
  for (let i = 0; i < count; i++) {
    vx[i] *= fr; vy[i] *= fr                      // Reibung ZUERST
    let ax = 0, ay = 0
    grid.forEachNeighbor(i, (j) => {              // 3×3 (bzw. 3×3×3) Zellen
      let dx = px[j] - px[i], dy = py[j] - py[i]
      if (wrap) { minimumImage(dx, dy) }          // Torus
      const r2 = dx*dx + dy*dy
      if (r2 === 0 || r2 > rmax*rmax) return
      const r = Math.sqrt(r2)
      const f = force(matrix[type[i]*types + type[j]], r / rmax)
      ax += f * dx / r; ay += f * dy / r
    })
    vx[i] += ax * rmax * forceScale * dt
    vy[i] += ay * rmax * forceScale * dt
  }
  for (let i = 0; i < count; i++) {               // getrennte Schleife!
    px[i] += vx[i] * dt; py[i] += vy[i] * dt
    wrapOrClamp(i)
  }
  time += dt; steps++
  activity = mittlereGeschwindigkeit()            // ↔ population
}
```

Zwei Dinge sind hier nicht verhandelbar (siehe Recherche § 5): die **getrennte
Positionsschleife** (sonst wird der Schritt reihenfolgeabhängig) und die
**framerate-normalisierte Reibung**.

### `grid.js` — analog zu `packNeighbors()`

Uniformes Gitter mit Zellgröße `rmax`, Counting-Sort in typisierte Arrays — die
Struktur, die Tom Mohrs `Physics.java` verwendet:

```js
cellOf(i) // Zellindex aus Position
cellCount: Int32Array(ncells + 1) // Präfixsummen → Start-Offsets
order: Int32Array(count) // Partikelindizes, zellweise zusammenhängend
```

Damit liegen die Partikel einer Zelle zusammenhängend im Speicher; die
Nachbarschleife ist ein linearer Scan über 9 (bzw. 27) Bereiche. Kein Hashing,
keine Allokation pro Frame — beide Arrays werden einmal beim Weltaufbau angelegt.

### `matrix.js` — analog `patterns.js`

```js
export const GENERATORS = {
  random:    'Zufall',        // uniform [−1, 1], Diagonale negativ
  symmetric: 'Symmetrisch',   // A[i][j] = A[j][i]  → Impulserhaltung, ruhiger
  chains:    'Ketten',        // A[i][i+1] > 0, A[i+1][i] < 0 → Jagdketten/Würmer
  snakes:    'Schlangen',     // Ketten + starke Selbstabstoßung
  sparse:    'Dünn',          // 60 % Nullen → klar getrennte Rollen
  zero:      'Neutral',       // alles 0, für den Matrix-Editor als Leinwand
}
export function generateMatrix(kind, types, rng) → Float32Array
```

Der `symmetric`-Generator ist bewusst drin: er ist der A/B-Schalter, mit dem man
**zeigen** kann, dass die Asymmetrie das Leben macht (Recherche § 1, § 9).

---

## 4. Rendering

### 2D (`ParticleCanvas.jsx`)

Aufbau 1:1 nach `GameCanvas.jsx`: `useRef` für Simulation und Canvas, ein
`requestAnimationFrame`-Loop, Signal-Props (`stepSignal`, `clearSignal`,
`randomSignal`) und `onStats`. Unterschiede:

- **Zeitschritt**: festes `dt = 0.02 s`, pro Frame `substeps = clamp(round(speed/12), 1, 4)`
  Schritte. Der bestehende Tempo-Slider steuert also Substeps statt Generationen/s.
- **Spuren statt Fade** (Analogon zu `fade.js`): statt `clearRect` ein
  `fillStyle = 'rgba(14,16,24,α)'` über die Fläche; α ≈ 0.35 gibt weiche
  Bewegungsspuren, α = 1 schaltet sie ab. Ein Schalter, ein Wert — dieselbe
  Bedienlogik wie „🌫 Fading an/aus".
- **Zeichnen typweise**: äußere Schleife über die Typen, `fillStyle` einmal pro
  Typ setzen, dann `fillRect(x-1.5, y-1.5, 3, 3)` je Partikel. Spart bei 6 Typen
  und 3000 Partikeln ~3000 Kontextwechsel pro Frame. `arc()` ist deutlich teurer
  und optisch bei 3 px belanglos.
- DPR-Handling und Resize-Verhalten wie im Bestand (Weltinhalt bleibt erhalten,
  weil Positionen relativ zur Weltgröße reskaliert werden).

### 3D (`Particle3DCanvas.jsx`)

`three.js` ist bereits Dependency. `BufferGeometry` + `Points` +
`PointsMaterial({ size, sizeAttenuation: true, vertexColors: true })`; pro Frame
nur `geometry.attributes.position.needsUpdate = true`. Farben werden einmal beim
Typwechsel geschrieben. Kameraführung aus `Game3DCanvas.jsx` übernehmen.
`InstancedMesh` wäre schöner (echte Kugeln), kostet aber bei >5000 Partikeln
spürbar — erst wenn `Points` steht und die Zahlen es hergeben.

---

## 5. Bedienoberfläche

### Modusleiste

`TOPOLOGIES` und `WORLDS` werden in `App.jsx` zu einer Liste zusammengeführt:

```
[ Quadrat | Hexagon | Dreieck | 3D ] [ Partikel | Partikel 3D ]
```

Zwei visuell getrennte Gruppen in derselben Zeile — die Modi bleiben flach und
in einem Klick erreichbar, ohne Untermenü.

### Steuerleiste im Partikelmodus

Übernommen: ⏸ Pause, ⏭ Schritt, 🗑 Leeren, 📖 Katalog, ℹ Über, Tempo-Slider,
🌫 (jetzt „Spuren"). Ersetzt/neu:

| Bedienelement     | Wirkung                                                |
| ----------------- | ------------------------------------------------------ |
| ✨ Zufall         | Positionen neu würfeln (`reseed`) — analog zum Bestand |
| 🎲 Matrix         | neue Matrix nach gewähltem Generator (`reroll`)        |
| 🎛 Matrix zeigen  | blendet den `MatrixEditor` über dem Canvas ein         |
| Typen             | 2–12, Slider                                           |
| Partikel          | 500–20 000, Slider (Warnschwelle ab 10 000)            |
| Reichweite `rmax` | 0.5–5 % der Weltbreite                                 |
| Reibung           | 0.70–0.99                                              |
| β                 | 0.1–0.6                                                |

Statistik-Zeile: `Zeit`, `Partikel`, `Typen`, `Aktivität` (mittlere
Geschwindigkeit — Hunars `total_v`, ein guter Lebendigkeitsindikator) statt
`Gen`/`Zellen`.

### Matrix-Editor

`n×n`-Raster. Zeile _i_ = „wie Typ _i_ auf Typ _j_ reagiert". Zeilen- und
Spaltenköpfe in der Typfarbe (aus `color.js`). Zellhintergrund kodiert das
Vorzeichen (Blau = Abstoßung, Rot = Anziehung, Helligkeit = Betrag), Ziehen nach
oben/unten ändert den Wert, Doppelklick nullt ihn. Ein Klick auf ein Feld ändert
das Verhalten sofort — die Simulation läuft weiter. Das ist der eigentliche
Spielplatz und der Grund, warum Particle Life interaktiver ist als GoL.

### Katalog

`CatalogModal` bekommt einen Zweig für die Partikelmodi: Karten mit
`MatrixPreview` (n×n-Heatmap) statt `PatternPreview`, dazu Name, erwartete
Struktur und ein „Laden"-Knopf. Inhalt aus `presets.js`:
kuratierte Sätze wie _Zellen_, _Würmer_, _Jagdkette_, _Membranen_, _Kristall_,
_Chaos_, _Ruhe_ — inspiriert von den CodeParade-Presets (Recherche § 3.1), aber
**neu getunt**: deren Radienparameter lassen sich nicht in die β-Formulierung
übertragen, die statistischen Vorgaben (Mittelwert/Streuung der Matrix, Reibung,
Typenzahl) dagegen schon.

### Teilbarkeit

Seed und Preset im URL-Hash (`#pl=<seed>.<presetId>`), wie bei Hunar. Beim Laden
wird der Hash gelesen, beim Würfeln geschrieben. Reproduzierbare, verlinkbare
Universen ohne Backend.

### Klick-Interaktion

- **Klick**: radialer Impuls (Hunars `pulse`) — „anstupsen", stört bestehende
  Strukturen, ohne sie zu zerstören.
- **Umschalt+Klick**: Tropfen von ~80 Partikeln eines Zufallstyps setzen —
  das direkte Analogon zum „Klick spawnt ein Gebilde" des Game of Life.

Beide Gesten in den Footer-Hinweis aufnehmen, der Bestand erklärt dort ebenfalls
die Interaktion.

---

## 6. Tests

Vitest ist eingerichtet; die Physik ist DOM-frei und damit gut testbar. Konkret
geplante Fälle:

**`law.test.js`**

- `F(0) = −1`, `F(β) = 0`, `F((1+β)/2) = a`, `F(1) = 0`, `F(r>1) = 0`
- Vorzeichenwechsel genau bei `r = β`, unabhängig von `a`

**`grid.test.js`**

- Gitter-Nachbarschaft **identisch** zur Brute-Force-Menge (Zufallspositionen,
  100 Stichproben) — der wichtigste Test überhaupt
- Wrap: Partikel bei `x = 0.001·w` und `x = 0.999·w` sind Nachbarn
- Präfixsummen: `cellCount[ncells] === count`

**`physics.test.js`**

- **Impulserhaltung**: symmetrische Matrix + `friction = 1` ⇒ Summe aller
  Geschwindigkeiten bleibt über 100 Schritte konstant (Toleranz 1e-4).
  Fällt sofort auf, wenn Vorzeichen oder Normierung falsch sind.
- **Asymmetrie erzeugt Drift**: dieselbe Konfiguration mit asymmetrischer Matrix
  ⇒ Gesamtimpuls ändert sich messbar (das ist das Feature, nicht der Bug)
- **Reibungsnormalisierung**: 1 s Simulation mit `dt = 0.02` und `dt = 0.005`
  ⇒ gleiche Restgeschwindigkeit (Toleranz 2 %)
- **Stabilität**: 10 000 Schritte aus Zufallsstart, kein `NaN`, keine Position
  außerhalb der Welt, `activity` bleibt beschränkt
- **Determinismus**: gleicher Seed ⇒ bitgleicher Zustand nach 200 Schritten
- **Wrap vs. Box**: im Box-Modus verlässt kein Partikel die Welt

**`matrix.test.js`**

- `symmetric` ⇒ `A[i][j] === A[j][i]`; Diagonale bei `random` negativ
- `chains` erzeugt tatsächlich einen gerichteten Ring

**`ParticleCanvas.test.jsx`** — analog `GameCanvas.test.jsx`: rendert, montiert
den Loop, reagiert auf Signal-Props (Smoke-Test mit jsdom, Canvas gemockt).

---

## 7. Leistungsbudget

| Konfiguration               | Ziel     | Weg                            |
| --------------------------- | -------- | ------------------------------ |
| 3 000 Partikel, 6 Typen, 2D | 60 fps   | Gitter + SoA reichen           |
| 10 000 Partikel             | ≥ 45 fps | typweises Zeichnen, `fillRect` |
| 20 000 Partikel             | ≥ 30 fps | Obergrenze des Sliders         |
| 3D, 5 000 Partikel          | 60 fps   | `Points`, kein `InstancedMesh` |

Kein Web Worker, kein `SharedArrayBuffer`: GitHub Pages liefert die dafür nötigen
COOP/COEP-Header nicht (Recherche § 6.2). Falls die Grenzen nicht reichen, wäre
der nächste Schritt WebGPU — bewusst **nicht** Teil dieses Plans (§ 10).

Messpunkte: `performance.now()` um `step()` und um `render()`, im Entwicklungsmodus
als gleitender Mittelwert in der Statistikzeile.

---

## 8. Meilensteine

**M0 — Gerüst** · klein
Verzeichnis `src/lib/particle/`, `world.js`, `law.js`, `rng.js`.
Deploy-Workflow: aktueller Branch in die Trigger-Liste (heute nur
`claude/game-of-life-interactive-mm9dpi` und `main`).
_Fertig, wenn:_ `npm test`, `npm run lint`, `npm run format:check` grün sind.

**M1 — Physikkern, headless** · der eigentliche Brocken
`grid.js`, `physics.js`, `matrix.js` + die Tests aus § 6.
_Fertig, wenn:_ Impulserhaltung, Gitter-gegen-Brute-Force, Reibungsnormalisierung
und der 10 000-Schritte-Stabilitätstest bestehen. Noch kein Pixel auf dem Schirm.

**M2 — 2D sichtbar**
`ParticleCanvas.jsx`, Modus `particle2d` in `App.jsx`, Spuren-Rendering,
Klick-Impuls.
_Fertig, wenn:_ Der Modus läuft mit Defaultparametern flüssig und zeigt sichtbare
Strukturbildung; Resize und Moduswechsel sind sauber.

**M3 — Steuerung**
Slider, Generatorauswahl, `MatrixEditor.jsx`, Tropfen-Geste.
_Fertig, wenn:_ Eine Matrixänderung im Editor sich sofort im Verhalten zeigt und
alle Slider ohne Neustart der Simulation wirken.

**M4 — Katalog & Kontext**
`presets.js`, `MatrixPreview.jsx`, Katalogzweig, `AboutModal`-Abschnitt
(Emergenz, Nichtreziprozität — Quellen stehen in der Recherche), URL-Seed,
README-Kapitel, Footer-Hinweis.
_Fertig, wenn:_ Jedes Preset lädt und zeigt die im Katalog beschriebene Struktur;
ein geteilter Link reproduziert dasselbe Universum.

**M5 — Erweiterungen** · optional
`particle3d` mit `Particle3DCanvas.jsx`; zusätzlich die Gesetze `tent`
(minR/maxR, Recherche § 3.1) und `inverse` (1/d, § 3.3) als `LAWS`-Einträge.

**M6 — Strukturerkennung** · Stretch, das schönste Ziel
Analogon zu `identify.js`: Zusammenhangskomponenten über das ohnehin vorhandene
Gitter (Union-Find über Paare unterhalb eines Kontaktabstands), dann Klassifikation
über Merkmale — Größe, Typmischung, Nettodrift, Drehimpuls, Ringförmigkeit —
zu Namen wie _Zelle_, _Membranring_, _Wurm_, _Jäger_, _Klumpen_. Anzeige als
Zähler in der Statistikzeile („3 Zellen · 2 Würmer"), analog zu „zuletzt: Glider".

---

## 9. Risiken und offene Punkte

1. **Langeweile-Risiko.** Eine zufällige Matrix erzeugt oft nichts Interessantes.
   Gegenmaßnahme: Beim Start immer ein kuratiertes Preset laden, nie eine
   Zufallsmatrix. Optional beim Würfeln verwerfen und neu ziehen, wenn die
   `activity` nach 200 Schritten außerhalb eines Fensters liegt (zu tot / zu
   chaotisch) — billig zu berechnen, weil `activity` ohnehin läuft.
2. **Parameterkopplung.** `rmax`, Partikelzahl und Weltgröße hängen zusammen: mehr
   Partikel bei gleichem `rmax` heißt mehr Nachbarn pro Partikel und quadratisch
   mehr Arbeit. Der Partikel-Slider muss `rmax` gegenläufig nachführen (konstante
   mittlere Nachbarzahl), sonst bricht die Bildrate unerwartet ein.
3. **Mobilgeräte.** Defaults dort niedriger ansetzen (~1500 Partikel), Erkennung
   über `navigator.hardwareConcurrency` oder schlicht die Canvasbreite.
4. **Deploy-Branch.** `deploy.yml` triggert nicht auf dem aktuellen Branch — muss
   in M0 mit erledigt werden, sonst fällt es erst beim ersten Merge auf.
5. **Entscheidung (revidierbar):** Particle Life als Modus **im bestehenden App**
   statt als eigene Seite. Dafür spricht die geteilte Toolbar, der geteilte
   Katalog und dass die gemeinsame Erzählung („Emergenz aus Minimalregeln")
   genau der Punkt des Projekts ist. Dagegen spricht, dass `App.jsx` zwei
   deutlich verschiedene Steuerleisten bekommt — das ist der Preis und mit einer
   ausgelagerten `<ParticleControls>`-Komponente beherrschbar.

---

## 10. Nicht-Ziele

Bewusst außerhalb dieses Plans, damit der Umfang klar bleibt: WebGPU oder
GPU-Compute, Web Worker / `SharedArrayBuffer`, Evolution oder genetische Suche
über Matrizen, serverseitiges Speichern von Universen, Kollisionsphysik mit
echten Radien, sowie eine Portierung der GoL-Modi auf die Partikel-Engine.

---

## 11. Umsetzungsstand

M0–M5 sind umgesetzt und laufen; M6 (Strukturerkennung) steht weiterhin aus.
Der Plan hat weitgehend gehalten — die Schichtung, die Prop-Verträge, die
Testfälle und die Meilensteinfolge sind so eingebaut worden. Fünf Dinge kamen
anders, alle erst beim Ansehen der laufenden Simulation:

1. **Die Reichweite war der entscheidende Parameter, nicht die Partikelzahl.**
   Der Plan setzte `rmax` ≈ 1 % der Weltbreite an (aus Tom Mohrs Defaults). Das
   ergibt im Browser ein feines Konfetti aus winzigen Klümpchen. Erst eine
   Ziel-Nachbarzahl von **18–20** statt 8 erzeugt Strukturen, die mehrere
   Partikeldurchmesser groß sind — also das, was man als Particle Life
   wiedererkennt. Gefunden durch systematisches Durchprobieren im echten
   Browser, nicht durch Nachdenken.
2. **Die handgebaute „Zellen"-Matrix fror ein.** Eine pauschale Abstoßung von
   −0,15 zwischen allen Paaren verteilt die Zellen auf ein Gitter, auf dem sich
   nie zwei begegnen: hübsche Tapete, tote Welt. Ohne diese Grundabstoßung, mit
   einer schwachen asymmetrischen Kopplung zwischen den Paaren, entstehen echte
   Kern-Hülle-Zellen, die driften und kollidieren.
3. **„Blasen" wurde zu etwas anderem, als geplant war.** Nicht mischbare Tropfen
   ergaben dasselbe Tapetenproblem. Mit dem konstanten Kraftgesetz und drei
   Typen entstehen stattdessen **hohle Ringe** — optisch schön, aber eben nicht,
   was in der Beschreibung stand. Beschreibung wurde an die Realität angepasst,
   nicht umgekehrt.
4. **Die 3D-Welt ist ein Würfel**, nicht der Quader aus dem Plan: Eine
   umlaufende Kamera hat keinen Grund, auf eine Kiste zu schauen, die dreimal so
   breit wie tief ist.
5. **`clear()` musste die Kapazität von der aktiven Partikelzahl trennen.** Nur
   so fühlt sich „Leeren und wieder anklicken" genauso an wie beim Game of Life.

Nicht eingebaut, obwohl im Plan erwähnt: die automatische Verwerfen-und-neu-
Würfeln-Heuristik für langweilige Zufallsmatrizen (§ 9.1). Der Katalog als
Startpunkt reicht in der Praxis.
