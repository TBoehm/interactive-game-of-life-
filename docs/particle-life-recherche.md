# Particle Life — Rechercheakte

Arbeitsdokument und Quellensammlung zum Thema **Particle Life** (auch: *Clusters*,
*Attraction-Repulsion-Systeme*). Zusammengestellt als Vorbereitung für eine mögliche
Particle-Life-Erweiterung dieses Projekts.

Stand: Juli 2026.

**Legende zur Belegqualität**

- ✅ **verifiziert** — Quelltext oder Seiteninhalt wurde in dieser Recherche direkt gelesen.
- 📄 **referiert** — Inhalt stammt aus Suchmaschinen-Zusammenfassung; die Originalseite war
  aus dieser Sandbox nicht abrufbar (Egress-Policy blockt viele Hosts, siehe
  [Abrufbarkeit](#12-abrufbarkeit-der-quellen-aus-dieser-sandbox)). Vor Zitat nachprüfen.

---

## 1. Was Particle Life ist

Particle Life ist ein Modell künstlichen Lebens: einige tausend Partikel, jedes gehört zu
einer von *n* **Farbklassen** (Typen). Zwischen je zwei Typen *i* und *j* ist ein
Kraftkoeffizient `A[i][j]` definiert — positiv = Anziehung, negativ = Abstoßung. Jedes
Partikel spürt nur Nachbarn innerhalb eines Radius `rmax`. Zusätzlich gibt es immer eine
**kurzreichweitige Abstoßung**, die Partikel daran hindert, ineinander zu kollabieren.

Die entscheidende Eigenschaft: **`A` muss nicht symmetrisch sein.** `A[rot][blau]` darf
+0.8 sein, während `A[blau][rot]` −0.3 ist. Rot jagt Blau, Blau flieht vor Rot. Diese
Verletzung von *actio = reactio* ist der Motor des ganzen Systems — sie pumpt permanent
Energie hinein und verhindert, dass das System in ein Gleichgewicht fällt. (Physikalisch
ist das exakt der Gegenstand der Forschung zu *nichtreziproken* Systemen, siehe
[§ 9](#9-wissenschaftlicher-kontext).)

Aus diesen zwei Zutaten (Matrix + Abstandsprofil) entstehen ohne jede weitere Programmierung:
Zellen mit Membran, sich teilende Strukturen, „Würmer"/„Schlangen", Jäger-Beute-Ketten,
Gleiter, Wirbel, ganze Ökosysteme aus konkurrierenden Strukturtypen.

### Abgrenzung zu Conway's Game of Life

| | Game of Life | Particle Life |
|---|---|---|
| Raum | diskretes Gitter | kontinuierliche Ebene (2D/3D) |
| Zustand | Zelle lebendig/tot | Position + Geschwindigkeit + Typ |
| Regel | Nachbarschaftszählung | Kraftgesetz `F(r)` × Matrixeintrag |
| Zeit | synchrone Generationen | numerische Integration mit `dt` |
| Parameterraum | 1 Regel (B3/S23) | `n²` Matrixeinträge + ~5 globale Parameter |
| Emergenz | Gleiter, Oszillatoren, Guns | Zellen, Würmer, Jagdketten, Ökosysteme |

Für dieses Repo relevant: Der Reiz ist derselbe (*Emergenz aus Minimalregeln*), aber der
Parameterraum ist ungleich größer und **kontinuierlich** — das macht ihn interaktiv
erforschbar (Slider, Matrix-Editor) statt nur „Muster setzen".

---

## 2. Stammbaum / Historie

```
Jeffrey Ventrella, "Clusters" (ca. 2000er, WebGL/Java, später LeapMotion-VR)
    │   Attraktions-/Repulsionsregeln zwischen Partikelgruppen
    │   Inspiration: Lynn Margulis' Endosymbiontentheorie
    ├──► CodeParade / HackerPoet, "Particle Life" (2018, C++/SFML, YouTube)
    │        minR/maxR-Paarparameter, Dreiecks-Kraftprofil, 10 benannte Presets
    ├──► Tom Mohr, "particle-life" / "particle-life-app" (Java/LWJGL, particle-life.com)
    │        rmax + β-Kraftfunktion, Grid-Partitionierung, GUI-Matrixeditor, 3D
    ├──► ciphrd, "Clusters X" / "Atomic Clusters" (2020)
    └──► Hunar Ahmad (brainxyz), "particle-life" (2022, JS/C++, <150 Zeilen)
             viraler „Artificial Life in 100 lines"-Klassiker
                 └──► lisyarus, WebGPU-Portierung im Browser (2025, 65 536 Partikel)
```

Parallel, aber **eigenständige Modellfamilien** (nicht Particle Life im engeren Sinn,
für Vergleich und Ideenklau aber wichtig): Reynolds' *Boids* (1987), das *Vicsek*-Modell
(1995), Schmickls *Primordial Particle System* (2016), Bert Chans *Lenia* (2018) und
*Particle Lenia* (2022).

---

## 3. Die drei kanonischen Kraftgesetze

Das ist der eigentlich wichtige Teil: es gibt **nicht ein** Particle Life, sondern drei
verbreitete Kraftgesetze, die deutlich unterschiedliche Ästhetik erzeugen.

### 3.1 Variante A — CodeParade / HackerPoet (paarweise `minR`/`maxR`)

✅ Verifiziert aus `Universe.cpp` / `Main.cpp`
([HackerPoet/Particle-Life](https://github.com/HackerPoet/Particle-Life), MIT).

Pro Typpaar existieren **drei** Parameter: Attraktionsstärke `A[i][j]`, Innenradius
`minR[i][j]`, Außenradius `maxR[i][j]`. Radien werden symmetrisch gehalten, die
Attraktion nicht.

```cpp
// R_SMOOTH = 2.0, DIAMETER = 10.0
if (r2 > maxR*maxR || r2 < 0.01f) continue;      // außerhalb: keine Kraft
if (r > minR) {
    // Dreiecksprofil: 0 an beiden Rändern, Maximum in der Mitte
    const float numer = 2.0f * std::abs(r - 0.5f*(maxR + minR));
    const float denom = maxR - minR;
    f = A[p.type][q.type] * (1.0f - numer / denom);
} else {
    // harte, aber glatte Nahabstoßung — unabhängig von der Matrix
    f = R_SMOOTH*minR*(1.0f/(minR + R_SMOOTH) - 1.0f/(r + R_SMOOTH));
}
p.vx += f * dx_normalized;                        // Kraft = Beschleunigung, m ≡ 1
```

Integration und Rand:

```cpp
p.x += p.vx;  p.y += p.vy;                        // dt ≡ 1
p.vx *= (1.0f - m_friction);                      // Reibung als Geschwindigkeitsdämpfung
// wrap == true → Torus, sonst elastische Reflexion an den Wänden
```

Matrixgenerierung: `A[i][j] ~ Normal(attract_mean, attract_std)`; **die Diagonale wird
erzwungen negativ** (`A[i][i] = -|x|`), Selbst-Abstoßung ist also Standard, und
`minR[i][i] = DIAMETER`.

**Presets** (✅ direkt aus `Main.cpp`, Reihenfolge:
`attract_mean, attract_std, minr_lower, minr_upper, maxr_lower, maxr_upper, friction, flat_force`):

| Taste | Name | Typen | Partikel | Parameter |
|---|---|---|---|---|
| B | Balanced | 9 | 400 | `-0.02, 0.06, 0.0, 20.0, 20.0, 70.0, 0.05, false` |
| C | Chaos | 6 | 400 | `0.02, 0.04, 0.0, 30.0, 30.0, 100.0, 0.01, false` |
| D | Diversity | 12 | 400 | `-0.01, 0.04, 0.0, 20.0, 10.0, 60.0, 0.05, true` |
| F | Frictionless | 6 | 300 | `0.01, 0.005, 10.0, 10.0, 10.0, 60.0, 0.0, true` |
| G | Gliders | 6 | 400 | `0.0, 0.06, 0.0, 20.0, 10.0, 50.0, 0.1, true` |
| H | Homogeneity | 4 | 400 | `0.0, 0.04, 10.0, 10.0, 10.0, 80.0, 0.05, true` |
| L | Large Clusters | 6 | 400 | `0.025, 0.02, 0.0, 30.0, 30.0, 100.0, 0.2, false` |
| M | Medium Clusters | 6 | 400 | `0.02, 0.05, 0.0, 20.0, 20.0, 50.0, 0.05, false` |
| Q | Quiescence | 6 | 300 | `-0.02, 0.1, 10.0, 20.0, 20.0, 60.0, 0.2, false` |
| S | Small Clusters | 6 | 600 | `-0.005, 0.01, 10.0, 10.0, 20.0, 50.0, 0.01, false` |

Ablesbare Faustregeln aus dieser Tabelle:

- **negativer `attract_mean` + moderate Streuung** → stabile, „balancierte" Ökosysteme
- **positiver Mittelwert + große `maxR` + wenig Reibung** → Chaos, großräumige Ströme
- **hohe Reibung (0.2)** → träge, zähflüssige Klumpen („Quiescence", „Large Clusters")
- **`flat_force = true`** (konstante Kraft statt Dreiecksprofil) korreliert mit den
  „strukturierteren" Presets (Gliders, Diversity, Homogeneity)
- Partikelzahl bleibt überall bei 300–600 **pro Universum**, nicht pro Typ.

### 3.2 Variante B — Tom Mohr / particle-life.com (`rmax` + β)

✅ Verifiziert aus [tom-mohr/particle-life-app `Main.java`](https://github.com/tom-mohr/particle-life-app)
(GPL-3.0 — **Code nicht übernehmen**, nur Modell) und `Physics.java` / `PhysicsSettings.java`
aus [tom-mohr/particle-life](https://github.com/tom-mohr/particle-life).

Das ist die heute meistkopierte Formulierung. Der Abstand wird auf `rmax` normiert
(`r ∈ [0,1]`), es gibt genau **einen** globalen Formparameter β:

```java
double beta = 0.3;
double dist = pos.length();                      // pos bereits durch rmax geteilt
double force = dist < beta
    ? (dist / beta - 1)                          // Abstoßung: −1 bei r=0, 0 bei r=β
    : a * (1 - Math.abs(1 + beta - 2*dist) / (1 - beta));  // Zelt zwischen β und 1
return pos.mul(force / dist);
```

In Mathe-Schreibweise, mit `a = A[i][j]`:

```
        ⎧ r/β − 1                        für 0 ≤ r < β      (matrixunabhängig!)
F(r,a) = ⎨ a · (1 − |2r − 1 − β| / (1−β)) für β ≤ r ≤ 1
        ⎩ 0                              für r > 1
```

Das Zelt hat sein Maximum bei `r = (1+β)/2` und fällt zu beiden Seiten auf 0 ab.
Wichtig: die Nahabstoßung ist **unabhängig von der Matrix** und immer gleich stark —
deshalb kann `a` gefahrlos in `[-1, 1]` liegen.

Standardparameter (`PhysicsSettings.java`, ✅):

```java
wrap     = true;    // Torus über die Welt (−1, +1)
rmax     = 0.02;    // in Weltkoordinaten, Welt ist 2 Einheiten breit → rmax = 1 % der Welt
friction = 0.85;    // pro 1/60 s
force    = 1.0;     // globaler Skalierungsfaktor
dt       = 0.02;
matrix   = DefaultMatrix(6);
```

Integrationsschritt (`Physics.java`, ✅) — semi-implizites Euler mit
framerate-normalisierter Reibung:

```java
double frictionFactor = Math.pow(settings.friction, 60 * settings.dt);
p.velocity.mul(frictionFactor);                  // Reibung ZUERST
// ... über Nachbarcontainer summieren:
relativePosition.div(settings.rmax);
Vector3d deltaV = accelerator.accelerate(matrix.get(p.type, q.type), relativePosition);
p.velocity.add(deltaV.mul(settings.rmax * settings.force * settings.dt));
// danach: pos += vel * dt
```

Der Trick `friction^(60·dt)` ist übernehmenswert: er entkoppelt das gefühlte Verhalten von
der Framerate.

### 3.3 Variante C — Hunar Ahmad / brainxyz (`F = g/d`)

✅ Verifiziert aus [hunar4321/particle-life](https://github.com/hunar4321/particle-life),
`particle_life.html` (MIT).

Radikal simpel, kein Nahabstoßungsterm, Kraft ~ 1/d:

```js
const g = rulesArray[idx + b.type];              // Matrixeintrag, ∈ [−1, 1]
const dx = a.x - b.x, dy = a.y - b.y;
const d  = dx*dx + dy*dy;                        // quadriert!
if (d > 0 && d < r2) {                           // r = 80 px
    const F = g / Math.sqrt(d);                  // ∝ 1/d
    fx += F * dx;  fy += F * dy;                 // Achtung: dx zeigt von b nach a
}
// Geschwindigkeitsupdate mit Viskosität statt Reibung:
a.vx = a.vx * (1 - viscosity) + fx * time_scale;
```

Weil die Nahabstoßung fehlt, hält nur die 1/d-Singularität in Kombination mit negativen
Diagonaleinträgen das System zusammen — das System ist entsprechend „weicher" und neigt zu
Klumpen. Zusatzmechaniken in der Datei, die als UI-Ideen taugen: `wallRepel` (weiche
Randabstoßung statt Reflexion), `pulse` (Mausklick als radiale Kraft), `gravity`,
Auto-Zeitskalierung anhand der gemessenen Gesamtaktivität `total_v`, **Seed in der
URL-Hash** (`window.location.hash = "#" + seed`, Titel `Life #<seed>`) und eine
`symmetricRules()`-Funktion, die die Matrix nachträglich symmetrisiert
(`A[i][j] = A[j][i] = ½(A[i][j] + A[j][i])`) — praktischer A/B-Schalter, um zu zeigen,
wie sehr Asymmetrie das Leben macht.

### 3.4 Vergleich

| | A (CodeParade) | B (Mohr) | C (Hunar) |
|---|---|---|---|
| Parameter pro Paar | 3 (`A`, `minR`, `maxR`) | 1 (`A`) | 1 (`A`) |
| Globale Formparameter | `R_SMOOTH` | `β`, `rmax` | `r`, `viscosity` |
| Nahabstoßung | glatt, `1/(r+R_SMOOTH)` | linear `r/β − 1` | keine |
| Kraftprofil | Dreieck über `[minR,maxR]` | Zelt über `[β,1]` | `1/d` |
| Reichweite | pro Paar verschieden | global `rmax` | global `r` |
| Parameterraum | groß, schwer zu treffen | klein, gutmütig | winzig |
| **Empfehlung** | für Preset-Vielfalt | **Default für Neuimplementierung** | für Minimal-Demo |

---

## 4. Verwandte, aber andersartige Modelle

### 4.1 Primordial Particle System (PPS)

📄 Schmickl, Stefanec, Crailsheim, *„How a life-like system emerges from a simplistic
particle motion law"*, **Scientific Reports 6, 37969 (2016)**,
<https://www.nature.com/articles/srep37969> (+ Corrigendum, PMC5318889;
3D-Fortsetzung: [arXiv:1901.09293](https://arxiv.org/abs/1901.09293);
Projektseite: <https://alife.uni-graz.at/projects/primordial-particle-systems/>).

**Kein** Attraktions-/Repulsionsmodell: die Partikel haben eine Blickrichtung und drehen
sich nach einer Regel der Form `Δφ = α + β · N · sign(R − L)`, wobei `N` die Nachbarzahl im
Umkreis und `R`/`L` die Nachbarn rechts/links sind. Ergebnis sind Zellen mit Membran, Kern,
Lebenszyklus, Teilung und Nährstoffkreislauf. Wichtig als **Referenzpunkt für „echte"
Zellstrukturen** und als Beleg, dass ein einzelner Bewegungs-, nicht Kraftterm reicht.

### 4.2 Lenia / Particle Lenia

- 📄 Bert Wang-Chak Chan, *Lenia — Biology of Artificial Life*,
  [arXiv:1812.05433](https://arxiv.org/abs/1812.05433) (Langfassung im Complex Systems
  Journal, <https://content.wolfram.com/sites/13/2019/10/28-3-1.pdf>). Kontinuierliche
  Verallgemeinerung des Game of Life; enthält eine **Taxonomie** der gefundenen
  Lebensformen — genau die Art Katalog, die dieses Repo für GoL schon hat.
- 📄 Mordvintsev, Niklasson, Randazzo, *Particle Lenia and the energy-based formulation*
  (Google Research, 2022),
  <https://google-research.github.io/self-organising-systems/particle-lenia/>
  (Tutorial-Notebook: <https://observablehq.com/@znah/particle-lenia-from-scratch>).
  Partikel minimieren ein **Energiefeld** `E = U_repulsion − G_growth` statt einer
  Paar-Kraftmatrix; Anleihe an Lennard-Jones. Interessant, weil das System dadurch
  gradientenbasiert und differenzierbar ist (→ lernbar).

### 4.3 Boids & Vicsek

📄 Reynolds (1987) — Separation/Alignment/Cohesion; Vicsek et al. (1995) — Ausrichtung an
mittlerer Nachbarrichtung + Rauschen, zeigt einen echten **Flocking-Phasenübergang**
(diskontinuierlich, fluktuationsgetrieben). Reviews: Vicsek & Zafeiris, *Collective motion*,
[arXiv:1010.5017](https://arxiv.org/abs/1010.5017); *Computational models for active matter*,
[arXiv:1910.02528](https://arxiv.org/abs/1910.02528).
Nutzen für uns: Particle Life kennt **kein** Alignment-Term. Ein optionaler Alignment-Slider
wäre eine originelle Erweiterung (Particle Life × Boids) und ist in der Literatur gut
abgesichert.

---

## 5. Numerik, Stabilität, typische Fallen

1. **Singularität bei r → 0.** Variante C (`1/d`) explodiert; A und B fangen das über den
   Nahabstoßungsterm ab. Immer zusätzlich `r² < ε → continue` (HackerPoet: `r2 < 0.01`).
2. **Reibung ist Pflicht.** Ohne Dämpfung heizt die nichtreziproke Matrix das System
   unbegrenzt auf. `friction ∈ [0.85, 0.95]` pro 1/60 s (Variante B) bzw.
   `1 − friction` mit `friction ∈ [0.01, 0.2]` (Variante A).
3. **Framerate-Normalisierung.** `frictionFactor = friction^(60·dt)` — sonst ändert sich das
   Verhalten mit der Bildrate. Für die Kräfte: festes `dt` und ggf. mehrere Substeps pro
   Frame, **nicht** `dt = deltaTime` aus `requestAnimationFrame`.
4. **Torus vs. Wände.** Wrap ist ästhetisch fast immer besser (keine Randartefakte), erfordert
   aber die Minimum-Image-Konvention bei der Distanz:
   `if (dx > w/2) dx -= w; else if (dx < -w/2) dx += w;`.
   Ohne Wrap sammeln sich Strukturen in Ecken — lisyarus beschreibt genau das als
   „corner black hole"-Bug, den er später fixen musste. 📄
5. **Reihenfolgeabhängigkeit.** Geschwindigkeiten erst *nach* der vollständigen Kraftschleife
   auf die Positionen anwenden (zwei getrennte Schleifen), sonst ist der Schritt
   Gauß-Seidel-artig und richtungsabhängig.
6. **Diagonale der Matrix.** `A[i][i] < 0` (Selbstabstoßung) ist bei CodeParade fest
   verdrahtet und ein guter Default; `A[i][i] > 0` erzeugt schnell tote Klumpen.
7. **Skaleninvarianz beachten.** `rmax` relativ zur Weltgröße *und* zur Partikeldichte
   wählen. Faustregel Mohr: `rmax` ≈ 1 % der Weltbreite bei einigen tausend Partikeln.
   Zu großes `rmax` → alles wird ein Brei *und* die Nachbarschaftssuche degeneriert zu O(N²).

---

## 6. Performance

Der Kern ist O(N²). Ohne Beschleunigung sind im Browser ~1 000–3 000 Partikel bei 60 fps
realistisch; mit Gitter und typisierten Arrays 10 000–50 000; auf der GPU 65 000+.

### 6.1 Räumliche Partitionierung (Pflicht)

Uniformes Gitter mit Zellgröße = `rmax`, dann nur 3×3 (2D) bzw. 3×3×3 (3D) Zellen prüfen.
Tom Mohrs `Physics.java` (✅) benutzt genau das: Partikel werden nach Container-Index
sortiert, `containers[]` speichert **Präfixsummen**, sodass die Partikel einer Zelle
zusammenhängend im Array liegen:

```java
int ci    = cx + cy * nx;
int start = ci == 0 ? 0 : containers[ci - 1];
int stop  = containers[ci];
for (int j = start; j < stop; j++) { ... }
```

Das ist der Counting-Sort-/Cell-List-Ansatz und identisch mit dem, was GPU-Implementierungen
tun (Zellzähler → Präfixsumme → Bucket-Sort der Partikelindizes). 📄

### 6.2 JS-spezifisch

- **Struct-of-Arrays mit `Float32Array`** (`px[]`, `py[]`, `vx[]`, `vy[]`, `type: Uint8Array`)
  statt Objektarrays. Der Unterschied ist in Benchmarks dramatisch. 📄
- **Web Worker + `SharedArrayBuffer`** für echte Parallelisierung; erfordert
  COOP/COEP-Header — auf GitHub Pages **nicht** setzbar, also entweder Worker ohne
  SharedArrayBuffer (Kopieren via Transferable) oder single-threaded bleiben.
  ⚠️ Für dieses Repo (GitHub Pages) relevant.
- **Rendering**: Canvas2D mit `fillRect` von 2–3 px ist schneller als `arc()`; ab ~20 000
  Partikeln WebGL-Instancing oder `gl.POINTS`. Bei Wiederverwendung von `three.js`
  (bereits als Dependency vorhanden) bietet sich `InstancedMesh` bzw. `Points` mit
  Custom-Shader an. 📄
- **Kein `Math.hypot`**, kein `sqrt` vor dem Radius-Test — immer quadriert vergleichen.

### 6.3 GPU / WebGPU

📄 lisyarus, *Particle Life simulation in browser using WebGPU* (15.05.2025),
<https://lisyarus.github.io/blog/posts/particle-life-simulation-in-browser-using-webgpu.html>,
Demo: <https://lisyarus.github.io/webgpu/particle-life.html> — 65 536 Partikel, 8 Typen,
Binning im Compute Shader, Ping-Pong-Buffer, Optionen für Reibung, Zentralkraft,
symmetrische Kräfte, Wrap; Kräfte als JSON speicher-/teilbar.
Weitere: [paulrobello/par-particle-life](https://github.com/paulrobello/par-particle-life)
(Rust + wgpu).

---

## 7. Parameter-Kochbuch (was erzeugt was)

Zusammengetragen aus Presets, Blogposts und Demo-Beschreibungen (teils 📄):

| Gewünschtes Phänomen | Einstellung |
|---|---|
| **Zellen mit Membran** | 3–6 Typen; ein Typ stark selbstanziehend als „Kern", ein zweiter vom Kern angezogen, aber untereinander abstoßend als „Membran" |
| **Würmer / Schlangen** | zyklische Matrix: `A[i][i+1] > 0`, `A[i+1][i] < 0` (Jagdkette entlang eines Rings) |
| **Jäger/Beute, „chasers"** | stark asymmetrische Paare, mittlere Reibung |
| **Gleiter** | kleine `maxR`, `flat_force`, hohe Reibung (siehe Preset G) |
| **Große, träge Klumpen** | positiver `attract_mean`, große Radien, Reibung ≥ 0.2 |
| **Chaos / Ströme** | Reibung ≈ 0.01, große `maxR`, positiver Mittelwert |
| **Kristalle / Gitter** | fast symmetrische Matrix, wenig Rauschen, niedrige Temperatur |
| **Tot / eingefroren** | zu hohe Reibung, oder `A[i][i] > 0` überall |

**Matrix-Generatoren**, die sich als UI-Presets lohnen:
`random` (uniform in [−1,1]), `symmetric` (siehe Hunars `symmetricRules()`),
`chains` / `snakes` (zyklisch), `zero-diagonal`, `negative-diagonal`,
`sparse` (viele Nullen). Tom Mohrs App hat für genau diesen Zweck einen
`MatrixGeneratorProvider` und einen `ImGuiMatrix`-Editor. ✅ (Dateiliste verifiziert)

**Seeds**: Hunars Implementierung nutzt `mulberry32` mit Seed in der URL —
reproduzierbare, teilbare Universen. Für ein Web-Projekt sehr empfehlenswert.

**Automatisierte Suche**: 📄 SakanaAI/MIT/OpenAI/IDSIA, *Automating the Search for
Artificial Life with Foundation Models* (ASAL),
[arXiv:2412.17799](https://arxiv.org/abs/2412.17799),
<https://sakana.ai/asal/>, Code: <https://github.com/SakanaAI/asal>. Sucht mit
Vision-Language-Modellen nach interessanten Simulationen — **explizit auch über den
Particle-Life-Parameterraum** (neben Boids, Lenia, GoL, NCA). Erschienen auch in
*Artificial Life* (MIT Press) 31(3), 368.

---

## 8. Referenzimplementierungen (mit Lizenzstatus)

| Projekt | Sprache | Lizenz | Bemerkung |
|---|---|---|---|
| [HackerPoet/Particle-Life](https://github.com/HackerPoet/Particle-Life) | C++/SFML | **MIT** ✅ | CodeParade-Original, Presets, `minR`/`maxR`-Modell |
| [hunar4321/particle-life](https://github.com/hunar4321/particle-life) | JS + C++/openFrameworks | **MIT** ✅ | kürzeste lesbare Fassung, viele Community-Ports |
| [tom-mohr/particle-life-app](https://github.com/tom-mohr/particle-life-app) | Java/LWJGL/ImGui | **GPL-3.0** ✅ | reichste App; **Code nicht kopieren**, Modell frei nachbauen |
| [tom-mohr/particle-life](https://github.com/tom-mohr/particle-life) | Java | (Repo archiviert, Entwicklung in der App) | saubere Physik-/Grid-Referenz |
| [lisyarus WebGPU-Demo](https://lisyarus.github.io/webgpu/particle-life.html) | WGSL/JS | — 📄 | schnellste Browser-Fassung |
| [paulrobello/par-particle-life](https://github.com/paulrobello/par-particle-life) | Rust/wgpu | — 📄 | GPU-Referenz |
| [Ventrella/Clusters](https://github.com/Ventrella/Clusters) | JS | — 📄 | Original von Ventrella (Repo-Struktur nicht verifiziert) |
| [SakanaAI/asal](https://github.com/SakanaAI/asal) | Python/JAX | — 📄 | Suche im Parameterraum |

⚠️ **Lizenzhinweis für dieses Repo (MIT):** Aus GPL-3.0-Quellen (Tom Mohrs App) darf
**kein Code** übernommen werden. Die *Modellgleichungen* sind nicht schützbar und dürfen
unabhängig implementiert werden; die β-Formel aus § 3.2 ist inzwischen Community-Standard
und auch anderswo dokumentiert.

---

## 9. Wissenschaftlicher Kontext

Der Punkt, der Particle Life aus der Bastel- in die Forschungsecke hebt: die **asymmetrische
Matrix ist eine nichtreziproke Wechselwirkung**, und das ist ein aktives Feld der
Physik weicher Materie.

- 📄 **Fruchart, Hanai, Littlewood, Vitelli**, *Non-reciprocal phase transitions*,
  **Nature 592, 363–369 (2021)**, doi:10.1038/s41586-021-03375-9. Zeigt: Nichtreziprozität
  erzeugt zeitabhängige Phasen, in denen spontan gebrochene kontinuierliche Symmetrien
  dynamisch wiederhergestellt werden; die Übergänge werden von *exceptional points*
  kontrolliert. Genau das sind die „Jagdzustände" (chasing states) und Wanderwellen, die man
  in Particle Life sieht. → Bester wissenschaftlicher Aufhänger für einen Erklärtext.
- 📄 *Non-reciprocal interaction for living matter*, Nature Nanotechnology (2022),
  doi:10.1038/s41565-022-01268-0.
- 📄 Übersicht Active Matter: *The 2024 Motile Active Matter Roadmap*,
  [arXiv:2411.19783](https://arxiv.org/abs/2411.19783).
- 📄 *Emergence in Artificial Life*, **Artificial Life 29(2), 153 (MIT Press)**,
  Preprint [arXiv:2105.03216](https://arxiv.org/abs/2105.03216) — Begriffsklärung
  „Emergenz", nützlich für den Erklärtext (der GoL-README dieses Repos argumentiert bereits
  so).
- 📄 Neuere Arbeiten, die Particle Life direkt aufgreifen:
  *Neural Particle Automata: Learning Self-Organizing Particle Dynamics*
  ([arXiv:2601.16096](https://arxiv.org/abs/2601.16096)),
  *Microcosmos: Reimagining Artificial Life for the GPU Era*
  ([arXiv:2607.02954](https://arxiv.org/abs/2607.02954)).

---

## 10. Übertragung auf dieses Repo

Bestand: React 18 + Vite + Canvas2D, `three.js` bereits als Dependency (für die
3D-Katalogvorschau), Vitest, Deployment auf GitHub Pages, deutschsprachige Doku.

Naheliegende Architektur, falls Particle Life dazukommt:

```
src/lib/particle/
  physics.js      // Zustand als Float32Array-SoA, step(dt), Kraftgesetz nach § 3.2
  grid.js         // uniformes Gitter, Counting-Sort (Präfixsummen wie § 6.1)
  matrix.js       // Matrixgeneratoren: random, symmetric, chains, snakes, zero-diag
  presets.js      // benannte Parametersätze (§ 3.1 als Startpunkt, umgerechnet)
  rng.js          // mulberry32, seedbar → Seed in der URL wie bei Hunar
src/components/
  ParticleCanvas.jsx    // rAF-Loop, festes dt + Substeps, Canvas2D-Rendering
  MatrixEditor.jsx      // n×n-Gitter aus Farbfeldern, Klick/Drag = Wert ändern
```

Konkrete Empfehlungen:

1. **Variante B (§ 3.2) als Modell**, `β = 0.3`, `rmax` ≈ 1 % der Weltbreite,
   `friction = 0.85`, `dt = 0.02`, Wrap an. Gutmütigster Parameterraum.
2. **Physik framerate-unabhängig**: festes `dt`, Reibung als `friction^(60·dt)`.
3. **Kein SharedArrayBuffer** einplanen (GitHub Pages liefert die nötigen COOP/COEP-Header
   nicht). Erst Gitter + `Float32Array` ausreizen; das reicht für ~10 000 Partikel.
4. **Farb-Metapher weiterführen**: das GoL-Projekt vererbt Farben. Particle-Life-Typen *sind*
   Farben — inhaltlich anschlussfähig, `src/lib/color.js` ggf. wiederverwendbar.
5. **Interaktion analog zum GoL-Klick**: Mausklick als radialer Impuls (Hunars `pulse`),
   nicht als Partikel-Spawn — passt zum „Anstupsen statt Bauen"-Gefühl.
6. **Testbarkeit**: die reine Physik (`physics.js`, `grid.js`, `matrix.js`) ist ohne DOM
   testbar — Impulserhaltung bei symmetrischer Matrix, Gitter == Brute Force,
   Reibungsnormalisierung, Wrap-Minimum-Image. Passt zum bestehenden Vitest-Setup.
7. **Doku/README auf Deutsch** halten, wie der Rest des Repos.

---

## 11. Offene Fragen für die nächste Runde

- Ventrellas Original-Clusters-Regeln im Detail (vier Parameter pro Gruppenpaar:
  Attraktions-*range*/-*strength*, Repulsions-*range*/-*strength*) — bisher nur 📄 belegt,
  Originalseite war nicht abrufbar.
- ciphrds „Clusters X"-Artikel enthält laut Suchtreffer eine ausführliche Herleitung inkl.
  Optimierungen — ebenfalls nur 📄.
- 3D: ab wann lohnt `three.js`-`InstancedMesh` gegenüber `Points`? Noch nicht recherchiert.
- Gibt es eine belastbare Metrik für „interessantes" Verhalten (jenseits von ASALs
  VLM-Ansatz), die sich in JS billig berechnen lässt? (Kandidaten: Gesamtgeschwindigkeit —
  Hunars `total_v`, Cluster-Anzahl, Entropie der Belegungsdichte.)

---

## 12. Abrufbarkeit der Quellen aus dieser Sandbox

Praktische Notiz für Folge-Sitzungen: Die Egress-Policy dieser Umgebung ließ nur
`github.com` und `raw.githubusercontent.com` durch. **403 (CONNECT tunnel failed)** kam bei:
`particle-life.com`, `ventrella.com`, `ciphrd.com`, `softologyblog.wordpress.com`,
`lisyarus.github.io`, `google-research.github.io`, `arxiv.org`, `nature.com`,
`en.wikipedia.org`, `observablehq.com`, `archive.org`.

Konsequenz: Quelltexte immer über `raw.githubusercontent.com` holen; für alles andere
WebSearch-Zusammenfassungen nutzen und als 📄 markieren.

---

## 13. Quellenverzeichnis

**Primärimplementierungen (Quelltext gelesen ✅)**

1. HackerPoet / CodeParade — <https://github.com/HackerPoet/Particle-Life>
   (`Universe.cpp`, `Universe.h`, `Main.cpp`; MIT)
2. Hunar Ahmad — <https://github.com/hunar4321/particle-life>
   (`particle_life.html`, `particle_life_3d.html`; MIT) ·
   Demo <https://hunar4321.github.io/particle-life/> ·
   Video <https://youtu.be/0Kx4Y9TVMGg>
3. Tom Mohr — <https://github.com/tom-mohr/particle-life-app> (GPL-3.0) und
   <https://github.com/tom-mohr/particle-life> (`Physics.java`,
   `PhysicsSettings.java`, `Accelerator.java`) · Doku <https://particle-life.com/> 📄

**Weitere Implementierungen / Demos** 📄

4. lisyarus — <https://lisyarus.github.io/blog/posts/particle-life-simulation-in-browser-using-webgpu.html> ·
   Demo <https://lisyarus.github.io/webgpu/particle-life.html>
5. Jeffrey Ventrella, *Clusters* — <https://www.ventrella.com/Clusters/> ·
   <https://github.com/Ventrella/Clusters> ·
   Vortrag <https://archive.org/details/ventrella-clusters> ·
   <https://archive.org/details/clusters-2025>
6. ciphrd, *Clusters X* — <https://ciphrd.com/2020/02/25/clusters-x/>
7. Softology, *Clusters and Particle Life* —
   <https://softologyblog.wordpress.com/2018/11/08/clusters-and-particle-life/>
8. Physion, *Introducing Particle Life* — <https://physion.net/blog/introducing-particle-life>
9. par-particle-life (Rust/wgpu) — <https://github.com/paulrobello/par-particle-life>
10. BionicHaos Sandbox — <https://bionichaos.com/ParticleLifeSim/>

**Wissenschaftliche Literatur** 📄

11. Schmickl, Stefanec, Crailsheim, *How a life-like system emerges from a simplistic
    particle motion law*, Sci Rep 6:37969 (2016) —
    <https://www.nature.com/articles/srep37969> ·
    Corrigendum <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5318889/> ·
    3D: <https://arxiv.org/abs/1901.09293> ·
    Projekt: <https://alife.uni-graz.at/projects/primordial-particle-systems/>
12. Fruchart, Hanai, Littlewood, Vitelli, *Non-reciprocal phase transitions*,
    Nature 592:363 (2021), doi:10.1038/s41586-021-03375-9 ·
    Kontext: <https://news.uchicago.edu/story/physicists-reveal-how-motion-can-be-generated-frustration>
13. *Non-reciprocal interaction for living matter*, Nat. Nanotech. (2022),
    doi:10.1038/s41565-022-01268-0 · <https://pubmed.ncbi.nlm.nih.gov/36509926/>
14. Chan, *Lenia — Biology of Artificial Life* —
    <https://arxiv.org/abs/1812.05433> ·
    <https://content.wolfram.com/sites/13/2019/10/28-3-1.pdf>
15. Mordvintsev, Niklasson, Randazzo, *Particle Lenia and the energy-based formulation* —
    <https://google-research.github.io/self-organising-systems/particle-lenia/> ·
    <https://observablehq.com/@znah/particle-lenia-from-scratch>
16. Kumar et al. (Sakana AI/MIT/OpenAI/IDSIA), *Automating the Search for Artificial Life
    with Foundation Models* — <https://arxiv.org/abs/2412.17799> ·
    <https://sakana.ai/asal/> · <https://github.com/SakanaAI/asal> ·
    Artificial Life 31(3):368 (MIT Press)
17. *Emergence in Artificial Life*, Artificial Life 29(2):153 —
    <https://arxiv.org/abs/2105.03216>
18. Vicsek & Zafeiris, *Collective motion* — <https://arxiv.org/abs/1010.5017>
19. *Computational models for active matter* — <https://arxiv.org/abs/1910.02528>
20. *The 2024 Motile Active Matter Roadmap* — <https://arxiv.org/abs/2411.19783>
21. *Neural Particle Automata* — <https://arxiv.org/abs/2601.16096>
22. *Microcosmos: Reimagining Artificial Life for the GPU Era* —
    <https://arxiv.org/abs/2607.02954>

**Performance / Technik** 📄

23. dgerrells, *How fast is javascript? Simulating 20 000 000 particles* —
    <https://dgerrells.com/blog/how-fast-is-javascript-simulating-20-000-000-particles>
24. WebGL Fundamentals, *Efficient particle system in JavaScript* —
    <https://webglfundamentals.org/webgl/lessons/webgl-qna-efficient-particle-system-in-javascript---webgl-.html>
25. *GPU-Based Neighbor-Search Algorithm for Particle Simulations* (ResearchGate) ·
    *GPU-Native Compressed Neighbor Lists with a Space-Filling-Curve Data Layout* —
    <https://arxiv.org/abs/2602.19873>
