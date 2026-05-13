# CLAUDE.md — Seitenlogik index.html

Dieses Dokument beschreibt die technische Logik der Landing-Page (`index.html`). Es richtet sich an KI-Assistenten, die an diesem Projekt weiterarbeiten.

---

## ⚠️ GESPERRTE BEREICHE — NICHT ANFASSEN

### Mobile (EINGEFROREN — Stand: Mai 2026)

**Die Mobile-Version ist abgeschlossen und darf NICHT verändert werden**, außer der Nutzer weist explizit darauf hin.

Gesperrte CSS-Blöcke:
- `@media (max-width: 600px)` — vollständig gesperrt
- `@media (max-width: 480px)` — vollständig gesperrt
- `@media (max-width: 480px) { .main-heading-container … }` — gesperrt

Gesperrte JS-Bereiche:
- Alle Zweige, die auf `window.innerWidth < BREAKPOINT_MOBILE` oder `window.innerWidth <= 600` prüfen (Mobile-spezifische Logik)
- `initBenStairOverlay()` und der `#ben-stair-overlay`-Mechanismus
- `updateMobileImageVisibility()` und alle show/hide/showBehind-Funktionen darin

### Achtung bei Desktop-/Global-Änderungen

Globale CSS-Regeln (außerhalb jeder `@media`-Query) und JS-Funktionen ohne Breakpoint-Check wirken auf alle Bildschirmgrößen. Bei jeder Änderung dort prüfen, ob sie unbeabsichtigt auf Mobile durchschlägt — und wenn ja, mit dem Nutzer klären, bevor etwas geändert wird.

---

## Dateistruktur

```
index.html        Markup
css/styles.css    Styling
js/script.js      Gesamte Scroll- und Parallax-Logik (eine große DOMContentLoaded-Funktion)
```

---

## Seitenstruktur (von oben nach unten)

```
MALEREI (Hauptüberschrift)
Alex (Hauptbild)
KONZEPT-Box  ←→  Ben (Porträtbild, rechts)
MYTHUS-Box   ←→  Daniel (Porträtbild, rechts)
GESICHTEN-Box ←→ Michael + Marcus (Bilder, rechts)
```

Jede Box hat einen schräggestellten Anchor-Schriftzug (z.B. „RIVUS", „MYTHUS") der mit der Box mitscrollt.

---

## Parallax-System

### Koordinatensystem

Text-Boxen und Anchors sind `position: fixed` mit `top: 0`. Ihre Position im Viewport wird ausschließlich per `transform: translate3d(0, Y, 0)` gesteuert, wobei `Y` in jedem `scroll`-Event neu berechnet wird:

```
Y = docTop - scrollY * (1 - speed)
```

- `docTop`: Dokumentposition des Elements (gemessen im normalen Fluss, vor dem Fixieren)
- `speed`: Wie viel Prozent des Scrollens das Element mitmacht (0 = statisch, 1 = scrollt mit)

### Geschwindigkeiten (Konstanten in script.js, Zeile 3–4)

| Konstante | Wert | Wer |
|---|---|---|
| `BASE_PARALLAX_SPEED` | `0.35` | Text-Boxen, Anchors |
| `BASE_UNTERPUNKT_SPEED` | `0.50` | Porträtbilder (Ben, Daniel, Michael, Marcus) |

### Portrait-Modus

Erkennung: `window.innerHeight / window.innerWidth > 1.2`  
(entspricht CSS: `@media (max-aspect-ratio: 5/6)`)

Im Portrait-Modus gibt es abweichende Offsets und Positionen für mehrere Elemente.

### Mobile

Breakpoint: `BREAKPOINT_MOBILE` (≈ 600px Breite). Unterhalb dieses Wertes werden Bilder statisch positioniert, kein Parallax-Transform auf Bildern.

---

## Treffpunkt-System (Snaplinien)

### Was ist ein Treffpunkt?

Jede Text-Box hat eine Snaplinie: der Scroll-Wert (`scrollY`), bei dem der Anchor-Schriftzug eine bestimmte Viewport-Position (`meetY`) erreicht. Beim Loslassen des Scrollens springt die Seite automatisch zum nächsten Treffpunkt in Reichweite.

### Berechnung (script.js, Funktion `calculateMeetingPoints`)

```
sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED)
```

`meetY` wird via `getMeetingRatio()` berechnet: ca. 10–20% des Viewport von oben (abhängig von Fensterbreite und Portrait-Modus).

### Einzugsbereiche (Snap-Zonen)

Standardmäßig: `Math.min(distPrev, distNext) * 0.24` (automatisch, abhängig vom Abstand zu Nachbar-Snaplinien).

Manuelle Overrides via `meetingPointZoneOverrides` (Map):

| Snaplinie | Zeile | Override |
|---|---|---|
| MYTHUS | ~559 | `{ before: …px, after: …px }` — asymmetrisch (größer vor, kleiner nach der Linie) |
| MICHAEL | ~592 | fixer Wert in px, nur Desktop |
| KONZEPT, RIVUS, GESICHTEN | — | kein Override, Standardformel |

**Asymmetrische Zone** (`before`/`after`): `before` gilt wenn `scrollY < sMeet` (Nutzer ist noch nicht bei der Linie angekommen), `after` wenn `scrollY > sMeet` (Linie wurde passiert). Logik in Zeile ~1415–1423.

---

## Bild-Freeze-Mechanismus

### Konzept

Porträtbilder (Ben, Daniel) können im Viewport „eingefroren" werden, während der Text an ihnen vorbeiscrollt. Die Freeze-Logik greift **nur auf Desktop** (nicht Mobile) und **nur wenn `contentSpan > imgHeight`** (Text länger als Bild).

### Drei Phasen (`frozenTransformY`, script.js ~Zeile 1670)

```
Phase 1 (scrollY ≤ sMeet):   transform = scrollY * imgSpeed          → normaler Parallax
Phase 2 (sMeet < scrollY < sExit): transform = scrollY - sMeet*(1-imgSpeed) → Bild steht im Viewport
Phase 3 (scrollY ≥ sExit):   transform = (sExit-Wert) + (scrollY-sExit)*boxSpeed → scrollt mit Text-Tempo
```

### Ausrichtung

**Top-Top** (Standardfall, wenn `contentSpan ≥ imgHeight`): Bild-OK = Text-OK bei `sMeet`. Exit wenn Bild-UK = Text-UK.

Wenn `imgHeight > contentSpan`: `sExit = 0` → kein Freeze, Bild scrollt normal durch.

### Exit-Berechnung (`calcSExit`, script.js ~Zeile 1890)

```
sExit = sMeet + (contentSpan - imgHeight) / (1 - boxSpeed)
```

### Wo einstellen

- **Bildposition** (Top-Offset): `positionBen()` (~Zeile 889), `positionMythusDaniel()` (~Zeile 311)
- **sMeet / sExit**: `calculateImageFreezeBounds()` (~Zeile 1868)
- **Transform**: `frozenTransformY` in der Scroll-Handler-Funktion (~Zeile 1670)

---

## Sprache & Niveau

### Sprache (Locale)

Buttons mit `data-locale="de"` / `data-locale="en"` / `data-locale="es"`. Aktive Locale wird in `localStorage` gespeichert.

### Niveau (Textkomplexität)

Buttons mit `data-lang="easy"` / `data-lang="clear"` / `data-lang="expert"`.  
Jede Textvariante ist eine `.lang-text`-Div mit einer der drei Klassen. Die aktive Variante bekommt zusätzlich `.active` (`display: block`, andere `display: none`).

### Nach jedem Wechsel: `afterSwitch()`

Beim Wechsel von Sprache oder Niveau wird `afterSwitch()` aufgerufen, das alle Layout-abhängigen Werte neu berechnet:

```js
function afterSwitch() {
    positionMythusBoxText();
    positionAnchors();
    positionBen();
    positionMythusDaniel();
    calculateRivusAParallaxSpeed();
    calculateMeetingPoints();
    calculateImageFreezeBounds();
}
```

---

## Wichtige Hilfsfunktionen

| Funktion | Zweck |
|---|---|
| `getDocumentTop(el)` | Dokumentposition ohne Transforms (via `offsetTop`-Kette) |
| `getMeetingRatio()` | Viewport-Anteil für Treffpunkt (Portrait vs. Landscape) |
| `getTextSpan(box)` | Höhe des aktiven Textes: `lastEl.bottom - firstEl.top` (nur `.lang-text.active`) |
| `calculateMeetingPoints()` | Alle Snaplinien neu berechnen |
| `calculateImageFreezeBounds()` | `_sMeetBen`, `_sExitBen`, `_sMeetDaniel`, `_sExitDaniel` berechnen |
| `recalculateLayout()` | Alles neu berechnen nach Resize/Orientierungswechsel |
| `slowScrollTo(target)` | Animiertes Scrollen zum Snap-Punkt |

---

## Häufige Fallstricke

- **`getDocumentTop()` liefert 0 für `position: fixed`-Elemente.** Deshalb werden DocTops von Wrappern (z.B. `_box2WrapperDocTop`) im normalen Fluss gemessen und gecacht, bevor der Wrapper auf `fixed` gesetzt wird.
- **`display: none`-Elemente haben `offsetTop = 0`** und dürfen nicht für Höhenmessungen herangezogen werden. Immer erst `.lang-text.active` selektieren, dann darin `h2, p` abfragen.
- **Bilder sind `position: absolute`** innerhalb von `position: relative`-Containern, nicht innerhalb der fixed Wrapper. Ihr Transform `translate3d(0, frozenTransformY, 0)` wird separat berechnet.
