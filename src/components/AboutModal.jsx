// "Über"-Overlay: erklärt, was die Simulation tut und macht.
export default function AboutModal({ onClose }) {
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

        <h2>Was dieses Spiel ist und tut</h2>

        <p>
          Es ist kein „Spiel" im klassischen Sinn (man gewinnt nicht), sondern
          eine <b>Simulation von künstlichem Leben</b> — ein <i>zellulärer
          Automat</i>, 1970 vom Mathematiker John Conway erfunden. Auf einem
          Gitter aus Zellen, die <b>lebendig oder tot</b> sind, entscheiden drei
          simple Regeln über die nächste Generation:
        </p>

        <ul>
          <li>Eine <b>lebende</b> Zelle mit <b>2 oder 3</b> Nachbarn überlebt.</li>
          <li>
            Mit <b>weniger als 2</b> stirbt sie (Einsamkeit), mit <b>mehr als 3</b>
            {' '}stirbt sie (Überbevölkerung).
          </li>
          <li>Eine <b>tote</b> Zelle mit <b>genau 3</b> Nachbarn wird geboren.</li>
        </ul>

        <p>
          Aus diesen Mini-Regeln entsteht überraschend komplexes Verhalten:
          Strukturen pulsieren, wandern, kollidieren und vermehren sich — ganz
          ohne zentrale Steuerung. Das ist <b>Emergenz</b>: ein komplexes Ganzes
          aus einfachen Teilen.
        </p>

        <h3>Was dieses Projekt daraus macht</h3>
        <ul>
          <li>
            <b>Klick zum Erschaffen:</b> Klicke auf eine freie Fläche, und ein
            komplettes, „lebendes" Gebilde erscheint — zufällig aus einer
            Bibliothek bekannter Muster gewählt.
          </li>
          <li>
            <b>Nur bewegte Muster:</b> keine reglosen Stillleben, sondern
            Oszillatoren (Pulsar, Blinker …), Raumschiffe (Glider …),
            Methuselahs (Acorn …) und eine Glider Gun.
          </li>
          <li>
            <b>Farben, die leben und sich vererben:</b> Jedes Gebilde startet in
            einer Zufallsfarbe; geborene Zellen erben den Farb-Durchschnitt ihrer
            Eltern. Kollidieren zwei Gebilde, verschmelzen ihre Farben.
          </li>
        </ul>

        <h3>Geometrie-Modi</h3>
        <p>
          Conways Regel hängt am <b>Quadratgitter</b> mit seinen 8 Nachbarn. Auf
          anderen Kachelungen ändert sich die Nachbarzahl — und damit muss auch
          die Regel angepasst werden:
        </p>
        <ul>
          <li>
            <b>Quadrat</b> — 8 Nachbarn, klassische Conway-Regel B3/S23.
          </li>
          <li>
            <b>Hexagon</b> — nur 6 Nachbarn. Conways Regel stirbt hier aus,
            daher B2/S34 (eine bekannte hexagonale Life-Regel, die Gleiter
            hervorbringt).
          </li>
          <li>
            <b>Dreieck</b> — 12 Nachbarn (Kanten + Ecken). Wenig erforschtes
            Terrain; die Regel B45/S345 wurde auf lebendiges, begrenztes
            Verhalten abgestimmt.
          </li>
        </ul>
        <p>
          In den Hex- und Dreieck-Modi erzeugt ein Klick eine kleine
          Zufalls-Wolke statt eines benannten Musters — die klassischen Figuren
          (Glider, Pulsar …) sind nur auf dem Quadratgitter definiert.
        </p>

        <p className="modal-foot">
          Kurz gesagt: ein digitaler Sandkasten — eine meditative, generative
          Spielwiese, in der aus einfachen Regeln und ein paar Klicks ein
          farbiges, sich selbst entwickelndes Leben entsteht.
        </p>
      </div>
    </div>
  )
}
