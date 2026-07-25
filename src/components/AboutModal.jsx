import { isParticleKind } from '../lib/particle/world'

// Particle Life shares the modal but tells its own story: same idea (emergence
// from minimal rules), completely different machinery.
function ParticleAbout() {
  return (
    <>
      <h2>Was Particle Life ist und tut</h2>

      <p>
        Auch das ist kein „Spiel", sondern eine <b>Simulation von künstlichem Leben</b> — nur ohne
        Gitter. Ein paar tausend Partikel schweben in einer kontinuierlichen Fläche, jedes gehört zu
        einer <b>Farbklasse</b>. Eine Matrix legt für je zwei Klassen fest, wie stark sie sich
        anziehen (positiv) oder abstoßen (negativ). Zusätzlich stoßen sich alle Partikel auf ganz
        kurze Distanz ab, damit nichts in sich zusammenfällt. Mehr Regeln gibt es nicht.
      </p>

      <h3>Warum das nicht zur Ruhe kommt</h3>
      <p>
        Der entscheidende Punkt ist, dass die Matrix <b>nicht symmetrisch</b> sein muss. Rot darf
        Blau mit +0,8 anziehen, während Blau Rot mit −0,3 abstößt: Rot jagt, Blau flieht. Damit ist{' '}
        <i>actio = reactio</i> verletzt, das System pumpt permanent Energie in sich hinein und
        findet nie ein Gleichgewicht. Genau daraus entstehen — von niemandem programmiert — Zellen
        mit Membran, sich teilende Klumpen, kriechende Würmer und Jagdketten.
      </p>
      <p>
        In der Physik heißen solche Systeme <b>nichtreziprok</b>; sie sind ein aktives
        Forschungsfeld (Fruchart u.&nbsp;a., <i>Non-reciprocal phase transitions</i>, Nature 2021).
        Wer sehen will, was die Asymmetrie ausmacht, lädt im Katalog das Universum <b>Kristall</b>:
        dessen Matrix ist symmetrisch, der Gesamtimpuls bleibt erhalten — und die Materie erstarrt.
      </p>

      <h3>Die Regeln im Detail</h3>
      <ul>
        <li>
          <b>Kraftgesetz:</b> Unterhalb des Abstands β stoßen sich zwei Partikel immer ab,
          unabhängig von der Matrix. Zwischen β und der Reichweite wirkt der Matrixeintrag, jenseits
          der Reichweite gar nichts. Drei Varianten stehen zur Wahl: β-Zelt (weich), Konstant
          (kantig) und 1/d (zäh).
        </li>
        <li>
          <b>Reibung:</b> Ohne Dämpfung würde sich die Welt endlos aufheizen. Der Wert gilt pro
          1/60&nbsp;Sekunde und wird auf die Schrittweite umgerechnet, damit das Verhalten nicht an
          der Bildrate hängt.
        </li>
        <li>
          <b>Torus:</b> Wer rechts hinausläuft, kommt links wieder herein — sonst sammelt sich alles
          in den Ecken.
        </li>
      </ul>

      <h3>Was du tun kannst</h3>
      <ul>
        <li>
          <b>Klick</b> stupst die Partikel an, <b>Umschalt+Klick</b> setzt einen Tropfen. Nach{' '}
          <b>🗑 Leeren</b> bist du in einer leeren Welt und baust sie Klick für Klick wieder auf.
        </li>
        <li>
          <b>🎛 Matrix</b> öffnet den Editor. Ziehen ändert einen Wert, während die Simulation
          weiterläuft — das ist der eigentliche Spielplatz.
        </li>
        <li>
          <b>🎲 Matrix</b> würfelt neue Beziehungen, <b>✨ Zufall</b> verteilt die Partikel neu.
        </li>
        <li>
          Die Adresszeile enthält immer das komplette Universum. Link kopieren heißt Welt teilen.
        </li>
      </ul>

      <p className="modal-foot">
        Historisch geht das auf Jeffrey Ventrellas <i>Clusters</i> zurück, bekannt wurde es durch
        CodeParade und Tom Mohr. Es ist der kontinuierliche Zwilling des Game of Life: derselbe
        Reiz, aus winzigen Regeln entsteht etwas, das aussieht wie Leben — nur dass der
        Parameterraum hier stufenlos ist und man mitten im laufenden Betrieb daran drehen kann.
      </p>
    </>
  )
}

// "Über"-Overlay: erklärt, was die Simulation tut und macht.
export default function AboutModal({ kind, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Über dieses Projekt"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>

        {isParticleKind(kind) ? (
          <ParticleAbout />
        ) : (
          <>
            <h2>Was dieses Spiel ist und tut</h2>

            <p>
              Es ist kein „Spiel" im klassischen Sinn (man gewinnt nicht), sondern eine{' '}
              <b>Simulation von künstlichem Leben</b>: ein <i>zellulärer Automat</i>, 1970 vom
              Mathematiker John Conway erfunden. Auf einem Gitter aus Zellen, die{' '}
              <b>lebendig oder tot</b> sind, entscheiden drei simple Regeln über die nächste
              Generation:
            </p>

            <ul>
              <li>
                Eine <b>lebende</b> Zelle mit <b>2 oder 3</b> Nachbarn überlebt.
              </li>
              <li>
                Mit <b>weniger als 2</b> stirbt sie (Einsamkeit), mit <b>mehr als 3</b> stirbt sie
                (Überbevölkerung).
              </li>
              <li>
                Eine <b>tote</b> Zelle mit <b>genau 3</b> Nachbarn wird geboren.
              </li>
            </ul>

            <p>
              Aus diesen winzigen Regeln entsteht überraschend komplexes Verhalten: Strukturen
              pulsieren, wandern, kollidieren und vermehren sich, ganz ohne zentrale Steuerung. Das
              ist <b>Emergenz</b>: ein komplexes Ganzes aus einfachen Teilen.
            </p>

            <h3>Was dieses Projekt daraus macht</h3>
            <ul>
              <li>
                <b>Klick zum Erschaffen:</b> Klicke auf eine freie Fläche, und ein komplettes,
                „lebendes" Gebilde erscheint, zufällig aus einer Bibliothek bekannter Muster
                gewählt.
              </li>
              <li>
                <b>Nur bewegte Muster:</b> keine reglosen Stillleben, sondern Oszillatoren (Pulsar,
                Blinker …), Raumschiffe (Glider …), Methuselahs (Acorn …) und eine Glider Gun.
              </li>
              <li>
                <b>Farben, die leben und sich vererben:</b> Jedes Gebilde startet in einer
                Zufallsfarbe; geborene Zellen erben den Farbdurchschnitt ihrer Eltern. Kollidieren
                zwei Gebilde, verschmelzen ihre Farben.
              </li>
            </ul>

            <h3>Geometriemodi</h3>
            <p>
              Conways Regel hängt am <b>Quadratgitter</b> mit seinen 8 Nachbarn. Auf anderen
              Kachelungen ändert sich die Nachbarzahl, und damit muss auch die Regel angepasst
              werden:
            </p>
            <ul>
              <li>
                <b>Quadrat</b>: 8 Nachbarn, klassische Conway Regel B3/S23.
              </li>
              <li>
                <b>Hexagon</b>: nur 6 Nachbarn. Rein zählende (totalistische) Hexregeln zerfallen zu
                Staub (Bays 2005). Daher die <i>nicht totalistische</i> Regel <b>B2o/S2m34H</b>{' '}
                (Callahan 1997): Es zählt nicht nur die Anzahl, sondern die <i>Anordnung</i> der
                Nachbarn (ortho/meta/para). Sie hat echte Oszillatoren (Flipper P2/4/8), ein 2c/4
                Raumschiff und ist turingvollständig.
              </li>
              <li>
                <b>Dreieck</b>: 12 Nachbarn (Kanten und Ecken), exakt Bays' Dreiecksnachbarschaft.
                Verwendet seine validierte Regel <b>B456/S45</b> („Life 4546", Bays 1994), eine
                echte Game of Life Regel mit Gleitern und vielen Oszillatoren.
              </li>
              <li>
                <b>3D</b>: ein Würfelgitter mit 26 Nachbarn (Moore Nachbarschaft). Verwendet Bays'{' '}
                <b>„Life 5766"</b> (B67/S567, Bays 1987), den echten 3D Analog zu Conway. Enthält
                dessen Regel und besitzt einen 3D Gleiter. Ansicht per Maus drehbar.
              </li>
            </ul>
            <p>
              In Hexagon und Dreieck setzt ein Klick echte, offline gegen die jeweilige Regel
              verifizierte Kreaturen (Flipper, Oszillatoren, Raumschiffe). Die klassischen
              Quadratfiguren (Glider, Pulsar …) sind nur auf dem Quadratgitter definiert.
            </p>

            <p className="modal-foot">
              Kurz gesagt: ein digitaler Sandkasten, eine meditative, generative Spielwiese, in der
              aus einfachen Regeln und ein paar Klicks ein farbiges, sich selbst entwickelndes Leben
              entsteht.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
