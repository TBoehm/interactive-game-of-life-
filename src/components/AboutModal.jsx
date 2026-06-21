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

        <p className="modal-foot">
          Kurz gesagt: ein digitaler Sandkasten — eine meditative, generative
          Spielwiese, in der aus drei Regeln und deinen Klicks ein farbiges, sich
          selbst entwickelndes Leben entsteht.
        </p>
      </div>
    </div>
  )
}
