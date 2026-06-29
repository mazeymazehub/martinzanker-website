document.addEventListener('DOMContentLoaded', function() {
    // =============== BASIS-KONSTANTEN ===============
    const BASE_PARALLAX_SPEED = 0.35; // Feste Geschwindigkeit für Boxen, Anchors, Bilder
    const BASE_UNTERPUNKT_SPEED = 0.50; // Feste Geschwindigkeit für Unterpunkt-Bilder (Ben, Daniel, Michael, Marcus)

    // Snap-Magnet auf echten Smartphones (_isPhone()) deaktiviert; Tablet/Desktop behalten Snaps.
    // Die Snaplinien werden weiterhin berechnet (für Scroll-Spacer/Ende), nur das Einrasten ist aus.
    // Zum Reaktivieren der Smartphone-Snaplinien: auf true setzen.
    const ENABLE_SNAP_ON_PHONE = false;

    // narrowHover (Desktop-Browser < 640px, hover-fähig): feste Snap-Viewport-Positionen,
    // genutzt in calculateMeetingPoints UND den Speed-Berechnungen der filled/outline-Schriften
    const NH_MEET_RIVUS = 675;   // 35px höher
    const NH_MEET_MYTHUS = 635;  // 35px höher, dann 50px tiefer
    const NH_MEET_GESICHTEN = 760;

    // narrowHover (schmales Desktop-Fenster): sichtbarer Abstand zwischen den Blöcken (Box-UK → nächste Box-OK).
    // Der Doc-Abstand wird je Übergang um die hoverOffset-Differenz (300/500/700) erhöht, damit visuell überall
    // der jeweilige Abstand steht.
    const NH_BLOCK_GAP = 600;        // MYTHUS→GESICHTEN
    const NH_BLOCK_GAP_UPPER = 520;  // KONZEPT→RIVUS und RIVUS→MYTHUS (80px enger)

    // Desktop-Browser (Landscape): fester Abstand zwischen den OBERKANTEN der Textblöcke
    // (KONZEPT→RIVUS→MYTHUS→GESICHTEN). Blockhöhen (z. B. Sprachniveau-Wechsel) verändern
    // die Positionen der Folgeblöcke damit nicht (Parsons-Prinzip: ein Block pro Screen).
    const BLOCK_PITCH_DESKTOP = 900;

    // Feste Referenzhöhe für Desktop-Landscape (≈ Browser-Viewport eines 11"-MacBook,
    // 1366×768): Layout, Snaplinien und Bildgrößen sind damit unabhängig von der
    // Fenstergröße beim Laden — die Seite lädt immer im selben Zustand.
    const DESKTOP_REF_HEIGHT = 670;

    // Desktop: Michael-Bild höher. Es wächst nach oben (Unterkante bleibt fix), indem
    // die Oberkante um denselben Betrag angehoben wird (positionMichaelAndMarcus).
    const MICHAEL_DESKTOP_GROW = 150;

    // Desktop-Landscape: Abstand Michael-Unterkante ↔ untere Fensterkante am Seitenende.
    // Das Ende wird "von unten" berechnet → Michael sitzt bei jeder Fensterhöhe unten.
    const MICHAEL_END_GAP = 50;

    // Desktop-Landscape: Seitenende = GESICHTEN-Snap + dieser feste Scrollweg.
    const END_AFTER_GESICHTEN = 150;

    // "Großer Michael"-Modus: ab dieser Fensterhöhe wird Michael groß (Höhe = innerHeight
    // − MICHAEL_TALL_MARGIN) und scrollt mit Box-Geschwindigkeit (bleibt tiefer im Bild,
    // füllt die untere Hälfte hoher Fenster). Darunter: normaler Modus (feste Größe, Speed 0,5).
    const MICHAEL_TALL_THRESHOLD = 950;
    const MICHAEL_TALL_MARGIN = 280;   // Höhen-Obergrenze: Fensterhöhe − dieser Wert
    const MICHAEL_TALL_SIDE = 40;      // seitlicher Rand pro Seite (Breite = innerWidth − 2×)
    const MICHAEL_ASPECT_HW = 120 / 80; // Michael 80×120 cm → Höhe/Breite = 1,5 (Hochformat)
    const MICHAEL_TALL_GAP = 230;       // Abstand GESICHTEN-Box-Unterkante → Michael-Oberkante
    const MICHAEL_TALL_END_GAP = 150;   // freier Raum unter Michael am Seitenende

    // =============== KONZEPT A (filled/outline) PARALLAX-BERECHNUNG ===============
    // A scrollt mit berechneter Geschwindigkeit, um Anchor bei MEETING_POINT zu treffen

    // Treffpunkt dynamisch: bei schmalem Fenster höher (10%), bei breitem Fenster tiefer (20%)
    const MEETING_RATIO_NARROW = 0.10; // 10% bei sehr schmalem Fenster
    const MEETING_RATIO_WIDE = 0.20;   // 20% bei breitem Fenster
    const NARROW_WIDTH = 400;          // Untergrenze
    const WIDE_WIDTH = 1400;           // Obergrenze

    let konzeptAParallaxSpeed = BASE_PARALLAX_SPEED; // Wird dynamisch berechnet

    // Hilfsfunktion: Dokumentposition ohne Transforms ermitteln
    function getDocumentTop(element) {
        let top = 0;
        while (element) {
            top += element.offsetTop;
            element = element.offsetParent;
        }
        return top;
    }

    /* =============== PORTRAIT-MODUS (height/width > 1.2) ===============
       Erkennung: _isPortraitLayout()
       (entspricht CSS: @media (max-aspect-ratio: 5/6) in styles.css)

       Seitenstruktur (von oben nach unten):
         MALEREI (Hauptüberschrift) → Alex (Bild) → KONZEPT-Box → Ben (Bild) →
         MYTHUS-Box → Daniel (Bild) → GESICHTEN-Box → Michael + Marcus (Bilder)

       Portrait-Anpassungen im JS:
         getMeetingRatio() ............ Treffpunkt der KONZEPT-Parallax-Schriften
                                        (hier, return 0.13 = ~13% vom oberen Rand)
         PORTRAIT_BOX_OFFSET ......... Zusätzlicher Abstand Alex → KONZEPT-Box (Zeile ~353)
         getBoxAlexGap() .............. Addiert PORTRAIT_BOX_OFFSET wenn Portrait (Zeile ~355)

       Portrait-Anpassungen im CSS (styles.css, Portrait-Media-Query):
         --image-alex-width ........... Größe des Alex-Bildes
         --malerei-alex-gap ........... Abstand MALEREI-Überschrift ↔ Alex-Bild
         --heading-top-offset ......... Vertikale Position der MALEREI-Überschrift
         --font-size-heading-large .... Schriftgröße MALEREI
         #ben-container ............... Größe des Ben-Bildes
    */

    // Layout-Referenzhöhe: auf Hover-Geräten die eingefrorene Höhe (siehe
    // applyFrozenViewportMetrics), auf Touch-Geräten live. Für alle Höhen-METRIKEN
    // (meetY, Bild-Offsets, Fade-Schwellen). Modus-Checks (h/w > 1.2) bleiben live.
    function _layoutH() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return window.innerHeight;
        // Hover-Geräte (Desktop-Browser): feste Referenzhöhen, völlig unabhängig von der
        // Fenstergröße beim Laden. Das Portrait-/iPad-Layout greift damit auf Desktop nie
        // (670/Breite ist nie > 1,2 bei >=640px) — es bleibt echten Touch-Geräten vorbehalten.
        return window.innerWidth < 640 ? 700 : DESKTOP_REF_HEIGHT;
    }

    // Portrait-Layout (ehemals h/w > 1.2 live bzw. CSS max-aspect-ratio: 5/6):
    // auf Hover-Geräten mit eingefrorener Höhe → Höhen-Ziehen wechselt den Modus nicht.
    // narrowHover (schmales Desktop-Fenster, < 640) IST das Mobile-/Portrait-Layout und zählt
    // daher immer als Portrait — sonst greifen bei Breite 583–640 die Portrait-Zuschläge nicht
    // (z. B. +230 in getBox2LogicalTop) und die Blöcke rücken fälschlich zusammen.
    function _isPortraitLayout() {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640) return true;
        return _layoutH() / window.innerWidth > 1.2;
    }

    // "Großer Michael"-Modus (Desktop-Landscape, sehr hohe Fenster): Michael groß + Box-Speed.
    function _michaelTall() {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches
            && window.innerWidth >= BREAKPOINT_MOBILE && !_isPortraitLayout()
            && window.innerHeight > MICHAEL_TALL_THRESHOLD;
    }

    // Body-Klassen als Ersatz für aspect-ratio/orientation-Media-Queries.
    // aspect-portrait: eingefroren (layout-relevant, darf beim Höhen-Ziehen nicht kippen).
    // orient-landscape: LIVE wie die ursprüngliche Media-Query (orientation: landscape) —
    // betrifft nur Bild-Beschriftungen (words-stair), keine Layout-Abstände.
    function _updateAspectClasses() {
        document.body.classList.toggle('aspect-portrait', _isPortraitLayout());
        document.body.classList.toggle('orient-landscape', window.innerWidth > window.innerHeight);
        // iPad im Landscape (Touch, kein Smartphone): eigenes Hero-Layout (MALEREI unter Bild, Bild höher).
        // CSS kann iPad-Landscape nicht zuverlässig von Desktop trennen → hier per JS-Klasse.
        document.body.classList.toggle('ipad-landscape',
            navigator.maxTouchPoints > 0
            && window.innerWidth > window.innerHeight
            && Math.min(window.innerWidth, window.innerHeight) >= 600);
    }

    // Hilfsfunktion: Dynamischen Treffpunkt-Ratio berechnen
    function getMeetingRatio() {
        const aspectRatio = _layoutH() / window.innerWidth;
        // Portrait-Modus: fester Treffpunkt (siehe Kommentarblock oben)
        if (aspectRatio > 1.2) {
            if (window.innerWidth < BREAKPOINT_MOBILE) {
                return Math.max(0, 0.13 - 100 / _layoutH()); // Original Smartphone-Wert
            }
            return 0.13; // Fester Wert für Portrait (~160px höher als 0.29)
        }
        // Originale Logik für breitere Bildschirme (Landscape)
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return MEETING_RATIO_NARROW + widthFactor * (MEETING_RATIO_WIDE - MEETING_RATIO_NARROW);
    }

    function calculateKonzeptAParallaxSpeed() {
        const konzeptFilled = document.querySelector('.konzept-heading-filled');
        const alexImage = document.querySelector('.main-heading-image');
        const konzeptAnchor = document.querySelector('.konzept-heading-anchor');

        if (!konzeptFilled || !alexImage || !konzeptAnchor) return;

        // Treffpunkt dynamisch berechnen
        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio;
        // Portrait-Modus: Treffpunkt 80px tiefer
        if (_isPortraitLayout()) {
            meetY += 80;
        }

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(konzeptFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Alex
        // Anchor = Alex.bottom + BOX_ALEX_GAP - anchorGap - Anchor.height
        const alexStart = getDocumentTop(alexImage);
        const alexHeight = alexImage.offsetHeight;
        const anchorHeight = konzeptAnchor.offsetHeight;
        const anchorGap = getKonzeptAnchorGap();
        const anchorStart = alexStart + alexHeight + getBoxAlexGap() - anchorGap - anchorHeight;

        // Anchor's effektive Geschwindigkeit (wie Alex/Box)
        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED; // 0.35

        // Berechne erforderliche Geschwindigkeit für A
        // Formel: speedA = 1 - (aStart - meetY) * (1 - anchorSpeed) / (anchorStart - meetY)
        const numerator = (aStart - meetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        if (Math.abs(denominator) < 10) {
            // Anchor startet sehr nah am Treffpunkt, verwende Default
            konzeptAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            konzeptAParallaxSpeed = 1 - numerator / denominator;
        }

        // Obergrenze 1: A soll immer Parallax-Bewegung zeigen (speed=1 wäre stillstehend)
        // Keine Untergrenze: Die Formel berechnet exakt die nötige Speed für den Treffpunkt
        konzeptAParallaxSpeed = Math.min(1, konzeptAParallaxSpeed);

        console.log('--- KONZEPT CALCULATION ---');
        console.log({
            meetingRatio,
            meetY,
            aStart,
            anchorStart,
            alexStart,
            alexHeight,
            boxAlexGap: getBoxAlexGap(),
            anchorGap,
            anchorHeight,
            numerator,
            denominator,
            calculatedSpeed: 1 - numerator / denominator,
            finalSpeed: konzeptAParallaxSpeed
        });
    }

    // =============== KONZEPT ANCHOR POSITIONIERUNG ===============
    // Anchor-Position wird basierend auf Box-Position berechnet
    // Dies ermöglicht sowohl fixen Abstand ALS AUCH korrekte Z-Schichtung

    // Abstand Anchor-Unterkante zu Box-Oberkante (negativ = überlappt)
    // Dynamisch: bei schmalem Fenster mehr Überlappung, bei breitem weniger
    const ANCHOR_GAP_NARROW = -40;  // Bei schmalem Fenster: Anchor ragt mehr heraus
    const ANCHOR_GAP_WIDE = -75;    // Bei breitem Fenster: weniger Überlappung

    function getKonzeptAnchorGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return ANCHOR_GAP_NARROW + widthFactor * (ANCHOR_GAP_WIDE - ANCHOR_GAP_NARROW);
    }

    // positionKonzeptAnchor() entfällt — Anchors werden in positionAnchors() via transform positioniert.

    // =============== MYTHUS BLOCK POSITIONIERUNG ===============
    // MYTHUS wird relativ zu Box 2 positioniert (Block 3 folgt nach Block 2/RIVUS)

    let mythusAParallaxSpeed = BASE_PARALLAX_SPEED;

    function positionMythusBlock() {
        const box2 = document.getElementById('rivus-content-box');
        const mythusContainer = document.getElementById('mythus-anchor-container');

        if (!box2 || !mythusContainer) return;

        mythusContainer.style.marginTop = '0px';

        // Desktop (Landscape): fester Oberkanten-Abstand RIVUS-Box → MYTHUS-Box
        // (+400px: RIVUS→MYTHUS wirkt sonst optisch zu eng)
        if (!_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) {
            const box2TopP = getBox2LogicalTop();
            const mythusBaseTopP = getDocumentTop(mythusContainer);
            const deltaP = getMythusBoxLogicalTop() - mythusBaseTopP; // Container-OK → Box-OK
            mythusContainer.style.marginTop = `${(box2TopP + BLOCK_PITCH_DESKTOP + 400 - deltaP) - mythusBaseTopP}px`;
            return;
        }

        // fester sichtbarer Abstand RIVUS→MYTHUS (+500 kompensiert hoverOffset-Differenz)
        const _isNarrowHover_mb = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_mb) {
            const rivusBoxBottom = _box2WrapperDocTop + box2.offsetHeight; // tatsächliche RIVUS-Box-Unterkante
            const mythusBaseTop = getDocumentTop(mythusContainer);
            const offset = (rivusBoxBottom + NH_BLOCK_GAP_UPPER + 500 - 100) - mythusBaseTop; // RIVUS→MYTHUS 100px enger
            mythusContainer.style.marginTop = `${offset}px`;
            return;
        }

        let minGap = getBoxGap();
        // Portrait-Modus: MYTHUS-Block 350px tiefer (200 + 150) — fester Wert, gilt auch in narrowHover
        if (_isPortraitLayout()) {
            minGap += 350;
        }
        // Mobile: MYTHUS-Block näher an RIVUS (Abstand verkleinern)
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            minGap -= 567; // war 267; Abstand RIVUS→MYTHUS zusätzlich 300px kleiner
        }
        // Desktop (Landscape): MYTHUS-Position angepasst (verhindert Doppel-Snap mit RIVUS)
        const isPortrait = _isPortraitLayout();
        const _mythusDiff = (window.__debug && window.__debug.mythusDiff !== undefined) ? window.__debug.mythusDiff : -400;
        if (!isPortrait && window.innerWidth >= 1025) {
            minGap += _mythusDiff;
        }

        const box2LogicalTop = getBox2LogicalTop();
        const box2Height = box2.offsetHeight;
        const box2LogicalBottom = box2LogicalTop + box2Height;

        const mythusBaseTop = getDocumentTop(mythusContainer);

        const naturalGap = mythusBaseTop - box2LogicalBottom;
        const offset = minGap - naturalGap;
        mythusContainer.style.marginTop = `${offset}px`;
    }

    function getMythusBoxLogicalTop() {
        const mythusBox = document.getElementById('mythus-box');
        if (!mythusBox) return 0;
        return getDocumentTop(mythusBox);
    }

    // positionMythusAnchor() entfällt — Anchor wird in positionAnchors() via transform positioniert.

    function calculateMythusAParallaxSpeed() {
        const mythusFilled = document.getElementById('mythus-filled');
        const mythusBox = document.getElementById('mythus-box');
        const mythusAnchor = document.getElementById('mythus-anchor');

        if (!mythusFilled || !mythusBox || !mythusAnchor) return;

        // narrowHover: Speed so, dass filled/outline den grauen Anker exakt an der Snaplinie treffen
        const _isNarrowHover_mas = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_mas) {
            const _st = mythusFilled.style.transform;
            mythusFilled.style.transform = '';
            const aStartNH = mythusFilled.getBoundingClientRect().top + window.scrollY;
            mythusFilled.style.transform = _st;
            const anchorHeightNH = mythusAnchor.offsetHeight;
            const anchorGapNH = getKonzeptAnchorGap();
            const wrapTopNH = getDocumentTop(document.getElementById('mythus-box-wrapper'));
            const anchorStartNH = wrapTopNH - anchorGapNH - anchorHeightNH + 33 - 800; // wie calculateMeetingPoints (MYTHUS)
            const sMeetNH = (anchorStartNH - NH_MEET_MYTHUS) / (1 - BASE_PARALLAX_SPEED);
            if (sMeetNH > 100) {
                // Gray-Anker-Position bei sMeet (Runtime: wrapperVisualTop - height - gap + 17)
                const grayAtSnap = wrapTopNH - 800 - anchorHeightNH - anchorGapNH + 17 - sMeetNH * (1 - BASE_PARALLAX_SPEED);
                const aEff = aStartNH + 8 - 800; // Transform: +8 + mythusHoverOffset
                mythusAParallaxSpeed = Math.min(1, 1 - (aEff - grayAtSnap) / sMeetNH);
                return;
            }
        }

        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio;
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            meetY = _layoutH() * 0.80 - 200;
        } else if (_isPortraitLayout()) {
            meetY += 80;
        }

        const aStart = getDocumentTop(mythusFilled);
        // Mobile: invers zu RIVUS/GESICHTEN — größerer Wert = filled tiefer. −17 → 17px höher.
        const schriftenMeetY = window.innerWidth < BREAKPOINT_MOBILE ? meetY - 17 : meetY;

        const mythusBoxStart = getMythusBoxLogicalTop();
        const anchorHeight = mythusAnchor.offsetHeight;
        const anchorGap = getKonzeptAnchorGap();
        const mobileAnchorOffset = window.innerWidth < BREAKPOINT_MOBILE ? 33 : 0;
        const anchorStart = mythusBoxStart - anchorGap - anchorHeight + mobileAnchorOffset;

        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED;

        const numerator = (aStart - schriftenMeetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        if (Math.abs(denominator) < 10) {
            mythusAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            mythusAParallaxSpeed = 1 - numerator / denominator;
        }

        mythusAParallaxSpeed = Math.min(1, mythusAParallaxSpeed);
    }

    function capTextRightBoundary() {
        const rightLimit = window.innerWidth - 40; // rechter Rahmen (20px) + Puffer (20px)
        const rivusBox = document.getElementById('gesichten-content-box');
        const rivusTextBox = document.getElementById('rivus-content-box'); // RIVUS-Textbox
        const paragraphs = document.querySelectorAll('.content-box p, .content-box-2 p');

        // Ben-Bild: horizontale Position als rechte Grenze für RIVUS-Text
        const benEl = document.getElementById('ben-image-with-info');
        const benRect = (benEl && window.innerWidth >= 641) ? benEl.getBoundingClientRect() : null;
        const rivusTextRightLimit = benRect ? benRect.left - 40 : rightLimit; // 40px Gutter

        // Inline-Stile zuerst zurücksetzen, damit CSS-Werte bei Orientierungswechsel wieder greifen
        paragraphs.forEach(p => {
            if (rivusBox && rivusBox.contains(p)) return;
            p.style.maxWidth = '';
        });

        // Neu berechnen basierend auf aktuellem Layout
        // MYTHUS-Text bekommt auf üblichen Laptop-Breiten 20px mehr Abstand zum rechten Rahmen.
        const mythusBox = document.getElementById('mythus-box');
        const isLaptopWidth = window.innerWidth >= 1200 && window.innerWidth <= 1600;
        paragraphs.forEach(p => {
            // GESICHTEN-Box + RIVUS-Box: separat behandelt, hier überspringen
            if (rivusBox && rivusBox.contains(p)) return;
            if (rivusTextBox && rivusTextBox.contains(p)) return;
            const isMythus = mythusBox && mythusBox.contains(p);
            const limit = (isMythus && isLaptopWidth) ? rightLimit - 20 : rightLimit;
            const left = p.getBoundingClientRect().left;
            const available = limit - left;
            const computed = parseFloat(getComputedStyle(p).maxWidth);
            if (isNaN(computed) || computed > available || (isMythus && isLaptopWidth)) {
                p.style.maxWidth = Math.max(50, available) + 'px';
            }
        });

        // RIVUS-Text: feste lesbare Breite, zentriert zwischen linkem Rand und Ben.
        // Beim Verbreitern bleibt der Text mittig stehen; links/rechts wird mehr Box-
        // Hintergrund sichtbar (statt dass der Text mit der vw-Box nach links wandert).
        if (rivusTextBox && benRect && window.innerWidth >= 641) {
            const RIVUS_TEXT_MAX = 600;        // feste lesbare Zeilenbreite
            const areaLeft = 40;               // linker Rand-Abstand
            const areaRight = benRect.left - 40; // Bens linke Kante minus Gutter
            const areaWidth = Math.max(50, areaRight - areaLeft);
            const textWidth = Math.min(RIVUS_TEXT_MAX, areaWidth);
            const targetLeft = areaLeft + (areaWidth - textWidth) / 2; // mittig im Bereich
            rivusTextBox.querySelectorAll('p').forEach(p => {
                p.style.maxWidth = textWidth + 'px';
                // Zentrierung per translateX (statt margin) → per CSS-Transition smooth animierbar.
                // Verschiebung relativ zur aktuellen Position berechnen (kein Layout-Reset nötig).
                const prevShift = parseFloat(p.dataset.cx || '0');
                const curLeft = p.getBoundingClientRect().left; // inkl. aktuellem translateX
                const newShift = prevShift + (targetLeft - curLeft);
                p.dataset.cx = newShift;
                p.style.transform = `translateX(${newShift}px)`;
            });
        }

        // GESICHTEN-Box: Breite immer explizit per JS setzen
        if (rivusBox) {
            const isPortrait = _isPortraitLayout();
            const padding = parseFloat(getComputedStyle(rivusBox).paddingLeft) || 24;
            const targetWidth = isPortrait
                ? window.innerWidth - padding * 2          // Portrait: Rand zu Rand
                : Math.round(window.innerWidth * 0.9);     // Landscape/Desktop: 90vw
            // Box startet bei x=0 im Viewport (margin-left:-20vw + transform:+20vw).
            // Damit der Text im Viewport zentriert ist, margin-left = (viewport - textWidth)/2 - boxPadding
            const marginLeft = isPortrait ? 0 : Math.max(0, (window.innerWidth - targetWidth) / 2 - padding);
            rivusBox.querySelectorAll('p').forEach(p => {
                p.style.setProperty('max-width', targetWidth + 'px', 'important');
                p.style.setProperty('margin-left', marginLeft + 'px', 'important');
                p.style.setProperty('margin-right', 'auto', 'important');
            });
        }
    }

    function positionMythusBoxText() {
        const mythusBox = document.getElementById('mythus-box');
        const danielEl = document.getElementById('mythus-daniel-image-with-info');
        if (!mythusBox || !danielEl) return;

        // Portrait: CSS übernimmt, JS-Werte zurücksetzen
        if (_isPortraitLayout()) {
            mythusBox.style.paddingLeft = '';
            const p = mythusBox.querySelector('p');
            if (p) p.style.maxWidth = '';
            return;
        }

        // CSS-Baseline wiederherstellen vor der Messung
        mythusBox.style.paddingLeft = '';
        const p = mythusBox.querySelector('p');
        if (p) p.style.maxWidth = '';

        const danielRight = danielEl.getBoundingClientRect().right;
        const basePadding = parseFloat(getComputedStyle(mythusBox).paddingLeft);
        const textLeft = mythusBox.getBoundingClientRect().left + basePadding;
        const gap = 40; // --grid-gutter
        const shift = danielRight - textLeft + gap;

        if (shift > 0) {
            mythusBox.style.paddingLeft = (basePadding + shift) + 'px';
            if (p) {
                // max-width = verfügbarer Platz von Daniels rechter Kante bis zum rechten Rahmen
                const availableWidth = window.innerWidth - 40 - danielRight - gap;
                p.style.maxWidth = Math.max(100, availableWidth) + 'px';
            }
        }
    }

    function positionMythusDaniel() {
        const mythusDaniel = document.getElementById('mythus-daniel-image-with-info');
        const mythusDanielImage = mythusDaniel ? mythusDaniel.querySelector('.unterpunkt-heading-image') : null;
        const mythusBox = document.getElementById('mythus-box');
        const mythusContainer = document.getElementById('mythus-anchor-container');
        const mythusAnchor = document.getElementById('mythus-anchor');

        if (!mythusDaniel || !mythusDanielImage || !mythusBox || !mythusContainer || !mythusAnchor) return;

        mythusDaniel.style.top = '0px';

        const mythusBoxLogicalTop = getMythusBoxLogicalTop();
        const mythusBoxHeight = mythusBox.offsetHeight;
        const danielNaturalTop = getDocumentTop(mythusDaniel);

        // Mobile: Daniel statisch 15px unter Logo-Unterkante (wie Ben/Michael/Marcus → Oberkanten bündig)
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const headerEl = document.querySelector('header');
            const topPos = headerEl ? headerEl.offsetHeight + 15 : 50;
            mythusDaniel.style.top = `${topPos}px`;
            return;
        }

        // Desktop: Daniel-Mitte trifft MYTHUS-Box-Mitte beim Anchor-Treffpunkt
        const naturalTop_Box = mythusBoxLogicalTop;
        const naturalTop_Daniel = danielNaturalTop;
        const boxHeight = mythusBoxHeight;
        const danielHeight = mythusDanielImage.offsetHeight;
        const speed_Box = BASE_PARALLAX_SPEED;
        const speed_Daniel = BASE_UNTERPUNKT_SPEED;
        const anchorGap = getKonzeptAnchorGap();
        const anchorHeight = mythusAnchor.offsetHeight;

        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio - 75;
        if (_isPortraitLayout()) {
            meetY += 60;
        } else {
            meetY -= 8;
            meetY = Math.max(meetY, _layoutH() * 0.07 + 50);
        }

        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return;
        const S_meet = S_meet_numerator / S_meet_denominator;
        // Oberkante des aktiven Textes messen (für Top-Top-Ausrichtung bei S_meet)
        const _activeTextDaniel = mythusBox.querySelector('.lang-text.active') || mythusBox;
        const _firstElDaniel = _activeTextDaniel.querySelector('h2, p');
        const textTopOffsetDaniel = _firstElDaniel
            ? _firstElDaniel.offsetTop
            : (parseFloat(getComputedStyle(mythusBox).paddingTop) || 0);
        const alignmentOffset_Daniel = (naturalTop_Box - naturalTop_Daniel) + textTopOffsetDaniel;
        const parallaxCorrection_Daniel = S_meet * (speed_Box - speed_Daniel);
        let finalOffset = alignmentOffset_Daniel + parallaxCorrection_Daniel;

        const isPortraitDaniel = _isPortraitLayout();
        if (window.innerWidth >= 1025 && !isPortraitDaniel) finalOffset += 0;

        mythusDaniel.style.top = `${finalOffset}px`;
    }

    // =============== RIVUS A (filled/outline) PARALLAX-BERECHNUNG ===============
    // Analog zu KONZEPT: A scrollt mit berechneter Geschwindigkeit, um Anchor bei MEETING_POINT zu treffen

    let gesichtenAParallaxSpeed = BASE_PARALLAX_SPEED; // Wird dynamisch berechnet

    // Abstand RIVUS-Anchor-Unterkante zu Box2-Oberkante (negativ = überlappt)
    const RIVUS_ANCHOR_GAP_NARROW = -30;  // Bei schmalem Fenster
    const RIVUS_ANCHOR_GAP_WIDE = -60;    // Bei breitem Fenster

    function getGesichtenAnchorGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return RIVUS_ANCHOR_GAP_NARROW + widthFactor * (RIVUS_ANCHOR_GAP_WIDE - RIVUS_ANCHOR_GAP_NARROW);
    }

    // Dynamischer Rechts-Offset für RIVUS und Box2 (35px bei ≤400px, 0px bei ≥1400px)
    function getGesichtenRightOffset() {
        return Math.max(0, 35 - (window.innerWidth - NARROW_WIDTH) * 0.035);
    }

    function calculateGesichtenAParallaxSpeed() {
        const gesichtenFilled = document.querySelector('.rivus-anchor-filled');
        const contentBox2 = document.getElementById('rivus-content-box');
        const gesichtenAnchor = document.querySelector('.rivus-anchor-gray');

        if (!gesichtenFilled || !contentBox2 || !gesichtenAnchor) return;

        // narrowHover: Speed so, dass filled/outline den grauen Anker exakt an der Snaplinie treffen.
        // Spiegelt calculateMeetingPoints (sMeet) und die Runtime-Formeln aus applyParallaxEffect.
        const _isNarrowHover_gas = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_gas) {
            const _st = gesichtenFilled.style.transform;
            gesichtenFilled.style.transform = '';
            const aStartNH = gesichtenFilled.getBoundingClientRect().top + window.scrollY;
            gesichtenFilled.style.transform = _st;
            const anchorHeightNH = gesichtenAnchor.offsetHeight;
            const anchorGapNH = getGesichtenAnchorGap();
            const anchorStartNH = _box2WrapperDocTop + 50 - anchorGapNH - anchorHeightNH - 300; // wie calculateMeetingPoints (RIVUS)
            const sMeetNH = (anchorStartNH - NH_MEET_RIVUS) / (1 - BASE_PARALLAX_SPEED);
            if (sMeetNH > 100) {
                // Gray-Anker-Position bei sMeet (Runtime: wrapperVisualTop - height - gap + 28)
                const grayAtSnap = _box2WrapperDocTop - 300 - anchorHeightNH - anchorGapNH + 28 - sMeetNH * (1 - BASE_PARALLAX_SPEED);
                const aEff = aStartNH - 300; // rivusHoverOffset im Transform
                gesichtenAParallaxSpeed = Math.min(1, 1 - (aEff - grayAtSnap) / sMeetNH);
                return;
            }
        }

        // Treffpunkt dynamisch berechnen (gleich wie KONZEPT, 75px höher)
        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio - 75;
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            // Smartphone: RIVUS-Treffpunkt bei 80% der Bildschirmhöhe (filled/outline 20px höher)
            meetY = _layoutH() * 0.80 - 130;
        } else if (_isPortraitLayout()) {
            // Portrait-Modus: Treffpunkt 60px tiefer
            meetY += 60;
        } else {
            // Landscape: Treffpunkt 8px höher
            meetY -= 8;
            // Sicherstellen, dass Snap erst passiert wenn RIVUS-Filled noch sichtbar ist
            // fadeThreshold = 0.07 * vh → meetY muss deutlich darüber liegen
            meetY = Math.max(meetY, _layoutH() * 0.07 + 50);
        }

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(gesichtenFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Box2
        // Wenn Wrapper fixed: getDocumentTop(contentBox2) liefert 0 → _box2WrapperDocTop nutzen
        const box2Wrapper = document.getElementById('rivus-content-box-wrapper');
        const box2Start = (box2Wrapper && box2Wrapper.style.position === 'fixed')
            ? _box2WrapperDocTop
            : getDocumentTop(contentBox2) + (_isPhone() ? 170 : 0); // gleicher Touch-Offset wie _box2WrapperDocTop, sonst filled-Versatz
        const anchorHeight = gesichtenAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap();
        const anchorStart = box2Start + 50 - anchorGap - anchorHeight;

        // Anchor's effektive Geschwindigkeit (wie Box)
        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED; // 0.35

        // Berechne erforderliche Geschwindigkeit für A
        const numerator = (aStart - meetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        if (Math.abs(denominator) < 10) {
            gesichtenAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            gesichtenAParallaxSpeed = 1 - numerator / denominator;
        }

        gesichtenAParallaxSpeed = Math.min(1, gesichtenAParallaxSpeed);
    }

    // positionGesichtenAnchor() entfällt — Anchor wird in positionAnchors() via transform positioniert.

    // =============== GESICHTEN A (filled/outline) PARALLAX-BERECHNUNG ===============
    let rivusAParallaxSpeed = BASE_PARALLAX_SPEED;

    function calculateRivusAParallaxSpeed() {
        const rivusFilled = document.getElementById('gesichten-anchor-filled');
        const rivusContentBox = document.getElementById('gesichten-content-box');
        const rivusAnchor = document.getElementById('gesichten-anchor-gray');

        if (!rivusFilled || !rivusContentBox || !rivusAnchor) return;

        // narrowHover: Speed so, dass filled/outline den grauen Anker exakt an der Snaplinie treffen
        const _isNarrowHover_ras = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_ras) {
            const _st = rivusFilled.style.transform;
            rivusFilled.style.transform = '';
            const aStartNH = rivusFilled.getBoundingClientRect().top + window.scrollY;
            rivusFilled.style.transform = _st;
            const anchorHeightNH = rivusAnchor.offsetHeight;
            const anchorGapNH = getGesichtenAnchorGap();
            const anchorStartNH = _gesichtenWrapperDocTop + 50 - anchorHeightNH - anchorGapNH - 1500; // wie calculateMeetingPoints (GESICHTEN)
            const sMeetNH = (anchorStartNH - NH_MEET_GESICHTEN) / (1 - BASE_PARALLAX_SPEED);
            if (sMeetNH > 100) {
                // Gray-Anker-Position bei sMeet (Runtime: wrapperVisualTop - height - gap + 28 + 4)
                const grayAtSnap = _gesichtenWrapperDocTop - 1500 - anchorHeightNH - anchorGapNH + 32 - sMeetNH * (1 - BASE_PARALLAX_SPEED);
                const aEff = aStartNH - 26 - 1500; // Transform: gesichtenFilledOffset(-26) + gesichtenHoverOffset
                rivusAParallaxSpeed = Math.min(1, 1 - (aEff - grayAtSnap) / sMeetNH);
                return;
            }
        }

        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio;
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            meetY = _layoutH() * 0.70 - 35; // Mobile: filled/outline 20px tiefer als zuvor
        } else if (_isPortraitLayout()) {
            meetY += 80; // Portrait (Tablet)
        } else {
            meetY += 70; // Landscape/Desktop
        }

        const aStart = getDocumentTop(rivusFilled);

        const box3Start = (_gesichtenContentBoxWrapper && _gesichtenContentBoxWrapper.style.position === 'fixed')
            ? _gesichtenWrapperDocTop
            : getDocumentTop(document.getElementById('gesichten-content-box-wrapper'));
        const anchorHeight = rivusAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap();
        const deskAnchorOffsetG_sp = (!_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) ? 40 : 0; // Desktop: Anchor 40px tiefer
        const anchorStart = box3Start + 50 - anchorGap - anchorHeight + deskAnchorOffsetG_sp;

        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED;

        const numerator = (aStart - meetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        if (Math.abs(denominator) < 10) {
            rivusAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            rivusAParallaxSpeed = 1 - numerator / denominator;
        }
        rivusAParallaxSpeed = Math.min(1, rivusAParallaxSpeed);
    }

    // positionRivusAnchor() entfällt — Anchor wird in positionAnchors() via transform positioniert.

    // =============== MAGNET SNAP ===============
    // Berechnet die Scroll-Positionen, an denen Anchor und Parallaxschrift exakt übereinanderliegen.
    // Wird nach dem Positionieren aufgerufen (load + resize).
    let meetingPoints = [];
    let meetingPointNames = [];
    let meetingPointZoneOverrides = new Map();
    // Seitenende-Caches (Hover-Desktop): für sofortige Spacer-Anpassung beim Resize.
    // _michaelEndBase (= michaelDocBottom + GAP) ist höhenunabhängig; sEnd = max(
    //   (_michaelEndBase − innerHeight)/0,5  [Michael von unten],  _endFloor [GESICHTEN erreichbar] ).
    let _endSEnd = 0, _endContentHeight = 0, _michaelEndBase = 0, _endFloor = 0;
    let isSnapping = false;
    let isResizing = false; // true während eines Resize-Bursts → Snap-Mechanik pausiert
    let scrollEndTimer;
    let magnetAnimFrame = null;

    // Setzt den Scroll-Spacer so, dass das echte Seitenende (maxScroll) == sEnd ist.
    // Zwei Durchgänge: Pass 1 schätzt den Spacer aus der gemessenen Dokumenthöhe; Pass 2
    // korrigiert anhand des TATSÄCHLICHEN maxScroll (robust gegen Messfehler durch
    // body-vs-documentElement, Transforms, scrollY-abhängige Höhen etc.).
    // Gibt das resultierende echte maxScroll zurück (Quelle der Wahrheit für die End-Logik).
    function _applyEndSpacer(sEnd) {
        const spacer = document.getElementById('scroll-spacer');
        if (!spacer) return 0;
        const docEl = document.documentElement;
        spacer.style.height = '0px';
        const contentH = docEl.scrollHeight; // Höhe ohne Spacer
        _endContentHeight = contentH;
        let sp = Math.max(0, sEnd + window.innerHeight - contentH);
        spacer.style.height = sp + 'px';
        // Korrektur: tatsächliches maxScroll messen und Differenz ausgleichen.
        const err = sEnd - (docEl.scrollHeight - window.innerHeight);
        if (err > 0) spacer.style.height = (sp + err) + 'px';
        return docEl.scrollHeight - window.innerHeight;
    }

    function calculateMeetingPoints() {
        const _namedPoints = []; // { s, name, zone? }
        meetingPointZoneOverrides = new Map();
        const _narrowHoverSnap = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        // Touch-Mobile (echtes iPhone): die für den Snap genutzte anchorStart-Formel (+50) liegt
        // ~28px höher als die echte Render-Position der Anchors → RIVUS/MYTHUS/GESICHTEN snappen
        // 28px zu hoch. Korrektur nur hier (narrowHover/Desktop nutzen ihre eigene Abstimmung).
        const _touchMobile = !_narrowHoverSnap && window.innerWidth < BREAKPOINT_MOBILE;
        const _touchAnchorFix = _touchMobile ? -28 : 0;
        // Touch-Mobile: Überschriften tiefer im Bild landen lassen (größere meetY = tiefer).
        // Tunbar – bei Bedarf erhöhen/verringern.
        const _touchMeetDown = _touchMobile ? 310 : 0;

        // KONZEPT
        const konzeptAnchorEl = document.querySelector('.konzept-heading-anchor');
        const alexImg = document.querySelector('.main-heading-image');
        if (konzeptAnchorEl && alexImg) {
            const meetingRatio = getMeetingRatio();
            let meetY = _layoutH() * meetingRatio;
            if (_isPortraitLayout()) meetY += 80;
            const anchorHeight = konzeptAnchorEl.offsetHeight;
            const anchorGap = getKonzeptAnchorGap();
            const anchorStart = getDocumentTop(alexImg) + alexImg.offsetHeight + getBoxAlexGap() - anchorGap - anchorHeight;
            const sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED);
            if (sMeet > 100) _namedPoints.push({ s: sMeet, name: 'KONZEPT', meetY, anchorStart });
        }

        // RIVUS
        const contentBoxWrapper2El = document.getElementById('rivus-content-box-wrapper');
        const gesichtenAnchorEl = document.querySelector('.rivus-anchor-gray');
        if (contentBoxWrapper2El && gesichtenAnchorEl) {
            const anchorHeightR = gesichtenAnchorEl.offsetHeight;
            const anchorGapR = getGesichtenAnchorGap();
            const narrowRivusShift = _narrowHoverSnap ? -300 : 0;
            const anchorStartR = _box2WrapperDocTop + 50 - anchorGapR - anchorHeightR + narrowRivusShift + _touchAnchorFix;
            let meetYR;
            if (_narrowHoverSnap) {
                meetYR = NH_MEET_RIVUS; // Fester Pixel-Wert → unabhängig von Fensterhöhe
            } else {
                meetYR = _layoutH() * getMeetingRatio() - 75;
                if (_isPortraitLayout()) { meetYR += 60; } else { meetYR -= 8; }
                // Floor für beide Ausrichtungen: auf Mobile-Portrait ist getMeetingRatio() ≈ 0,
                // sonst würde meetYR negativ → Snap oberhalb des sichtbaren Bereichs.
                meetYR = Math.max(meetYR, _layoutH() * 0.07 + 50);
                meetYR -= 24;
            }
            meetYR += _touchMeetDown + (_touchMobile ? 20 : 0); // Touch-Mobile: RIVUS-Snaplinie 20px tiefer (15px höher als zuvor)
            const sMeetRivus = (anchorStartR - meetYR) / (1 - BASE_PARALLAX_SPEED);
            if (sMeetRivus > 100) _namedPoints.push({ s: sMeetRivus, name: 'RIVUS', meetY: meetYR, anchorStart: anchorStartR });
        }

        // MYTHUS
        const mythusAnchorEl = document.getElementById('mythus-anchor');
        if (mythusAnchorEl) {
            const anchorHeightM = mythusAnchorEl.offsetHeight;
            const anchorGapM = getKonzeptAnchorGap();
            const mobileAnchorOffsetM = window.innerWidth < BREAKPOINT_MOBILE ? 33 : 0;
            const narrowMythusShift = _narrowHoverSnap ? -800 : 0;
            // Bei fixiertem Wrapper liefert getDocumentTop 0 → gecachten docTop nutzen (wie RIVUS _box2WrapperDocTop).
            const _mythusWrapTopS = (_mythusBoxWrapper && _mythusBoxWrapper.style.position === 'fixed')
                ? _mythusWrapperDocTop
                : getDocumentTop(document.getElementById('mythus-box-wrapper'));
            const anchorStartM = _mythusWrapTopS - anchorGapM - anchorHeightM + mobileAnchorOffsetM + narrowMythusShift + _touchAnchorFix;
            let meetYM;
            if (_narrowHoverSnap) {
                meetYM = NH_MEET_MYTHUS; // Fester Pixel-Wert → unabhängig von Fensterhöhe
            } else {
                meetYM = _layoutH() * getMeetingRatio() - 75;
                if (_isPortraitLayout()) { meetYM += 60; } else { meetYM -= 8; }
                meetYM = Math.max(meetYM, _layoutH() * 0.07 + 50); // Floor gegen negative meetY (s. RIVUS)
                meetYM -= 20;
            }
            // Touch-Mobile: MYTHUS-Snaplinie um die halbe (gerenderte) Daniel-Bildhöhe tiefer.
            const danielHalf = _touchMobile
                ? (document.querySelector('#mythus-daniel-image-with-info .unterpunkt-heading-image')?.offsetHeight || 0) / 2
                : 0;
            meetYM += _touchMeetDown - (_touchMobile ? 220 : 0) + danielHalf; // On-Screen-Snap (bestätigt richtig); Abstand läuft über margin-top im CSS
            const sMeetMythusRaw = (anchorStartM - meetYM) / (1 - BASE_PARALLAX_SPEED);
            const sMeetRivusPrev = _namedPoints.find(p => p.name === 'RIVUS')?.s ?? 0;
            const sMeetMythus = (_narrowHoverSnap && sMeetRivusPrev > 0) ? Math.max(sMeetMythusRaw, sMeetRivusPrev + 150) : sMeetMythusRaw;

            if (sMeetMythus > 100) {
                const _mythusBefore = _narrowHoverSnap ? 250 : (window.innerWidth < BREAKPOINT_MOBILE ? 500 : 700); // Touch-Mobile bleibt 500 (eingefroren), Desktop 700
                _namedPoints.push({ s: sMeetMythus, name: 'MYTHUS', zone: { before: _mythusBefore, after: _narrowHoverSnap ? 220 : 180 }, meetY: meetYM, anchorStart: anchorStartM });
            }
        }

        // GESICHTEN
        const rivusAnchorEl = document.getElementById('gesichten-anchor-gray');
        if (rivusAnchorEl) {
            const anchorHeightG = rivusAnchorEl.offsetHeight;
            const anchorGapG = getGesichtenAnchorGap();
            const narrowGesichtenShift = _narrowHoverSnap ? -1500 : 0;
            const deskAnchorOffsetG_mp = (!_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) ? 40 : 0; // Desktop: Anchor 40px tiefer
            const anchorStartG = _gesichtenWrapperDocTop + 50 - anchorHeightG - anchorGapG + narrowGesichtenShift + deskAnchorOffsetG_mp + _touchAnchorFix;
            let meetYG;
            if (_narrowHoverSnap) {
                meetYG = NH_MEET_GESICHTEN; // Fester Pixel-Wert → unabhängig von Fensterhöhe
            } else {
                meetYG = _layoutH() * getMeetingRatio();
                if (_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) meetYG += 80;
                else if (window.innerWidth < BREAKPOINT_MOBILE) meetYG = Math.max(meetYG, _layoutH() * 0.07 + 26); // Floor gegen ~0/negative meetY (s. RIVUS)
            }
            meetYG += _touchMeetDown + (_touchMobile ? 90 : 0); // GESICHTEN On-Screen-Snap 50px tiefer (40 + 50)
            const sMeetGesichtenRaw = (anchorStartG - meetYG) / (1 - BASE_PARALLAX_SPEED);
            const sMeetMythusPrev = _namedPoints.find(p => p.name === 'MYTHUS')?.s ?? 0;
            const sMeetGesichten = (_narrowHoverSnap && sMeetMythusPrev > 0) ? Math.max(sMeetGesichtenRaw, sMeetMythusPrev + 150) : sMeetGesichtenRaw;
            // narrowHover: kleine After-Zone, sonst bleibt man am Seitenende in der Zone gefangen
            // und bounct zurück auf den Snap. Echtes Mobile (Touch) behält 840 (eingefroren).
            const gesichtenZone = window.innerWidth < BREAKPOINT_MOBILE
                ? { before: 700, after: (_narrowHoverSnap ? 250 : 50) } // Touch: kleines after, sonst Snap-Back vom Seitenende (Ruckler + GESICHTEN 2×)
                : { before: 700, after: 50 }; // Desktop: before 700, after wie bisher (50)
            if (sMeetGesichten > 100) _namedPoints.push({ s: sMeetGesichten, name: 'GESICHTEN', zone: gesichtenZone, meetY: meetYG, anchorStart: anchorStartG });
        }

        // Seitenende & MICHAEL-Snap.
        let _sMichaelForEnd = 0;
        _michaelEndBase = 0;
        _endFloor = 0;
        if (window.innerWidth >= 641 && !_isPortraitLayout()) {
            // Desktop-Landscape: Seitenende = GESICHTEN-Snap + Scrollweg (normaler Modus).
            const gesPt = _namedPoints.find(p => p.name === 'GESICHTEN');
            if (gesPt && gesPt.s + END_AFTER_GESICHTEN > 100) {
                _endFloor = gesPt.s + END_AFTER_GESICHTEN;
                // "Großer Michael": Ende so, dass Michaels Unterkante MICHAEL_TALL_END_GAP über
                // der Fensterkante sitzt. Michael ist fixed an die GESICHTEN-Box gekoppelt:
                //   Michael-Unterkante(s) = _gesichtenWrapperDocTop − s·0,65 + boxH + GAP + michaelH
                // Lösen für Michael-Unterkante = innerHeight − END_GAP. Nicht vor dem GESICHTEN-Snap.
                if (_michaelTall()) {
                    const michaelEl = document.getElementById('michael-image-with-info');
                    const mh = michaelEl ? michaelEl.offsetHeight : 0;
                    const michaelEnd = (_gesichtenWrapperDocTop + _cachedRivusBoxHeight + MICHAEL_TALL_GAP
                        + mh - window.innerHeight + MICHAEL_TALL_END_GAP) / (1 - BASE_PARALLAX_SPEED);
                    _endFloor = Math.max(_endFloor, michaelEnd);
                } else {
                    // Normaler Michael (Fensterhöhe ≤ Schwelle, Laptop/MacBook): Unterpunkt-Bild
                    // mit Speed 0,5. Visuelle Oberkante(s) = _michaelVisualDocTop − s·(1−0,5).
                    const michaelEl = document.getElementById('michael-image-with-info');
                    const mh = michaelEl ? michaelEl.offsetHeight : 0;
                    // Mittiger MICHAEL-Snap: Bildmitte = Fenstermitte (echte Fensterhöhe, nicht Referenz).
                    const sMichaelCenter = (_michaelVisualDocTop + mh / 2 - window.innerHeight / 2) / (1 - BASE_UNTERPUNKT_SPEED);
                    if (sMichaelCenter > 100) _namedPoints.push({ s: sMichaelCenter, name: 'MICHAEL' });
                    // Ende: bis Michaels Unterkante MICHAEL_TALL_END_GAP über der Kante steht, etwas
                    // über die Bildmitte hinaus, damit sich ein Stück höher scrollen lässt.
                    const michaelEnd = (_michaelVisualDocTop + mh - window.innerHeight + MICHAEL_TALL_END_GAP) / (1 - BASE_UNTERPUNKT_SPEED);
                    _endFloor = Math.max(_endFloor, michaelEnd + 200, sMichaelCenter + 200);
                }
                _sMichaelForEnd = _endFloor;
            }
        } else if (_isPortraitLayout() && window.innerWidth >= 641 && _michaelVisualDocTop > 0) {
            // Portrait/Tablet: Michael-Snap mittig (Bildmitte = Viewport-Mitte), mit Magnet.
            const michaelEl = document.getElementById('michael-image-with-info');
            if (michaelEl) {
                const sMichaelCenter = (_michaelVisualDocTop + michaelEl.offsetHeight / 2 - _layoutH() / 2) / (1 - BASE_UNTERPUNKT_SPEED);
                if (sMichaelCenter > 100) _namedPoints.push({ s: sMichaelCenter, name: 'MICHAEL' });
            }
        }

        _namedPoints.sort((a, b) => a.s - b.s);
        meetingPoints = _namedPoints.map(p => p.s);
        meetingPointNames = _namedPoints.map(p => p.name);
        _namedPoints.forEach(p => { if (p.zone !== undefined) meetingPointZoneOverrides.set(p.s, p.zone); });
        window.__snapInfo = _namedPoints.map(p => ({ name: p.name, s: Math.round(p.s), meetY: Math.round(p.meetY || 0), anchorStart: Math.round(p.anchorStart || 0) }));

        const spacer = document.getElementById('scroll-spacer');
        if (spacer) spacer.style.height = '0px';

        // Breites Landscape-Gerät (Desktop ODER iPad ohne Maus): Seitenende "von unten"
        // (Michael GAP über der Kante), OHNE Magnet dort. Spacer per _applyEndSpacer() so setzen,
        // dass maxScroll == sEnd. Vorher nur Hover-Geräte → iPad ohne Maus konnte nicht zu Michael scrollen.
        const _wideEnd = window.innerWidth >= BREAKPOINT_MOBILE;
        if (_wideEnd && spacer && !_isPortraitLayout() && _sMichaelForEnd > 0) {
            _endSEnd = _applyEndSpacer(Math.round(_sMichaelForEnd));
            return;
        }
        _endSEnd = 0;

        // Mobile/Fallback-Spacer: Seite bis zum letzten Snap scrollbar machen
        if (spacer && meetingPoints.length > 0) {
            const lastSnap = meetingPoints[meetingPoints.length - 1];
            let vhRef = _layoutH();
            let needed = lastSnap;
            if (_narrowHoverSnap) {
                // narrowHover: Seitenende so, dass die GESICHTEN-Box vollständig über die Viewport-
                // Oberkante scrollt. Box-Visual-Unterkante = _gesichtenWrapperDocTop − scrollY·0,65
                // + 46 (mobileGesichtenOffset) − 1500 (gesichtenHoverOffset) + Boxhöhe. Für < 0 lösen,
                // plus Leerraum. vhRef = echte Fensterhöhe → maxScroll == needed (sonst bei hohem
                // Fenster zu kurz, weil _layoutH() fest 700 ist).
                const gesichtenBox = document.getElementById('gesichten-content-box-wrapper');
                const gesH = gesichtenBox ? gesichtenBox.offsetHeight : 0;
                needed = (_gesichtenWrapperDocTop + 46 - 1500 + gesH) / (1 - BASE_PARALLAX_SPEED) + 120;
                // Michael (Unterpunkt-Bild, Speed 0,5) liegt unter der GESICHTEN-Box und würde bei
                // niedriger Fensterhöhe (z. B. MacBook 11") unten abgeschnitten. Ende mindestens so,
                // dass seine visuelle Unterkante (_michaelVisualDocTop + mh − s·0,5) bei der aktuellen
                // Fensterhöhe mit kleinem Rand sichtbar ist.
                const michaelEl = document.getElementById('michael-image-with-info');
                if (michaelEl && _michaelVisualDocTop > 0) {
                    const mh = michaelEl.offsetHeight;
                    const michaelEnd = (_michaelVisualDocTop + mh - window.innerHeight + 40) / (1 - BASE_UNTERPUNKT_SPEED);
                    needed = Math.max(needed, michaelEnd);
                }
                vhRef = window.innerHeight;
            } else if (window.innerWidth < BREAKPOINT_MOBILE) {
                // Mobile (Touch): GESICHTEN-Text scrollt über die Michael-Position hinaus
                const gesichtenBox = document.getElementById('gesichten-content-box-wrapper');
                const gesichtenHeight = gesichtenBox ? gesichtenBox.offsetHeight : 0;
                const meetY = _layoutH() * 0.70;
                // +800px extra Scrollweg, damit GESICHTEN ganz hochscrollt und Michael sichtbar bleibt
                needed = Math.max(needed, lastSnap + (meetY + gesichtenHeight) / (1 - BASE_PARALLAX_SPEED) + 800);
            }
            const contentHeight = document.body.scrollHeight; // spacer ist bereits 0
            spacer.style.height = Math.max(0, needed - contentHeight + vhRef) + 'px';
        }
    }

    function slowScrollTo(target) {
        // Momentum-Scroll einfrieren, damit er nicht mit der Animation kämpft
        window.scrollTo({ top: window.scrollY, behavior: 'instant' });
        const start = window.scrollY;
        const distance = target - start;
        // Dauer skaliert mit Distanz: 350ms (nah) bis 650ms (weit)
        const duration = Math.min(650, Math.max(350, Math.abs(distance) * 0.5));
        let startTime = null;

        // Cubic Ease-In-Out: sanfter Start, Beschleunigung, weiches Ankommen
        function magnetEase(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            window.scrollTo(0, start + distance * magnetEase(progress));
            if (progress < 1) {
                magnetAnimFrame = requestAnimationFrame(step);
            } else {
                window.scrollTo(0, target);
                isSnapping = false;
                magnetAnimFrame = null;
            }
        }

        if (magnetAnimFrame) cancelAnimationFrame(magnetAnimFrame);
        isSnapping = true;
        magnetAnimFrame = requestAnimationFrame(step);
    }

    function cancelMagnetSnap() {
        if (magnetAnimFrame) {
            cancelAnimationFrame(magnetAnimFrame);
            magnetAnimFrame = null;
            isSnapping = false;
        }
    }

    // =============== CONTENT BOX POSITIONIERUNG ===============
    // Box wird relativ zu Alex positioniert (fixer Abstand)

    // Dynamischer Abstand Alex-Unterkante zu Box-Oberkante
    const BOX_ALEX_GAP_NARROW = 150; // Kleinerer Abstand für schmale Fenster
    const BOX_ALEX_GAP_WIDE = 290;   // Originalwert für breite Fenster

    // Portrait-Modus: zusätzlicher Abstand Alex→KONZEPT-Box (siehe Portrait-Kommentarblock bei getMeetingRatio())
    const PORTRAIT_BOX_OFFSET = 70;
    // Smartphone: zusätzlicher Abstand Alex→KONZEPT-Box
    const MOBILE_BOX_OFFSET = 150;

    function getBoxAlexGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        let gap = BOX_ALEX_GAP_NARROW + widthFactor * (BOX_ALEX_GAP_WIDE - BOX_ALEX_GAP_NARROW);
        // Portrait-Modus: KONZEPT-Block weiter von Alex entfernt (aspectRatio > 1.2)
        // narrowHover: immer anwenden, damit der Abstand fensterhöhen-unabhängig bleibt
        const _isNarrowHover_bag = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isPortraitLayout() || _isNarrowHover_bag) {
            gap += PORTRAIT_BOX_OFFSET;
        }
        // Smartphone: extra Abstand
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            gap += MOBILE_BOX_OFFSET;
        }
        return gap;
    }

    // positionContentBox() entfällt — Box-Wrapper wird jetzt in positionAnchors() +
    // applyParallaxEffect() via position:fixed + transform:translate3d positioniert.

    // =============== RIVUS & BOX 2 POSITIONIERUNG ===============
    // Dynamischer Abstand zwischen Box 1 und Box 2/RIVUS
    // Bei schmalem Fenster kleinerer Abstand, bei breitem Fenster größerer Abstand

    // Mindestabstand Box1-Unterkante zu Box2-Oberkante (in Pixel)
    const BOX_GAP_NARROW = -250; // Bei 400px Viewport (negativ = höher/Überlappung)
    const BOX_GAP_WIDE = 370;     // Bei 1400px Viewport (positiv = tiefer)

    // Breakpoint für Mobile/Desktop
    const BREAKPOINT_MOBILE = 640;

    function getBoxGap() {
        if (window.innerWidth >= BREAKPOINT_MOBILE && window.__debug && window.__debug.mode === 'vh' && window.__debug.boxGapFactor !== undefined) {
            return window.innerHeight * window.__debug.boxGapFactor;
        }
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        let gap = BOX_GAP_NARROW + widthFactor * (BOX_GAP_WIDE - BOX_GAP_NARROW);
        // Smartphone: alles ab RIVUS 300px tiefer
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            gap += 300;
        }
        return gap;
    }

    // vh-basierte Fluss-Maße einfrieren, damit Fensterhöhen-Änderungen den Content nur
    // offenlegen/verstecken statt die Textblöcke neu anzuordnen.
    // - narrowHover (<640, hover): feste 700px-Referenz (getunte Werte)
    // - Desktop/iPad-Layout im Browser (>=640, hover): Referenz = Höhe beim Laden;
    //   wird nur bei Breiten- oder Moduswechsel (Portrait-Schwelle 1,2) neu erfasst.
    // - Touch-Geräte: unverändert (CSS gilt; echte iPads ändern ihre Höhe nicht stufenlos)
    _updateAspectClasses(); // initiale Body-Klassen (Ersatz für aspect/orientation-Media-Queries)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        // Scroll-Anchoring aus: Browser darf scrollY beim Resize-Relayout nicht selbst nachjustieren
        document.documentElement.style.overflowAnchor = 'none';
    }

    // iOS Safe Areas: viewport-fit=cover aktivieren und zwei Rahmenfarb-Flächen einsetzen,
    // die Notch (oben) und Home-Indicator (unten) abdecken, damit dort keine Inhalte hinter
    // den durchscheinenden Safari-Balken sichtbar bleiben (iOS 26). CSS: #safe-area-top/-bottom.
    (function initSafeAreaFrame() {
        const vp = document.querySelector('meta[name="viewport"]');
        if (vp && !/viewport-fit/.test(vp.getAttribute('content') || '')) {
            vp.setAttribute('content', vp.getAttribute('content') + ', viewport-fit=cover');
        }
        if (!document.getElementById('safe-area-top')) {
            const top = document.createElement('div');    top.id = 'safe-area-top';
            const bottom = document.createElement('div'); bottom.id = 'safe-area-bottom';
            document.body.appendChild(top);
            document.body.appendChild(bottom);
        }
    })();

    // ===== Snap-Debug-Overlay (nur bei URL-Hash #debug) =====
    // Zeigt live: Fenster-/Layouthöhe, scrollY und je Snap: sMeet (s), meetY (mY),
    // tatsächliche Anchor-Oberkante (top) und rechnerische Anchor-Oberkante (vc).
    // Diagnose: bei Snap ist sY≈s; dann sollte top≈mY sein. top≠vc ⇒ anchorStart passt
    // nicht zur Sichtposition; top≪mY ⇒ Anchor sitzt über der gewünschten Linie.
    if (/debug/i.test(location.hash)) {
        const dbg = document.createElement('div');
        dbg.id = 'snap-debug';
        dbg.style.cssText = 'position:fixed;left:0;top:env(safe-area-inset-top,0);padding:4px 8px 6px;'
            + 'z-index:90000;background:rgba(0,0,0,.82);color:#0f0;'
            + 'font:11px/1.3 ui-monospace,monospace;white-space:pre;pointer-events:none;max-width:82vw;';
        document.body.appendChild(dbg);
        const sel = { KONZEPT: '.konzept-heading-anchor', RIVUS: '.rivus-anchor-gray', MYTHUS: '#mythus-anchor', GESICHTEN: '#gesichten-anchor-gray' };
        const selFill = { KONZEPT: '.konzept-heading-filled', RIVUS: '.rivus-anchor-filled', MYTHUS: '#mythus-filled', GESICHTEN: '#gesichten-anchor-filled' };
        const renderDbg = () => {
            const sY = window.scrollY;
            const L = ['iH=' + window.innerHeight + ' lH=' + Math.round(_layoutH()) + ' sY=' + Math.round(sY) + ' port=' + (_isPortraitLayout() ? 1 : 0)];
            const _sat = document.getElementById('safe-area-top');
            const _sab = document.getElementById('safe-area-bottom');
            L.push('SAT h=' + (_sat ? _sat.offsetHeight : 'MISSING') + ' z=' + (_sat ? getComputedStyle(_sat).zIndex : '-') +
                   ' | SAB h=' + (_sab ? _sab.offsetHeight : 'MISSING'));
            (window.__snapInfo || []).forEach(p => {
                const el = document.querySelector(sel[p.name] || '');
                const elF = document.querySelector(selFill[p.name] || '');
                const top = el ? Math.round(el.getBoundingClientRect().top) : '-';
                const fil = elF ? Math.round(elF.getBoundingClientRect().top) : '-';
                L.push(p.name.slice(0, 4) + ' s=' + p.s + ' mY=' + p.meetY + ' gray=' + top + ' fill=' + fil);
            });
            dbg.textContent = L.join('\n');
        };
        window.addEventListener('scroll', renderDbg, { passive: true });
        setInterval(renderDbg, 400);
        renderDbg();
    }

    function applyFrozenViewportMetrics() {
        const isHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const nh = isHover && window.innerWidth < 640;
        const wide = isHover && window.innerWidth >= 640;

        const refH = _layoutH(); // Hover: feste Referenzhöhe (700 / DESKTOP_REF_HEIGHT), Touch: live
        const portrait = _isPortraitLayout();
        _updateAspectClasses();

        const containers = document.querySelectorAll('.konzept-heading-container, .rivus-anchor-container, .gesichten-anchor-container');
        containers.forEach(c => {
            if (nh) {
                c.style.minHeight = '700px';  // 100vh bei 700px Referenzhöhe
                c.style.paddingTop = '480px'; // 68.5vh bei 700px Referenzhöhe
            } else if (wide) {
                // Landscape: 100vh / 68.5vh — Portrait-Media (>=641): 75vh / 51vh
                c.style.minHeight = `${Math.round(portrait ? refH * 0.75 : refH)}px`;
                c.style.paddingTop = `${Math.round(portrait ? refH * 0.51 : refH * 0.685)}px`;
            } else {
                c.style.minHeight = '';
                c.style.paddingTop = '';
            }
        });
        // Box-Wrapper: margin-top clamp(-500px, -74vh, -350px) einfrieren.
        // Wird beim Fixieren ohnehin auf 0 gesetzt — relevant nur für die Fluss-Messung der DocTops.
        document.querySelectorAll('.content-box-wrapper-2').forEach(w => {
            if (w.style.position === 'fixed') return;
            if (nh) w.style.marginTop = '-500px'; // clamp-Wert bei 700px
            else if (wide) w.style.marginTop = `${Math.round(Math.min(-350, Math.max(-500, -0.74 * refH)))}px`;
            else w.style.marginTop = '';
        });
        // Bild-Container (Ben/Daniel/Michael) + MALEREI-Container: vh-Maße einfrieren.
        // Sie liegen im Fluss VOR dem MYTHUS-Wrapper (der nicht fixed ist) — ohne feste
        // Höhen wandert die MYTHUS-Box live mit, während das Fenster gezogen wird.
        document.querySelectorAll('.unterpunkt-heading-container').forEach(c => {
            if (nh) {
                c.style.minHeight = '700px';   // 100vh bei 700px Referenzhöhe
                c.style.paddingTop = '1085px'; // 50vh + 735px bei 700px Referenzhöhe
            } else if (wide) {
                c.style.minHeight = `${refH}px`;
                c.style.paddingTop = `${Math.round(refH * 0.5 + 735)}px`;
            } else {
                c.style.minHeight = '';
                c.style.paddingTop = '';
            }
        });
        const mainHeadingContainer = document.querySelector('.main-heading-container');
        if (mainHeadingContainer) {
            if (nh) {
                mainHeadingContainer.style.minHeight = '700px'; // padding bleibt CSS (mobile: px-fix)
                mainHeadingContainer.style.paddingTop = '';
            } else if (wide) {
                mainHeadingContainer.style.minHeight = `${refH}px`;
                // --heading-top-offset: clamp(100px, 18vh, 200px), im Portrait-Media -50px
                const pt = Math.min(200, Math.max(100, 0.18 * refH)) - (portrait ? 50 : 0);
                mainHeadingContainer.style.paddingTop = `${Math.round(pt)}px`;
            } else {
                mainHeadingContainer.style.minHeight = '';
                mainHeadingContainer.style.paddingTop = '';
            }
        }
        // vh-basierte :root-Variablen einfrieren (Ben-Bildhöhe, filled/outline-Offsets).
        // Auf Touch-Geräten entfernt → Original-CSS gilt.
        const rootStyle = document.documentElement.style;
        if (nh) {
            // Werte der Mobile-Media (<640) bei 700px Referenzhöhe; Bildhöhe bleibt CSS (80vh)
            rootStyle.setProperty('--konzept-offset', '280px');   // clamp(200px, 40vh, 350px)
            rootStyle.setProperty('--gesichten-offset', '245px'); // clamp(180px, 35vh, 300px)
            rootStyle.removeProperty('--image-ben-height');
        } else if (wide) {
            rootStyle.setProperty('--konzept-offset', `${Math.round(Math.min(600, Math.max(300, 0.53 * refH)))}px`);
            rootStyle.setProperty('--gesichten-offset', `${Math.round(Math.min(550, Math.max(250, 0.47 * refH)))}px`);
            const benH = window.innerWidth <= 1024
                ? Math.min(400, Math.max(180, 0.35 * refH))   // @media (max-width: 1024px)
                : Math.min(500, Math.max(200, 0.40 * refH));  // Basis
            rootStyle.setProperty('--image-ben-height', `${Math.round(benH)}px`);
        } else {
            rootStyle.removeProperty('--konzept-offset');
            rootStyle.removeProperty('--gesichten-offset');
            rootStyle.removeProperty('--image-ben-height');
        }
        // Michael-Bild: CSS max-height 80vh (>=641) einfrieren; Desktop zusätzlich vergrößern.
        // "Großer Michael" (hohe Fenster): Größe EXPLIZIT setzen — Breite = Fensterbreite − Ränder
        // bestimmt, Höhe folgt dem Hochformat, gedeckelt auf Fensterhöhe − MARGIN (kein Verzerren).
        // (width:100% allein vergrößert das Bild nicht über seine intrinsische Größe hinaus.)
        const michaelImg = document.querySelector('#michael-image-with-info .unterpunkt-heading-image');
        if (michaelImg) {
            if (_michaelTall()) {
                let w = window.innerWidth - 2 * MICHAEL_TALL_SIDE;
                let h = w * MICHAEL_ASPECT_HW;
                const hMax = window.innerHeight - MICHAEL_TALL_MARGIN;
                if (h > hMax) { h = hMax; w = h / MICHAEL_ASPECT_HW; }
                michaelImg.style.width = `${Math.round(w)}px`;
                michaelImg.style.height = `${Math.round(h)}px`;
                michaelImg.style.maxWidth = 'none';
                michaelImg.style.maxHeight = 'none';
            } else if (wide) {
                michaelImg.style.width = '';
                michaelImg.style.height = '';
                michaelImg.style.maxWidth = '';
                michaelImg.style.maxHeight = `${Math.round(0.8 * refH) + MICHAEL_DESKTOP_GROW}px`;
            } else {
                michaelImg.style.width = '';
                michaelImg.style.height = '';
                michaelImg.style.maxWidth = '';
                michaelImg.style.maxHeight = '';
            }
        }
    }

    function positionGesichtenAndBox2() {
        const box1 = document.querySelector('.content-box');
        const alexImage = document.querySelector('.main-heading-image');
        const gesichtenContainer = document.querySelector('.rivus-anchor-container');

        if (!box1 || !alexImage || !gesichtenContainer) return;

        // WICHTIG: Zuerst marginTop zurücksetzen, um die natürliche Position zu messen
        gesichtenContainer.style.marginTop = '0px';

        const alexBaseTop = getDocumentTop(alexImage);
        const alexHeight = alexImage.offsetHeight;
        const box1LogicalTop = alexBaseTop + alexHeight + getBoxAlexGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;
        const gesichtenBaseTop = getDocumentTop(gesichtenContainer);

        // narrowHover: feste Referenzhöhe statt 80vh → snap-Abstände unabhängig von Fensterhöhe
        const _isNarrowHover_gab2 = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_gab2) {
            // fester sichtbarer Abstand KONZEPT→RIVUS (+300 kompensiert rivusHoverOffset)
            const targetTop = box1LogicalBottom + NH_BLOCK_GAP_UPPER + 300;
            const offset = targetTop - gesichtenBaseTop;
            gesichtenContainer.style.marginTop = `${offset}px`;
            return;
        }

        // Smartphone: RIVUS nach Ben positionieren
        // Ben ist position:fixed, daher Höhe aus CSS (80vh) manuell berechnen
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const benHeight = window.innerHeight * 0.80;
            const benBottom = box1LogicalBottom + UNTERPUNKT_BOX_GAP + benHeight;
            const targetTop = benBottom + 40 - 300; // 300px höher (150 + 150)
            const offset = targetTop - gesichtenBaseTop;
            gesichtenContainer.style.marginTop = `${offset}px`;
            return;
        }

        // Desktop (Landscape): fester Oberkanten-Abstand KONZEPT-Box → RIVUS-Box.
        // Unabhängig von Blockhöhen → Sprachniveau-Wechsel verschiebt keine Folgeblöcke.
        if (!_isPortraitLayout()) {
            const box2Wrapper = document.getElementById('rivus-content-box-wrapper');
            if (box2Wrapper && box2Wrapper.style.position !== 'fixed') {
                const delta = getDocumentTop(box2Wrapper) - gesichtenBaseTop; // Container-OK → Box-OK
                const targetContainerTop = box1LogicalTop + BLOCK_PITCH_DESKTOP - delta;
                gesichtenContainer.style.marginTop = `${targetContainerTop - gesichtenBaseTop}px`;
                return;
            }
        }

        // Dynamischer Mindestabstand (- 150px: alle Blöcke ab Block 2 höher)
        const _krDiff = (window.__debug && window.__debug.konzeptRivusDiff !== undefined) ? window.__debug.konzeptRivusDiff : -165;
        let minGap = getBoxGap() + _krDiff;
        // Portrait-Modus: RIVUS-Anchor + Textbox 230px tiefer (80 + 150)
        if (_isPortraitLayout()) {
            minGap += 230;
        }

        const naturalGap = gesichtenBaseTop - box1LogicalBottom;
        const offset = minGap - naturalGap;
        gesichtenContainer.style.marginTop = `${offset}px`;
    }

    function positionRivusAndBox3() {
        const mythusBox = document.getElementById('mythus-box');
        const rivusContainer = document.getElementById('gesichten-anchor-container');

        if (!mythusBox || !rivusContainer) return;

        rivusContainer.style.marginTop = '0px';

        // Desktop (Landscape): fester Oberkanten-Abstand MYTHUS-Box → GESICHTEN-Box
        if (!_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) {
            const box3Wrapper = document.getElementById('gesichten-content-box-wrapper');
            if (box3Wrapper && box3Wrapper.style.position !== 'fixed') {
                const mythusBoxTopP = getMythusBoxLogicalTop();
                const rivusBaseTopP = getDocumentTop(rivusContainer);
                const deltaP = getDocumentTop(box3Wrapper) - rivusBaseTopP; // Container-OK → Box-OK
                rivusContainer.style.marginTop = `${(mythusBoxTopP + BLOCK_PITCH_DESKTOP - deltaP) - rivusBaseTopP}px`;
                return;
            }
        }

        const _isNarrowHover_r3 = window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth < 640;
        if (_isNarrowHover_r3) {
            // testweise: fester sichtbarer Abstand MYTHUS→GESICHTEN (+700 kompensiert hoverOffset-Differenz)
            const mythusBoxBottom = getMythusBoxLogicalTop() + mythusBox.offsetHeight; // tatsächliche MYTHUS-Box-Unterkante
            const rivusBaseTop = getDocumentTop(rivusContainer);
            const offset = (mythusBoxBottom + NH_BLOCK_GAP + 700) - rivusBaseTop;
            rivusContainer.style.marginTop = `${offset}px`;
            return;
        }
        let minGap = getBoxGap();
        // Portrait-Modus: GESICHTEN-Block 20px tiefer — fester Wert, gilt auch in narrowHover
        if (_isPortraitLayout()) {
            minGap += 20;
        }

        const mythusBoxLogicalTop = getMythusBoxLogicalTop();
        const mythusBoxHeight = mythusBox.offsetHeight;
        const mythusBoxLogicalBottom = mythusBoxLogicalTop + mythusBoxHeight;

        const rivusBaseTop = getDocumentTop(rivusContainer);

        const naturalGap = rivusBaseTop - mythusBoxLogicalBottom;
        let offset = minGap - naturalGap - 20;
        const isPortrait = _isPortraitLayout();
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
        const _rgExtra = (window.__debug && window.__debug.gesichtenExtraOffset !== undefined) ? window.__debug.gesichtenExtraOffset : -100;
        if (!isPortrait && !isMobile) offset += _rgExtra;
        // Mobile: fester Offset statt 0.9*vh damit narrowHover fensterhöhen-unabhängig bleibt
        if (isMobile && _isNarrowHover_r3) { offset += 180; } // ≈ 0.9*700 - 450, fester Referenzwert
        else if (isMobile) { offset += Math.round(window.innerHeight * 0.9); offset -= 450; }
        rivusContainer.style.marginTop = `${offset}px`;
    }

    // =============== BEN POSITIONIERUNG ===============
    // Bei breiten Fenstern: Ben neben Box 2 (mittig vertikal)
    // Bei schmalen Fenstern: Ben unter Box 2 mit Parallax-Erscheinen

    // Abstand Unterpunkt-Bild-Oberkante zu Box-Unterkante (bei schmalen Fenstern)
    const UNTERPUNKT_BOX_GAP = -160; // Pixel unter Box (negativ = überlappt)

    // Ben-Parallax-Geschwindigkeit für schmale Fenster (wird berechnet)
    let benMobileParallaxSpeed = BASE_UNTERPUNKT_SPEED;

    function calculateBenMobileParallaxSpeed() {
        if (window.innerWidth >= BREAKPOINT_MOBILE) return; // Nur für schmale Fenster

        const benContainer = document.getElementById('ben-image-with-info');
        const contentBox2 = document.getElementById('rivus-content-box');

        if (!benContainer || !contentBox2) return;

        // Treffpunkt: Ben soll bei diesem Viewport-Anteil erscheinen
        const meetingRatio = getMeetingRatio();
        const meetY = _layoutH() * meetingRatio;

        // Ben's Startposition
        const benStart = getDocumentTop(benContainer);

        // Box2's Startposition (Ben soll unter Box2 erscheinen)
        const box2Start = getDocumentTop(contentBox2);
        const box2Height = contentBox2.offsetHeight;
        const targetBenPos = box2Start + box2Height + UNTERPUNKT_BOX_GAP - 900; // Mobile: 900px höher

        // Box2's effektive Geschwindigkeit
        const box2EffectiveSpeed = BASE_PARALLAX_SPEED;

        // Berechne Geschwindigkeit, damit Ben bei meetY mit Box2-Unterkante zusammentrifft
        const numerator = (benStart - meetY) * (1 - box2EffectiveSpeed);
        const denominator = targetBenPos - meetY;

        if (Math.abs(denominator) < 10) {
            benMobileParallaxSpeed = box2EffectiveSpeed;
        } else {
            benMobileParallaxSpeed = 1 - numerator / denominator;
        }

        // Begrenze auf sinnvollen Bereich
        benMobileParallaxSpeed = Math.max(-0.5, Math.min(1, benMobileParallaxSpeed));

        console.log('=== BEN Mobile Parallax ===');
        console.log('Ben Start:', benStart.toFixed(0));
        console.log('Target (unter Box2):', targetBenPos.toFixed(0));
        console.log('MeetY:', meetY.toFixed(0));
        console.log('Berechnete Speed:', benMobileParallaxSpeed.toFixed(3));
        console.log('===========================');
    }

    function getBox3LogicalTop() {
        const mythusBox = document.getElementById('mythus-box');
        const rivusContainer = document.getElementById('gesichten-anchor-container');
        const rivusBoxWrapper = document.getElementById('gesichten-content-box-wrapper');

        if(!mythusBox || !rivusContainer || !rivusBoxWrapper) return 0;

        const mythusBoxLogicalTop = getMythusBoxLogicalTop();
        const mythusBoxHeight = mythusBox.offsetHeight;
        const mythusBoxLogicalBottom = mythusBoxLogicalTop + mythusBoxHeight;

        const minGap = getBoxGap();
        const rivusLogicalTop = mythusBoxLogicalBottom + minGap;

        const box3RelativeTop = getDocumentTop(rivusBoxWrapper) - getDocumentTop(rivusContainer);

        return rivusLogicalTop + box3RelativeTop;
    }

    // Hilfsfunktion: Berechne die logische Position von Box 2
    // (basierend auf Alex → Box 1 → Gap+600 → RIVUS → Box 2)
    function getBox2LogicalTop() {
        const box1 = document.querySelector('.content-box');
        const alexImage = document.querySelector('.main-heading-image');
        const gesichtenContainer = document.querySelector('.rivus-anchor-container');
        const box2Wrapper = document.getElementById('rivus-content-box-wrapper');

        if (!box1 || !alexImage || !gesichtenContainer || !box2Wrapper) return 0;

        // Box 1 als Referenz (RIVUS folgt direkt nach Box 1)
        const alexBaseTop = getDocumentTop(alexImage);
        const alexHeight = alexImage.offsetHeight;
        const box1LogicalTop = alexBaseTop + alexHeight + getBoxAlexGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;

        // Desktop (Landscape): Pitch-Logik — Box2-Oberkante = Box1-Oberkante + BLOCK_PITCH_DESKTOP
        if (!_isPortraitLayout() && window.innerWidth >= BREAKPOINT_MOBILE) {
            if (box2Wrapper.style.position === 'fixed') {
                return _box2WrapperDocTop;
            }
            return box1LogicalTop + BLOCK_PITCH_DESKTOP;
        }

        // RIVUS-Container startet nach dem dynamischen Gap (- 150px: alle Blöcke ab Block 2 höher)
        let minGap = getBoxGap() - 165;
        // Portrait-Modus: gleicher +230px-Offset wie in positionGesichtenAndBox2()
        if (_isPortraitLayout()) {
            minGap += 230;
        }
        const gesichtenLogicalTop = box1LogicalBottom + minGap;

        // Wenn Wrapper fixed: getDocumentTop() liefert 0 (falsch).
        // _box2WrapperDocTop nutzen – wird in recalculateLayout() nach positionGesichtenAndBox2()
        // über den Anchor-Container aktuell berechnet.
        if (box2Wrapper.style.position === 'fixed') {
            return _box2WrapperDocTop;
        }

        // Wrapper im Fluss: relativen Abstand aus DOM messen
        const box2RelativeTop = getDocumentTop(box2Wrapper) - getDocumentTop(gesichtenContainer);
        return gesichtenLogicalTop + box2RelativeTop;
    }

    function positionBen() {
        const benContainer = document.getElementById('ben-image-with-info');
        const benImage = benContainer ? benContainer.querySelector('.unterpunkt-heading-image') : null;
        const contentBox2 = document.getElementById('rivus-content-box');
        const unterpunktContainer = document.getElementById('ben-container');
        const gesichtenContainer = document.querySelector('.rivus-anchor-container');
        const gesichtenAnchor = document.querySelector('.rivus-anchor-gray');

        if (!benContainer || !benImage || !contentBox2 || !unterpunktContainer || !gesichtenContainer || !gesichtenAnchor) return;

        // WICHTIG: Zuerst top zurücksetzen, um die natürliche Position zu messen
        benContainer.style.top = '0px';

        // Logische/natürliche Positionen der Elemente ermitteln
        // _box2WrapperDocTop: direkter DOM-Wert, konsistent mit Parallax-Engine
        const box2LogicalTop = _box2WrapperDocTop;
        const box2Height = contentBox2.offsetHeight;
        const benNaturalTop = getDocumentTop(benContainer);

        // Mobile: Ben statisch 15px unter Logo-Unterkante
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const headerEl = document.querySelector('header');
            const topPos = headerEl ? headerEl.offsetHeight + 15 : 50;
            benContainer.style.top = `${topPos}px`;
            const overlay = document.getElementById('ben-stair-overlay');
            if (overlay) {
                overlay.style.top = `${topPos}px`;
                const imgEl = benContainer.querySelector('.unterpunkt-heading-image');
                if (imgEl) overlay.style.height = imgEl.offsetHeight + 'px';
            }
            return;
        }

        // Bei breiten Bildschirmen: NEUE, PRÄZISE REGEL (bleibt unverändert)
        // Leitet den nötigen Offset ab, damit die Bildmitte die Boxmitte an dem exakten Scrollpunkt trifft,
        // an dem die "RIVUS"-Texte sich überlagern.

        // 1. Parameter sammeln
        const naturalTop_Box = box2LogicalTop;
        const naturalTop_Ben = benNaturalTop;
        const boxHeight = contentBox2.offsetHeight;
        const benImageHeight = benImage.offsetHeight;
        const speed_Box = BASE_PARALLAX_SPEED;
        const speed_Ben = BASE_UNTERPUNKT_SPEED;
        const anchorGap = getGesichtenAnchorGap();
        const anchorHeight = gesichtenAnchor.offsetHeight;

        // 2. Treffpunkt 'meetY' berechnen — identische Formel wie positionMythusDaniel + calculateMeetingPoints (RIVUS)
        const meetingRatio = getMeetingRatio();
        let meetY = _layoutH() * meetingRatio - 75;
        if (_isPortraitLayout()) {
            meetY += 60;
        } else {
            meetY -= 8;
            meetY = Math.max(meetY, _layoutH() * 0.07 + 50);
        }

        // 3. Den Scroll-Punkt 'S_meet' berechnen, an dem der Anchor den Treffpunkt erreicht
        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return; // Division durch Null vermeiden
        const S_meet = S_meet_numerator / S_meet_denominator;

        // 4. Oberkante des aktiven Textes messen (für Top-Top-Ausrichtung bei S_meet)
        const _activeTextBen = contentBox2.querySelector('.lang-text.active') || contentBox2;
        const _firstElBen = _activeTextBen.querySelector('h2, p');
        const textTopOffsetBen = _firstElBen
            ? _firstElBen.offsetTop
            : (parseFloat(getComputedStyle(contentBox2).paddingTop) || 0);
        const alignmentOffset_Ben = (naturalTop_Box - naturalTop_Ben) + textTopOffsetBen;
        const parallaxCorrection_Ben = S_meet * (speed_Box - speed_Ben);
        const isPortraitBen = _isPortraitLayout();
        const desktopOffsetBen = (window.innerWidth >= 1025 && !isPortraitBen) ? 15 : 0;
        const finalOffset = alignmentOffset_Ben + parallaxCorrection_Ben + desktopOffsetBen;
        benContainer.style.top = `${finalOffset}px`;
    }

    let michaelMobileParallaxSpeed = BASE_UNTERPUNKT_SPEED;

    function calculateMichaelMobileParallaxSpeed() {
        if (window.innerWidth >= BREAKPOINT_MOBILE) return;

        const michaelContainer = document.getElementById('michael-image-with-info');
        const rivusContentBox = document.getElementById('gesichten-content-box');

        if (!michaelContainer || !rivusContentBox) return;

        const meetingRatio = getMeetingRatio();
        const meetY = _layoutH() * meetingRatio;

        const michaelStart = getDocumentTop(michaelContainer);

        const box3Start = getDocumentTop(rivusContentBox);
        const box3Height = rivusContentBox.offsetHeight;
        const targetMichaelPos = box3Start + box3Height + UNTERPUNKT_BOX_GAP;

        const box3EffectiveSpeed = BASE_PARALLAX_SPEED;

        const numerator = (michaelStart - meetY) * (1 - box3EffectiveSpeed);
        const denominator = targetMichaelPos - meetY;

        if (Math.abs(denominator) < 10) {
            michaelMobileParallaxSpeed = box3EffectiveSpeed;
        } else {
            michaelMobileParallaxSpeed = 1 - numerator / denominator;
        }

        michaelMobileParallaxSpeed = Math.max(-0.5, Math.min(1, michaelMobileParallaxSpeed));
    }


    function positionMichaelAndMarcus() {
        const michaelContainer = document.getElementById('michael-image-with-info');
        if (!michaelContainer) return; // Guard clause
        const michaelImage = michaelContainer.querySelector('.unterpunkt-heading-image');
        const rivusContentBox = document.getElementById('gesichten-content-box');
        const unterpunktContainerForMichael = michaelContainer.closest('.unterpunkt-heading-container'); 
        const rivusContainer = document.getElementById('gesichten-anchor-container');
        const rivusAnchor = document.getElementById('gesichten-anchor-gray');

        // Also get Marcus container
        const marcusContainer = document.getElementById('marcus-image-with-info');

        if (!michaelImage || !rivusContentBox || !unterpunktContainerForMichael || !rivusContainer || !rivusAnchor) return;

        // "Großer Michael": aus dem Fluss (position:fixed via Body-Klasse). Trägt nicht zur
        // Dokumenthöhe bei → kein Aufblähen, Seitenende = GESICHTEN + Scrollweg wie gehabt.
        // Vertikalposition: in applyParallaxEffect fest unter die GESICHTEN-Box gekoppelt.
        if (_michaelTall()) {
            document.body.classList.add('michael-tall');
            michaelContainer.style.top = '';
            const outer = document.getElementById('michael-marcus-container');
            if (outer) { outer.style.minHeight = `${_layoutH()}px`; outer.style.marginBottom = ''; }
            return;
        }
        document.body.classList.remove('michael-tall');

        michaelContainer.style.top = '0px';
        if (marcusContainer) {
            marcusContainer.style.top = '0px';
        }


        const box3LogicalTop = getBox3LogicalTop();
        const box3Height = rivusContentBox.offsetHeight;
        const michaelNaturalTop = getDocumentTop(michaelContainer);

        // Mobile: Michael + Marcus statisch 15px unter Logo-Unterkante
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const headerEl = document.querySelector('header');
            const topPos = headerEl ? headerEl.offsetHeight + 15 : 50;
            michaelContainer.style.top = `${topPos}px`;
            if (marcusContainer) {
                marcusContainer.style.top = `${topPos}px`;
            }
            return;
        }

        // Desktop logic for Michael
        const naturalTop_Box = box3LogicalTop;
        const naturalTop_Michael = michaelNaturalTop;
        const boxHeight = rivusContentBox.offsetHeight;
        const michaelHeight = michaelImage.offsetHeight;
        const speed_Box = BASE_PARALLAX_SPEED;
        // "Großer Michael": Box-Geschwindigkeit → parallaxCorrection = 0, Michael sitzt fest
        // (mitscrollend) direkt unter der GESICHTEN-Box.
        const speed_Michael = _michaelTall() ? BASE_PARALLAX_SPEED : BASE_UNTERPUNKT_SPEED;
        const anchorGap = getGesichtenAnchorGap();
        const anchorHeight = rivusAnchor.offsetHeight;

        const meetingRatio = getMeetingRatio();
        const meetY = _layoutH() * meetingRatio;

        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return;
        const S_meet = S_meet_numerator / S_meet_denominator;

        // Non-Mobile: Michael direkt unterhalb der GESICHTEN-Box (so groß wie möglich)
        // Formel: Michaels Oberkante trifft Box-Unterkante beim Snap-Punkt S_meet
        const alignmentOffset_Michael = (naturalTop_Box - naturalTop_Michael) + _cachedRivusBoxHeight;
        const parallaxCorrection_Michael = S_meet * (speed_Box - speed_Michael);
        const finalOffset = alignmentOffset_Michael + parallaxCorrection_Michael;

        const isPortrait = _isPortraitLayout();
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
        const desktopOffset = (!isPortrait && !isMobile) ? -100 : 0; // 20px tiefer (war -120)
        // Bild wuchs um MICHAEL_DESKTOP_GROW (max-height): Oberkante um denselben Betrag
        // anheben → Bild wächst nach oben, Unterkante bleibt fix. Im "großen Michael"-Modus
        // entfällt das (Bild ist per Höhe groß, sitzt fest unter der Box).
        const michaelGrowShift = (!isPortrait && !isMobile && !_michaelTall()) ? -MICHAEL_DESKTOP_GROW : 0;
        const imageTop = finalOffset + desktopOffset + michaelGrowShift;
        // naturalTop wurde mit style.top='0px' gemessen → sicher positions-unabhängig
        _michaelVisualDocTop = michaelNaturalTop + imageTop;
        michaelContainer.style.top = `${imageTop}px`;

        // Container-Mindesthöhe: sicherstellen, dass Michael vollständig sichtbar ist.
        const outerContainer = document.getElementById('michael-marcus-container');
        if (outerContainer && michaelImage) {
            const required = _michaelTall()
                ? _layoutH()
                : imageTop + michaelImage.offsetHeight + 120; // 120px Abstand am Ende
            outerContainer.style.minHeight = `${Math.max(required, _layoutH())}px`;
            // "Großer Michael" nimmt als Flex-Kind vollen Fluss-Platz und bläht den Container
            // (und damit body > html) auf. Den Überstand gegenüber der normalen Bildhöhe per
            // negativem margin-bottom kompensieren → Dokumenthöhe bleibt korrekt, Bild sichtbar.
            if (_michaelTall()) {
                const normalH = 0.8 * _layoutH() + MICHAEL_DESKTOP_GROW;
                const extra = michaelImage.offsetHeight - normalH;
                outerContainer.style.marginBottom = `${-Math.max(0, Math.round(extra))}px`;
            } else {
                outerContainer.style.marginBottom = '';
            }
        }
        // Marcus wird per CSS auf Non-Mobile versteckt
    }
    
    // =============== ANCHOR-POSITIONIERUNG (transform-basiert) ===============
    // Anchors sind eigenständige Geschwister-Elemente (nicht in Wrappern).
    // Sie werden per position:fixed + transform:translate3d positioniert,
    // damit sie im selben GPU-Compositor-Pipeline wie ihre Boxen laufen.
    // Z-Reihenfolge: Anchor(0) < Filled(1) < Box(2) < Outline(5)
    function positionAnchors() {
        // Alex-Daten für Box-1-Berechnung cachen
        _boxAlexGap = getBoxAlexGap();
        if (_alexImage) {
            _alexDocTop = getDocumentTop(_alexImage);
            _alexHeight = _alexImage.offsetHeight;
        }

        // Box 1 Wrapper: position:fixed, Vertikalposition via transform
        if (_contentBoxWrapper) {
            const scrollY = window.scrollY;
            const boxTop = _alexDocTop + _alexHeight - scrollY * (1 - BASE_PARALLAX_SPEED) + _boxAlexGap;
            _contentBoxWrapper.style.position = 'fixed';
            _contentBoxWrapper.style.top = '0';
            _contentBoxWrapper.style.left = '0';
            _contentBoxWrapper.style.width = '100%';
            _contentBoxWrapper.style.marginTop = '0';
            _contentBoxWrapper.style.transform = `translate3d(0, ${boxTop}px, 0)`;
        }

        // Alle Anchors auf position:fixed setzen
        const anchors = [_konzeptAnchor, _rivusAnchor, _mythusAnchor, _gesichtenAnchorGray];
        for (const el of anchors) {
            if (el) {
                el.style.position = 'fixed';
                el.style.top = '0';
                el.style.left = '0';
            }
        }

        // KONZEPT Anchor
        if (_konzeptAnchor && _konzeptFilled) {
            _konzeptAnchorHeight = _konzeptAnchor.offsetHeight;
            _konzeptAnchorGap = getKonzeptAnchorGap();
            _konzeptAnchorLeft = _konzeptFilled.getBoundingClientRect().left;
        }

        // RIVUS Anchor + Content Box Wrapper auf position:fixed (wie KONZEPT)
        if (_rivusAnchor && _rivusFilled && _rivusContentBoxWrapper2) {
            _rivusAnchorHeight2 = _rivusAnchor.offsetHeight;
            _rivusAnchorGap2 = getGesichtenAnchorGap();
            if (_rivusContentBoxWrapper2.style.position !== 'fixed') {
                _box2WrapperDocTop = getDocumentTop(_rivusContentBoxWrapper2);
                // Touch-Mobile: RIVUS im Dokument tiefer setzen → größerer Konzept→RIVUS-Abstand,
                // kleinerer RIVUS→MYTHUS-Abstand. Verschiebt Snap UND Render konsistent (kein Sprung). Tunbar.
                if (_isPhone()) _box2WrapperDocTop += 170;
            }
            _rivusContentBoxWrapper2.style.position = 'fixed';
            _rivusContentBoxWrapper2.style.top = '0';
            _rivusContentBoxWrapper2.style.left = '0';
            _rivusContentBoxWrapper2.style.width = '100%';
            _rivusContentBoxWrapper2.style.marginTop = '0';
            // Sofortiger Transform wie bei KONZEPT (verhindert Sprung auf Top:0)
            const scrollY0 = window.scrollY;
            _rivusContentBoxWrapper2.style.transform = `translate3d(0, ${_box2WrapperDocTop - scrollY0 * (1 - BASE_PARALLAX_SPEED)}px, 0)`;
            _rivusAnchorLeft = _rivusFilled.getBoundingClientRect().left;
        }

        // MYTHUS Anchor
        if (_mythusAnchor && _mythusFilled && _mythusBoxWrapper) {
            _mythusAnchorHeight2 = _mythusAnchor.offsetHeight;
            _mythusAnchorGap2 = getKonzeptAnchorGap();
            // docTop nur im Fluss messen (bei fixiertem Wrapper liefert getDocumentTop 0) – wie GESICHTEN.
            if (_mythusBoxWrapper.style.position !== 'fixed') {
                _mythusWrapperDocTop = getDocumentTop(_mythusBoxWrapper);
            }
            _mythusAnchorLeft = _mythusFilled.getBoundingClientRect().left;
        }

        // GESICHTEN Anchor
        if (_gesichtenAnchorGray && _gesichtenAnchorFilled && _gesichtenContentBoxWrapper) {
            _gesichtenAnchorHeight2 = _gesichtenAnchorGray.offsetHeight;
            _gesichtenAnchorGap2 = getGesichtenAnchorGap();
            if (_gesichtenContentBoxWrapper.style.position !== 'fixed') {
                _gesichtenWrapperDocTop = getDocumentTop(_gesichtenContentBoxWrapper);
            }
            _gesichtenAnchorLeft = _gesichtenAnchorFilled.getBoundingClientRect().left;
        }

        _anchorsReady = true;

        // Sofort erste korrekte Position setzen
        applyParallaxEffect(window.scrollY);
    }

    // Initial positionieren nach Laden aller Bilder
    // Reihenfolge: Box 1 → RIVUS (Block 2) → Ben → MYTHUS (Block 3) → Daniel → GESICHTEN (Block 4) → Michael/Marcus
    window.addEventListener('load', () => {
        // Box-Höhen einmalig einfrieren (vor jedem Sprachenwechsel)
        const _box2El = document.getElementById('rivus-content-box');
        const _mythusBoxEl = document.getElementById('mythus-box');
        const _gesichtenBoxEl = document.getElementById('gesichten-content-box');
        if (_box2El) _cachedBox2Height = _box2El.offsetHeight;
        if (_mythusBoxEl) _cachedMythusBoxHeight = _mythusBoxEl.offsetHeight;
        if (_gesichtenBoxEl) _cachedRivusBoxHeight = _gesichtenBoxEl.offsetHeight;

        recalculateLayout();
        // Anchors sind jetzt positioniert → einblenden (verhindert FOUC oben links).
        document.body.classList.add('layout-ready');

        // Touch-Geräte (iPhone UND iPad): Alex-Treppentext direkt aktiv zeigen. Beim ersten Scrollen
        // wieder ausblenden, da der Ghost position:fixed ist und sonst oben am Bildschirm kleben bliebe.
        if (navigator.maxTouchPoints > 0) {
            requestAnimationFrame(() => {
                const alexContainer = document.querySelector('.main-heading-container .image-with-info');
                if (alexContainer && !alexContainer.classList.contains('info-active')) {
                    alexContainer.classList.add('info-active');
                    activateStairGhost(alexContainer);
                    window.addEventListener('scroll', () => {
                        document.querySelectorAll('.info-active').forEach(clearInfoOverlay);
                    }, { passive: true, once: true });
                }
            });
        }

        // Sanfte Theme-Transitions erst nach initialem Rendern aktivieren
        requestAnimationFrame(() => {
            document.body.classList.add('theme-transitioning');
            document.documentElement.classList.add('theme-transitioning');
        });
    });
    // Sicherheitsnetz: falls das load-Event ausbleibt, Anchors trotzdem nach 4s zeigen.
    setTimeout(() => document.body.classList.add('layout-ready'), 4000);

    // Tap-to-Toggle für Bild-Info (Mobile: alle Bilder inkl. Alex; Desktop: nur Klick)
    const allInfoImages = document.querySelectorAll(
        '.image-with-info, #ben-image-with-info, #mythus-daniel-image-with-info, #michael-image-with-info, #marcus-image-with-info'
    );
    const _stairGhost = document.getElementById('stair-ghost');
    let _ghostFadeTimer = null;
    let _ghostClearTimer = null;
    function deactivateStairGhost() {
        if (!_stairGhost) return;
        clearTimeout(_ghostFadeTimer);
        clearTimeout(_ghostClearTimer);
        _stairGhost.querySelectorAll('.words-stair__line p').forEach(p => {
            p.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            p.style.opacity    = '0';
            p.style.transform  = 'translate3d(0,-84px,0)';
        });
        _stairGhost.style.transition = '';
        _ghostFadeTimer = setTimeout(() => {
            _stairGhost.style.opacity = '0';
            _ghostClearTimer = setTimeout(() => { _stairGhost.innerHTML = ''; }, 380);
        }, 700);
    }
    function activateStairGhost(container) {
        const stair = container.querySelector('.words-stair');
        if (!stair || !_stairGhost) return;
        clearTimeout(_ghostFadeTimer);
        clearTimeout(_ghostClearTimer);
        const r = stair.getBoundingClientRect();
        const clone = stair.cloneNode(true);
        clone.style.margin = '0';
        const srcLines = stair.querySelectorAll('.words-stair__line');
        const dstLines = clone.querySelectorAll('.words-stair__line');
        const isDark = document.body.classList.contains('dark-mode');
        const animTargets = [];
        srcLines.forEach((line, i) => {
            const cs = window.getComputedStyle(line);
            dstLines[i].style.display   = cs.display;
            dstLines[i].style.left      = cs.left;
            dstLines[i].style.transform = cs.transform;
            const srcPs = line.querySelectorAll('p');
            const dstPs = dstLines[i].querySelectorAll('p');
            srcPs.forEach((p, j) => {
                const cp = window.getComputedStyle(p);
                dstPs[j].style.opacity    = '0';
                dstPs[j].style.transform  = 'translate3d(0,42px,0)';
                // Touch-Geräte (iPhone + iPad): Treppentext immer weiß (iPad-Landscape liegt >768px
                // außerhalb der weißen Mobile-CSS-Regel und wäre sonst dunkel/unsichtbar auf dem Bild).
                dstPs[j].style.color      = (isDark || navigator.maxTouchPoints > 0) ? '#E9E9E4' : cp.color;
                dstPs[j].style.fontSize   = (parseFloat(cp.fontSize) * 0.9) + 'px';
                dstPs[j].style.transition = 'none';
                animTargets.push({ el: dstPs[j], delay: 0 });
            });
        });
        _stairGhost.innerHTML = '';
        _stairGhost.appendChild(clone);
        const isAlex    = !!container.closest('.main-heading-container');
        const isDaniel  = container.id === 'mythus-daniel-image-with-info';
        const isBen     = container.id === 'ben-image-with-info';
        const isMichael = container.id === 'michael-image-with-info';
        const isDesktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const isNarrowHover = isDesktopPointer && window.innerWidth < 640;
        const leftOffset = isAlex ? -10 : isDaniel ? 50 : (isBen && isDesktopPointer) ? 40
                         : (isMichael && isNarrowHover) ? 90 : 0; // Ben: 40 (120-80), Michael narrowHover: 90 (40+50)
        const topOffset = (isBen && isDesktopPointer) ? -130        // Ben: 130px höher (200-70 tiefer)
                        : (isMichael && isNarrowHover) ? -35        // Michael narrowHover: 35px höher
                        : (isDaniel && isNarrowHover) ? -60 : 0;    // Daniel narrowHover: 60px höher
        // iPad (Touch, breiter als Smartphone): Alex-Treppe an der rechten unteren Bildecke
        // verankern, von dort 30px hoch und 30px nach links versetzt (statt an der Stair-Position).
        const _isTablet = navigator.maxTouchPoints > 0 && window.innerWidth > 600;
        const _alexImg = isAlex ? container.querySelector('.main-heading-image') : null;
        const _ir = _alexImg ? _alexImg.getBoundingClientRect() : null;
        if (isAlex && _isTablet && _ir && _ir.height > 1) {
            // Horizontale MITTE der Treppe auf die rechte Bildkante legen, Unterkante auf die Bild-Unterkante.
            // Ghost rendert 0.9-skaliert (siehe fontSize*0.9) → ~10% schmaler als die Quell-Treppe r.width;
            // tatsächliche Ghost-Breite ≈ r.width*0.9, halbe Breite = r.width*0.45.
            _stairGhost.style.top    = (_ir.bottom - r.height) + 'px';
            _stairGhost.style.left   = (_ir.right  - r.width * 0.45)  + 'px';
        } else {
            _stairGhost.style.top    = (r.top + 10 + topOffset) + 'px';
            _stairGhost.style.left   = (r.left + leftOffset) + 'px';
        }
        _stairGhost.style.width      = r.width + 'px';
        _stairGhost.style.transition = 'none';
        _stairGhost.style.opacity    = '1';
        void _stairGhost.offsetHeight;
        animTargets.forEach(({ el, delay }) => {
            el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            el.style.opacity    = '1';
            el.style.transform  = 'translate3d(0,-42px,0)';
        });
    }
    function clearInfoOverlay(el) {
        deactivateStairGhost();
        // Gradient fade-out: info-active erst nach Transition entfernen
        el.classList.remove('info-active');
    }
    allInfoImages.forEach(container => {
        container.addEventListener('click', function(e) {
            // Tap nur auf echten Hover-Geräten (Desktop mit Maus) überspringen → dort übernimmt :hover.
            // Touch-Geräte (Smartphone UND iPad ohne Maus) nutzen den Tap, unabhängig von der Breite.
            if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
            const isActive = this.classList.contains('info-active');
            document.querySelectorAll('.info-active').forEach(clearInfoOverlay);
            if (!isActive) {
                this.classList.add('info-active');
                activateStairGhost(this);
            }
            e.stopPropagation();
        });
    });
    // Tap außerhalb schließt Info (Touch-Geräte inkl. iPad ohne Maus)
    document.addEventListener('click', () => {
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.querySelectorAll('.info-active').forEach(clearInfoOverlay);
    });

    // =============== KLAPPBARE TEXTBLÖCKE (nur Smartphone) ===============
    // Jede Textbox kollabiert; ein Dropdown-Pfeil klappt sie smooth auf. Erster Block offen.
    let _collapseReflowRAF = null;
    function initCollapsibleBlocks() {
        if (!_isPhone()) return;
        const boxes = document.querySelectorAll('.content-box, .content-box-2');
        boxes.forEach((box, idx) => {
            if (box.querySelector(':scope > .block-arrow')) return; // bereits initialisiert
            const arrow = document.createElement('button');
            arrow.className = 'block-arrow';
            arrow.type = 'button';
            arrow.setAttribute('aria-label', 'Textblock ein- oder ausklappen');
            arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            box.appendChild(arrow);
            if (idx !== 0) box.classList.add('collapsed'); // erster Block (KONZEPT) offen, Rest zu
            arrow.addEventListener('click', function(e) {
                e.stopPropagation();
                box.classList.toggle('collapsed');
                // Reflow: nachfolgende Blöcke folgen der sich ändernden Box-Höhe (rutschen nach
                // unten/oben). recalculateLayout() je Frame während der ~0,5s-Klapp-Animation.
                // scrollY sichern, da recalculateLayout den Spacer kurz auf 0 setzt (sonst Sprung).
                if (_collapseReflowRAF) cancelAnimationFrame(_collapseReflowRAF);
                const _t0 = performance.now();
                (function _reflow() {
                    const _sy = window.scrollY;
                    recalculateLayout();
                    if (window.scrollY !== _sy) window.scrollTo(0, _sy);
                    _collapseReflowRAF = (performance.now() - _t0 < 560)
                        ? requestAnimationFrame(_reflow) : null;
                })();
            });
        });
    }
    initCollapsibleBlocks();

    // Locale-Toggle (DE/EN)
    const localeBtns = document.querySelectorAll('.locale-switch__btn');

    function setLocale(locale) {
        localeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.locale === locale));
        // Body-Locale-Klasse (für CSS-Regeln, die nur in einer Sprache gelten sollen, z.B. ES-Überschriften)
        document.body.classList.toggle('is-de', locale === 'de');
        document.body.classList.toggle('is-en', locale === 'en');
        document.body.classList.toggle('is-es', locale === 'es');
        document.querySelectorAll('.locale-de, .locale-en, .locale-es').forEach(el => {
            el.classList.toggle('active', el.classList.contains('locale-' + locale));
        });
        document.querySelectorAll('[data-de]').forEach(el => {
            if (locale === 'en') el.textContent = el.dataset.en || el.dataset.de;
            else if (locale === 'es') el.textContent = el.dataset.es || el.dataset.de;
            else el.textContent = el.dataset.de;
        });
        // "Home" führt zur sprachrichtigen Landingpage (Label bleibt überall "Home").
        const _homeUrls = { de: 'index.html', en: 'index-en.html', es: 'index-es.html' };
        document.querySelectorAll('.nav-home').forEach(a => { a.href = _homeUrls[locale] || 'index.html'; });
        localStorage.setItem('locale', locale);
    }

    // Wechselt Sprache/Level ohne Bildpositionen zu verschieben.
    // Kompensiert parent-Verschiebung durch DOM-Reflow direkt am style.top der Bilder.
    let _isSliding = false;
    function slideTransition(applyFn) {
        if (_isSliding) return;
        _isSliding = true;
        const overlay = document.getElementById('slide-overlay');
        if (!overlay) {
            applyFn();
            recalculateLayout();
            _isSliding = false;
            return;
        }
        overlay.style.transform = 'translateX(0)';

        // iOS-Safari feuert transitionend nicht zuverlässig (Compositing/pointer-events:none).
        // Ohne Fallback würde applyFn nie laufen UND _isSliding hängenbleiben → der Niveau-Switch
        // reagiert danach gar nicht mehr. Daher beide Phasen zusätzlich per Timeout absichern.
        let _inFired = false;
        let _inFallback;
        const onIn = () => {
            if (_inFired) return;
            _inFired = true;
            overlay.removeEventListener('transitionend', onIn);
            clearTimeout(_inFallback);

            // Section-Name des nächsten Snaps vor dem Wechsel merken
            const sBefore = window.scrollY;
            let nearestSection = null;
            let nearestIdx = -1, minDist = Infinity;
            for (let i = 0; i < meetingPoints.length; i++) {
                const d = Math.abs(sBefore - meetingPoints[i]);
                if (d < minDist) { minDist = d; nearestIdx = i; nearestSection = meetingPointNames[i]; }
            }

            applyFn();
            document.body.classList.add('no-image-transition');
            recalculateLayout();

            // Zum äquivalenten Snap im neuen Layout springen (unter Overlay, unsichtbar).
            // Matching erfolgt per Section-Name (KONZEPT/RIVUS/MYTHUS/GESICHTEN/MICHAEL),
            // damit Index-Verschiebungen durch wegfallende Snap-Punkte korrekt aufgefangen werden.
            if (nearestIdx >= 0 && minDist <= 500 && meetingPoints.length > 0) {
                const newSectionIdx = nearestSection ? meetingPointNames.indexOf(nearestSection) : -1;
                const idx = newSectionIdx >= 0
                    ? newSectionIdx
                    : Math.min(nearestIdx, meetingPoints.length - 1);
                const target = meetingPoints[idx];
                cancelMagnetSnap();
                clearTimeout(scrollEndTimer);
                window.scrollTo({ top: target, behavior: 'instant' });
                latestScroll = target;
                applyParallaxEffect(target);
                updateScene();
            }

            requestAnimationFrame(() => requestAnimationFrame(() => {
                document.body.classList.remove('no-image-transition');
                overlay.style.transform = 'translateX(-100%)';
                let _outFired = false;
                let _outFallback;
                const onOut = () => {
                    if (_outFired) return;
                    _outFired = true;
                    overlay.removeEventListener('transitionend', onOut);
                    clearTimeout(_outFallback);
                    overlay.style.transition = 'none';
                    overlay.style.transform = 'translateX(100%)';
                    requestAnimationFrame(() => { overlay.style.transition = ''; });
                    _isSliding = false;
                };
                overlay.addEventListener('transitionend', onOut);
                _outFallback = setTimeout(onOut, 320);
            }));
        };
        overlay.addEventListener('transitionend', onIn);
        _inFallback = setTimeout(onIn, 320);
    }

    const _localeUrls = { de: 'index.html', en: 'index-en.html', es: 'index-es.html' };
    const _isSubPage = document.body.classList.contains('sub-page');
    let currentLocale = (_isSubPage ? localStorage.getItem('locale') : null) || document.documentElement.lang || 'de';
    localeBtns.forEach(btn => btn.addEventListener('click', () => {
        const locale = btn.dataset.locale;
        if (locale === currentLocale) return;
        currentLocale = locale;
        if (_isSubPage) {
            setLocale(locale);
        } else if (_localeUrls[locale]) {
            window.location.href = _localeUrls[locale];
        }
    }));
    setLocale(currentLocale);

    // Sprachniveau-Toggle
    const langBtns = document.querySelectorAll('.lang-switch__btn');

    function setLanguage(lang) {
        langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
        document.querySelectorAll('.lang-text').forEach(el => {
            el.classList.toggle('active', el.classList.contains('lang-' + lang));
        });
        localStorage.setItem('lang-level', lang);
    }

    let currentLang = null;
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang === currentLang) return;
            currentLang = lang;
            slideTransition(() => { setLanguage(lang); capTextRightBoundary(); });
        });
    });

    // Gespeicherte Präferenz wiederherstellen (Standard: expert)
    setLanguage(localStorage.getItem('lang-level') || 'expert');
    currentLang = localStorage.getItem('lang-level') || 'expert';

    // Mobile Dropdowns (Globus + Aa) — nur ≤480px sichtbar
    const mobileLocaleTrigger = document.getElementById('mobile-locale-trigger');
    const mobileLocaleMenu = document.getElementById('mobile-locale-menu');
    const mobileLangTrigger = document.getElementById('mobile-lang-trigger');
    const mobileLangMenu = document.getElementById('mobile-lang-menu');

    function closeMobileDropdowns() {
        if (mobileLocaleMenu) mobileLocaleMenu.classList.remove('open');
        if (mobileLangMenu) mobileLangMenu.classList.remove('open');
        const _navMenu = document.querySelector('.nav-menu');
        const _navToggle = document.querySelector('.nav-toggle');
        if (_navMenu && _navMenu.classList.contains('active')) {
            _navMenu.classList.remove('active');
            if (_navToggle) {
                const spans = _navToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    }

    function syncMobileActive() {
        if (mobileLocaleMenu) {
            mobileLocaleMenu.querySelectorAll('button[data-locale]').forEach(b =>
                b.classList.toggle('active', b.dataset.locale === currentLocale));
        }
        if (mobileLangMenu) {
            mobileLangMenu.querySelectorAll('button[data-lang]').forEach(b =>
                b.classList.toggle('active', b.dataset.lang === currentLang));
        }
    }

    if (mobileLocaleTrigger) {
        mobileLocaleTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mobileLocaleMenu.classList.contains('open');
            closeMobileDropdowns();
            if (!isOpen) mobileLocaleMenu.classList.add('open');
        });
    }

    if (mobileLangTrigger) {
        mobileLangTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mobileLangMenu.classList.contains('open');
            closeMobileDropdowns();
            if (!isOpen) mobileLangMenu.classList.add('open');
        });
    }

    if (mobileLocaleMenu) {
        mobileLocaleMenu.addEventListener('click', (e) => e.stopPropagation());
        mobileLocaleMenu.querySelectorAll('button[data-locale]').forEach(btn => {
            btn.addEventListener('click', () => {
                const locale = btn.dataset.locale;
                closeMobileDropdowns();
                if (locale !== currentLocale) {
                    currentLocale = locale;
                    if (_isSubPage) {
                        setLocale(locale);
                    } else if (_localeUrls[locale]) {
                        window.location.href = _localeUrls[locale];
                    }
                }
            });
        });
    }

    if (mobileLangMenu) {
        mobileLangMenu.addEventListener('click', (e) => e.stopPropagation());
        mobileLangMenu.querySelectorAll('button[data-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                closeMobileDropdowns();
                if (lang !== currentLang) {
                    const existingBtn = document.querySelector(`.lang-switch__btn[data-lang="${lang}"]`);
                    if (existingBtn) existingBtn.click();
                }
            });
        });
    }

    document.addEventListener('click', closeMobileDropdowns);
    syncMobileActive();

    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');

            // Animate hamburger
            const spans = navToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const spans = navToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }

    // Scroll handling
    let latestScroll = 0;
    let ticking = false;

    const fadeOutThreshold = _layoutH() * 0.09;
    const fadeInThreshold = _layoutH() * 0.30;

    // Header shrinking setup (only for landing page)
    const header = document.querySelector('header');
    const isShrinkingHeader = header && header.classList.contains('shrinking-header');

    // =============== BOX HEIGHT CACHE ===============
    // Einmalig beim Laden eingefroren – unabhängig von Textlänge bei Sprachenwechsel
    let _cachedBox2Height = 0;
    let _cachedMythusBoxHeight = 0;
    let _cachedRivusBoxHeight = 0;

    // =============== DOM ELEMENT CACHE (Performance) ===============
    // Alle häufig genutzten Elemente einmal cachen statt pro Frame zu suchen
    const _alexImage = document.querySelector('.main-heading-image');
    const _contentBoxWrapper = document.querySelector('.content-box-wrapper');
    const _rivusContentBoxWrapper2 = document.getElementById('rivus-content-box-wrapper');
    const _mythusBoxWrapper = document.getElementById('mythus-box-wrapper');
    const _gesichtenContentBoxWrapper = document.getElementById('gesichten-content-box-wrapper');
    const _contentBox = document.querySelector('.content-box');
    const _rivusContentBox2 = document.getElementById('rivus-content-box');
    const _mythusBox = document.getElementById('mythus-box');
    const _gesichtenContentBox = document.getElementById('gesichten-content-box');
    const _mainImageContainer = document.querySelector('.main-heading-container .image-with-info');
    const _benImage = document.getElementById('ben-image-with-info');
    const _mythusDaniel = document.getElementById('mythus-daniel-image-with-info');
    const _michaelImage = document.getElementById('michael-image-with-info');
    const _marcusImage = document.getElementById('marcus-image-with-info');
    const _konzeptFilled = document.querySelector('.konzept-heading-filled');
    const _konzeptOutline = document.querySelector('.konzept-heading-outline');
    const _konzeptAnchor = document.querySelector('.konzept-heading-anchor');
    const _mythusFilled = document.getElementById('mythus-filled');
    const _mythusOutline = document.getElementById('mythus-outline');
    const _mythusAnchor = document.getElementById('mythus-anchor');
    const _rivusFilled = document.querySelector('.rivus-anchor-filled');
    const _rivusOutline = document.querySelector('.rivus-anchor-outline');
    const _rivusAnchor = document.querySelector('.rivus-anchor-gray');
    const _gesichtenAnchorFilled = document.getElementById('gesichten-anchor-filled');
    const _gesichtenAnchorOutline = document.querySelector('#gesichten-anchor-container .gesichten-anchor-outline');
    const _gesichtenAnchorGray = document.getElementById('gesichten-anchor-gray');
    const _allTextBehinds = document.querySelectorAll('.text-behind');
    const _allTextFronts = document.querySelectorAll('.text-front');
    const _allParallaxImages = document.querySelectorAll('.parallax-image');
    const _allHoverImages = document.querySelectorAll('.hover-image');
    const _headerLogos = header ? header.querySelectorAll('.logo-gif') : [];
    const _headerLogoText = header ? header.querySelector('.logo-text') : null;
    const _headerBackdrop = document.querySelector('.header-backdrop');

    // Echtes Smartphone (Text-Logo mit Intro). Desktop/iPad zeigen das animierte Bild.
    function _isPhone() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches && window.innerWidth <= 600;
    }
    // Frame-zu-Frame-Startgröße des Text-Logos messen (nur wenn der Text sichtbar ist = Smartphone).
    let _logoFillSize = 0;
    function computeLogoFillSize() {
        _logoFillSize = 0;
        if (!_headerLogoText || window.getComputedStyle(_headerLogoText).display === 'none') return;
        const avail = Math.max(120, window.innerWidth - 48); // zwischen den Rahmen, kleiner Puffer
        const prevFS = _headerLogoText.style.fontSize;
        const prevTr = _headerLogoText.style.transform;
        _headerLogoText.style.transform = 'none';
        _headerLogoText.style.fontSize = '100px';
        const w = _headerLogoText.getBoundingClientRect().width;
        _headerLogoText.style.fontSize = prevFS;
        _headerLogoText.style.transform = prevTr;
        if (w > 0) _logoFillSize = Math.floor(100 * avail / w);
    }
    // Animiertes Logo-Bild nur auf Nicht-Smartphones laden (Smartphones zeigen den Text → spart MB).
    function ensureLogoSrc() {
        if (_isPhone()) return;
        _headerLogos.forEach(img => { if (img.dataset.src && !img.getAttribute('src')) img.setAttribute('src', img.dataset.src); });
    }
    ensureLogoSrc();

    // Cached anchor positioning data (computed in positionAnchors, used per frame)
    let _michaelVisualDocTop = 0; // gesetzt in positionMichaelAndMarcus(), genutzt in calculateMeetingPoints()
    let _michaelTallDocTop = 0;   // statische Dokument-Oberkante des "großen Michael" (position:fixed)
    let _anchorsReady = false;
    let _alexDocTop = 0, _alexHeight = 0, _boxAlexGap = 0;
    let _konzeptAnchorHeight = 0, _konzeptAnchorGap = 0, _konzeptAnchorLeft = 0;
    let _rivusAnchorHeight2 = 0, _rivusAnchorGap2 = 0, _rivusAnchorLeft = 0, _box2WrapperDocTop = 0;
    let _mythusAnchorHeight2 = 0, _mythusAnchorGap2 = 0, _mythusAnchorLeft = 0, _mythusWrapperDocTop = 0;
    let _gesichtenAnchorHeight2 = 0, _gesichtenAnchorGap2 = 0, _gesichtenAnchorLeft = 0, _gesichtenWrapperDocTop = 0;
    const _heroSection = document.querySelector('.hero-section');
    const _visHeadings = [
        document.querySelector('.main-heading-filled'),
        _konzeptFilled,
        document.querySelector('.unterpunkt-heading-filled'),
        _gesichtenAnchorFilled,
        _rivusFilled,
        _mythusFilled
    ];

    // Mobile RIVUS: Treppentext-Overlay außerhalb des Bild-Stacking-Contexts
    function initBenStairOverlay() {
        if (window.innerWidth >= BREAKPOINT_MOBILE) return;
        if (document.getElementById('ben-stair-overlay')) return;
        const imgInfo = _benImage ? _benImage.querySelector('.image-info') : null;
        const stairSrc = imgInfo ? imgInfo.querySelector('.words-stair') : null;
        if (!stairSrc) return;
        const overlay = document.createElement('div');
        overlay.id = 'ben-stair-overlay';
        overlay.appendChild(stairSrc.cloneNode(true));
        document.body.appendChild(overlay);
    }
    initBenStairOverlay();

    // Initial update
    updateScene();

    window.addEventListener('scroll', () => {
        document.querySelectorAll('.info-active').forEach(clearInfoOverlay);
        latestScroll = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateScene();
                ticking = false;
            });
            ticking = true;
        }

        // Magnet Snap: Timer nur starten wenn User nicht aktiv scrollt (und kein Resize läuft —
        // sonst snappt die durch Clamp/scrollTo ausgelöste Scroll-Bewegung → Springen am Ende)
        if (!isSnapping && !isTouching && !isScrollbarHeld && !isResizing) {
            scheduleSnapCheck();
        }
    });

    function scheduleSnapCheck() {
        // Smartphone: Snaplinien inaktiv (Flag ENABLE_SNAP_ON_PHONE). Tablet/Desktop weiterhin aktiv.
        if (_isPhone() && !ENABLE_SNAP_ON_PHONE) return;
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
            if (isSnapping || isTouching || isScrollbarHeld) return;
            const s = window.scrollY;
            let target = null;
            let minDist = Infinity;
            for (let i = 0; i < meetingPoints.length; i++) {
                const point = meetingPoints[i];
                const dist = Math.abs(s - point);
                const distPrev = i > 0 ? point - meetingPoints[i - 1] : point;
                const distNext = i < meetingPoints.length - 1 ? meetingPoints[i + 1] - point : Infinity;
                const override = meetingPointZoneOverrides.get(point);
                const isLast = i === meetingPoints.length - 1;
                let zone;
                if (override) {
                    zone = (typeof override === 'object') ? (s < point ? override.before : override.after) : override;
                } else if (isLast && _endSEnd > 0) {
                    // Letzter Snap (GESICHTEN am Ende): von oben einrasten (before, begrenzt
                    // damit man nicht festklebt), Richtung Ende nur kurz (after).
                    zone = s < point ? Math.min(distPrev * 0.24, 250) : 50;
                } else {
                    zone = Math.min(distPrev, distNext) * 0.24;
                }
                if (dist <= zone && dist < minDist) { minDist = dist; target = point; }
            }
            if (target !== null) slowScrollTo(target);
        }, 200);
    }

    function updateScene() {
        // Phase 1: Alle Transforms schreiben (WRITE, kein Layout-Reflow)
        applyParallaxEffect(latestScroll);
        // Bild-Übergänge (narrowHover) direkt nach den Box-Transforms im selben Frame → kein Versatz.
        if (window.__imageTransitionUpdate) window.__imageTransitionUpdate();

        // Phase 2: Alle Layout-Reads gebatcht (ein einziger Reflow)
        const fadeThreshold = _layoutH() * 0.07;
        const fadeThresholdEarly = _layoutH() * 0.23; // RIVUS/MYTHUS/GESICHTEN früher ausblenden (nur Mobile)
        const visRects = [];
        for (let i = 0; i < _visHeadings.length; i++) {
            visRects.push(_visHeadings[i] ? _visHeadings[i].getBoundingClientRect().top : Infinity);
        }

        // Phase 3: Alle Layout-Writes (kein Read mehr → kein Reflow)

        // Heading-Sichtbarkeit
        // _visHeadings: [main-filled, konzeptFilled, unterpunktFilled, gesichtenFilled, rivusAnchorFilled, mythusFilled]
        // Index 3 (gesichtenFilled = RIVUS filled), 4 (rivusAnchorFilled = GESICHTEN filled), 5 (mythusFilled)
        const isMobileForFade = window.innerWidth < BREAKPOINT_MOBILE;
        for (let i = 0; i < _visHeadings.length; i++) {
            if (_visHeadings[i]) {
                const threshold = (isMobileForFade && i >= 3) ? fadeThresholdEarly : fadeThreshold;
                if (visRects[i] < threshold) {
                    _visHeadings[i].classList.add('faded-out');
                } else {
                    _visHeadings[i].classList.remove('faded-out');
                }
            }
        }

        // Fallback: Box-Wrapper via style.top positionieren, bevor positionAnchors() gelaufen ist
        if (!_anchorsReady && _alexImage && _contentBoxWrapper) {
            const alexRect = _alexImage.getBoundingClientRect();
            _contentBoxWrapper.style.position = 'fixed';
            _contentBoxWrapper.style.top = `${alexRect.bottom + getBoxAlexGap()}px`;
            _contentBoxWrapper.style.left = '0';
            _contentBoxWrapper.style.width = '100%';
            _contentBoxWrapper.style.marginTop = '0';
        }

        if (isShrinkingHeader) {
            updateHeaderSize(latestScroll);
        }

    }

    // Header shrinking animation (only on landing page)
    function updateHeaderSize(scrollY) {
        const maxScroll = 50; // Shrink over 50px of scroll

        // Responsive header heights and text sizes
        let startHeight, endHeight, navHeight, startTextSize, endTextSize;
        const windowWidth = window.innerWidth;

        if (windowWidth <= 480) {
            // Smallest mobile / Smartphone
            startHeight = 46;
            endHeight = 46; // No shrinking on smallest mobile
            navHeight = 25;
            endTextSize = 34;
            // Smartphone: Text-Logo startet Rahmen-zu-Rahmen und schrumpft beim Scrollen auf 34px.
            const phone = _isPhone();
            startTextSize = (phone && _logoFillSize) ? _logoFillSize : 34;

            // Intro-Animation: Logo startet tiefer, bewegt sich beim Scrollen hoch.
            const INTRO_OFFSET = 100;
            const introOffset = Math.max(0, INTRO_OFFSET - scrollY);
            const clampedScroll = Math.max(scrollY, 0);
            const progress = Math.min(clampedScroll / maxScroll, 1);
            const newHeight = startHeight;
            const newTextSize = startTextSize - (startTextSize - endTextSize) * progress;
            const header = document.querySelector('header');
            // Smartphone: Header-Streifen (Blur + Logo) 50px höher starten. Nur der Header-top
            // (Hero-Margin behält vollen introOffset, sonst doppelter Versatz). Im kleinen Zustand
            // bleibt top bei 30 (Logo haftet sichtbar unter der Safe-Area).
            if (header) header.style.top = `${30 + Math.max(0, introOffset - 50)}px`;
            if (phone && _headerLogoText) {
                _headerLogoText.style.fontSize = `${newTextSize}px`;
            } else {
                for (let i = 0; i < _headerLogos.length; i++) _headerLogos[i].style.height = `${newTextSize}px`;
            }
            if (_heroSection) _heroSection.style.marginTop = `${30 + newHeight + introOffset}px`;
            if (_headerBackdrop) _headerBackdrop.style.height = `${30 + newHeight}px`;
            return;
        } else if (windowWidth <= 768) {
            // Tablet/mobile
            startHeight = 83;
            endHeight = 43;
            navHeight = 30;
            startTextSize = 51; // 20% smaller than 64px (64 × 0.8 = 51.2)
            endTextSize = 28;
        } else {
            // Desktop
            startHeight = 123;
            endHeight = 43;
            navHeight = 30;
            startTextSize = 86; /* 20% smaller than MALEREI (108px × 0.8) */
            endTextSize = 32;
        }

        // Smartphone (480–600px): Text-Logo Rahmen-zu-Rahmen starten lassen.
        const _phone = _isPhone();
        if (_phone && _logoFillSize) startTextSize = _logoFillSize;

        // Clamp scrollY to prevent negative values (rubber band effect when scrolling up)
        let clampedScrollY = Math.max(scrollY, 0);
        let progress = Math.min(clampedScrollY / maxScroll, 1);
        let newHeight = startHeight - (startHeight - endHeight) * progress;
        let newTextSize = startTextSize - (startTextSize - endTextSize) * progress;

        header.style.height = `${newHeight}px`;

        const tx = progress === 1 ? 'translate(-50%, calc(-50% - 2px))' : 'translate(-50%, -50%)';
        if (_phone && _headerLogoText) {
            _headerLogoText.style.fontSize = `${newTextSize}px`;
            _headerLogoText.style.transform = tx;
        } else if (_headerLogos.length > 0) {
            for (let i = 0; i < _headerLogos.length; i++) {
                _headerLogos[i].style.height = `${newTextSize}px`;
                _headerLogos[i].style.transform = tx;
            }
        } else if (_headerLogoText) {
            _headerLogoText.style.fontSize = `${newTextSize}px`;
            _headerLogoText.style.transform = tx;
        }

        if (_heroSection) {
            _heroSection.style.marginTop = `${navHeight + newHeight}px`;
        }
        if (_headerBackdrop) {
            _headerBackdrop.style.height = `${navHeight + newHeight}px`;
        }
    }

    // Main heading fade out animation
    function updateMainHeadingVisibility() {
        const headings = [
            document.querySelector('.main-heading-filled'),
            document.querySelector('.konzept-heading-filled'),
            document.querySelector('.unterpunkt-heading-filled'),
            document.querySelector('.rivus-anchor-filled'),
            document.getElementById('gesichten-anchor-filled'),
            document.getElementById('mythus-filled')
        ];

        // Calculate 7% from top of viewport as the trigger point
        const fadeThreshold = _layoutH() * 0.07;

        headings.forEach(heading => {
            if (heading) {
                const rect = heading.getBoundingClientRect();
                const textTopPosition = rect.top;

                // If the top of the text is above the threshold, fade it out.
                // Otherwise, fade it back in.
                if (textTopPosition < fadeThreshold) {
                    heading.classList.add('faded-out');
                } else {
                    heading.classList.remove('faded-out');
                }
            }
        });
    }

    // Text visibility animation
    function updateTextVisibility() {
        const textContainers = document.querySelectorAll('.text-container');
        textContainers.forEach(container => {
            const behind = container.querySelector('.text-behind');
            if (!behind) return;

            const rect = behind.getBoundingClientRect();

            if (rect.top <= fadeOutThreshold) {
                behind.classList.add('hidden');
            } else if (rect.top <= fadeInThreshold) {
                behind.classList.remove('hidden');
            } else {
                behind.classList.add('hidden');
            }
        });
    }

    // =============== MOBILE IMAGE VISIBILITY ===============
    // Bilder liegen statisch hinter Textblöcken. Sichtbarkeit wird über opacity gesteuert:
    // Ben → sichtbar wenn KONZEPT-Box oben vorbeirollt, bis RIVUS-Box beginnt Ben zu verdecken
    // Daniel → wenn RIVUS Ben verdeckt, bis MYTHUS Daniel verdeckt
    // Michael → wenn MYTHUS Daniel verdeckt, bis GESICHTEN Michael verdeckt
    // Marcus → nach GESICHTEN (bleibt stehen)
    function updateMobileImageVisibility() {
        if (window.innerWidth >= BREAKPOINT_MOBILE) return;

        const headerEl = document.querySelector('header');
        const imageFixedTop = (headerEl ? headerEl.offsetHeight : 50) + 15;

        const konzeptTop = _contentBoxWrapper ? _contentBoxWrapper.getBoundingClientRect().top : Infinity;
        const rivusTop   = _rivusContentBoxWrapper2 ? _rivusContentBoxWrapper2.getBoundingClientRect().top : Infinity;
        const mythusTop  = _mythusBoxWrapper ? _mythusBoxWrapper.getBoundingClientRect().top : Infinity;
        const gesichtenTop = _gesichtenContentBoxWrapper ? _gesichtenContentBoxWrapper.getBoundingClientRect().top : Infinity;

        const _benOverlay = document.getElementById('ben-stair-overlay');
        const show = el => {
            if (el) { el.style.opacity = '1'; el.style.zIndex = '0'; el.style.pointerEvents = 'auto'; }
            if (el === _benImage && _benOverlay) _benOverlay.style.opacity = '1';
        };
        const showBehind = el => { if (el) { el.style.opacity = '1'; el.style.zIndex = ''; el.style.pointerEvents = 'auto'; } };
        const hide = el => {
            if (el) { el.style.opacity = '0'; clearInfoOverlay(el); el.style.zIndex = ''; el.style.pointerEvents = 'none'; }
            if (el === _benImage && _benOverlay) _benOverlay.style.opacity = '0';
        };

        if (gesichtenTop < imageFixedTop) {
            hide(_benImage); hide(_mythusDaniel); showBehind(_michaelImage); hide(_marcusImage);
        } else if (mythusTop < imageFixedTop) {
            hide(_benImage); hide(_mythusDaniel); showBehind(_michaelImage); hide(_marcusImage);
        } else if (_benImage && rivusTop < _benImage.getBoundingClientRect().top) {
            hide(_benImage); show(_mythusDaniel); hide(_michaelImage); hide(_marcusImage);
        } else if (konzeptTop < imageFixedTop) {
            show(_benImage); hide(_mythusDaniel); hide(_michaelImage); hide(_marcusImage);
        } else {
            hide(_benImage); hide(_mythusDaniel); hide(_michaelImage); hide(_marcusImage);
        }
    }

    // Parallax effect (optimiert: gecachte DOM-Referenzen)
    function applyParallaxEffect(scrollY) {
        const textSpeed = scrollY * 0.25;
        const imageSpeed = scrollY * 0.5;
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;

        // Main heading image
        if (_mainImageContainer) {
            _mainImageContainer.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }

        // Mobile: Sichtbarkeit der Bilder per Scroll steuern (statisch, kein transform)
        // Auf Hover-Geräten (< 640px) übernimmt image-transition.js die Bildsteuerung.
        const isHoverDevice = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (isMobile && !isHoverDevice) {
            // Touch-Mobile: Bildsteuerung übernimmt der Wipe (image-transition.js via
            // __imageTransitionUpdate, in updateScene). Opacity-Logik nur als Fallback.
            if (!window.__imageTransitionUpdate) updateMobileImageVisibility();
        } else {
            if (_benImage) {
                _benImage.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
            }
            if (_mythusDaniel) {
                _mythusDaniel.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
            }
            if (_michaelImage) {
                if (_michaelTall()) {
                    // position:fixed, fest unter die GESICHTEN-Box gekoppelt (gleiche Speed).
                    // gesichtenHoverOffset ist auf Desktop 0 (nur narrowHover), daher hier weggelassen.
                    // translateX(-50%) zentriert horizontal (zusammen mit CSS left:50%).
                    const gesVisualTop = _gesichtenWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                    const michaelTopY = gesVisualTop + _cachedRivusBoxHeight + MICHAEL_TALL_GAP;
                    _michaelImage.style.transform = `translate3d(-50%, ${michaelTopY}px, 0)`;
                } else {
                    _michaelImage.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
                }
            }
            if (_marcusImage) {
                _marcusImage.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
            }
        }

        // Content box 1 - horizontaler Offset auf Box, Vertikalposition via transform auf Wrapper
        if (_contentBox) {
            _contentBox.style.transform = isMobile ? '' : 'translate3d(20%, 0, 0)';
        }
        if (_anchorsReady && _contentBoxWrapper) {
            const boxTop = _alexDocTop + _alexHeight - scrollY * (1 - BASE_PARALLAX_SPEED) + _boxAlexGap;
            _contentBoxWrapper.style.transform = `translate3d(0, ${boxTop}px, 0)`;
        }

        // Schmalmodus Hover-Gerät: Blöcke visuell nach oben verschieben (Snap-Trigger wird in calculateMeetingPoints kompensiert)
        const narrowHover = isHoverDevice && window.innerWidth < 640;
        const rivusHoverOffset     = narrowHover ? -300 : 0;
        const mythusHoverOffset    = narrowHover ? -800 : 0;
        const gesichtenHoverOffset = narrowHover ? -1500 : 0;
        // Touch: alle drei RIVUS-Schriften 40px tiefer → ihr Treffpunkt liegt 40px tiefer (kein Reflow)
        const _rivusTouchMeet      = (isMobile && !isHoverDevice) ? 40 : 0;
        // Touch: RIVUS-Anchor + Box zusätzlich 30px tiefer (über die filled/outline hinaus)
        const _rivusAnchorBoxExtra = (isMobile && !isHoverDevice) ? 30 : 0;
        // Touch: ganzer GESICHTEN-Block (Anchor + filled + outline + Box) 130px tiefer (visuell, kein Reflow)
        const _gesichtenTouchOffset = (isMobile && !isHoverDevice) ? 130 : 0;

        // =============== ANCHOR TRANSFORMS (position:fixed + translate3d) ===============
        if (_anchorsReady) {
            // KONZEPT Anchor – folgt Box 1 (position:fixed, transform-basiert)
            if (_konzeptAnchor) {
                const boxTop = _alexDocTop + _alexHeight - scrollY * (1 - BASE_PARALLAX_SPEED) + _boxAlexGap;
                const anchorTop = boxTop - _konzeptAnchorHeight - _konzeptAnchorGap;
                _konzeptAnchor.style.transform = `translate3d(${_konzeptAnchorLeft}px, ${anchorTop}px, 0) rotate(-4deg)`;
            }

            // RIVUS Anchor – folgt RIVUS Box 2 Wrapper
            if (_rivusAnchor) {
                const wrapperVisualTop = _box2WrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + rivusHoverOffset;
                const anchorTop = wrapperVisualTop - _rivusAnchorHeight2 - _rivusAnchorGap2 + 28 + _rivusTouchMeet + _rivusAnchorBoxExtra;
                _rivusAnchor.style.transform = `translate3d(${_rivusAnchorLeft}px, ${anchorTop}px, 0) rotate(-4deg)`;
            }

            // MYTHUS Anchor – folgt MYTHUS Box Wrapper
            if (_mythusAnchor) {
                const wrapperVisualTop = _mythusWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + mythusHoverOffset;
                // Touch-Smartphone: MYTHUS-Schriften 65px tiefer (= halbe eingeklappte Box-Höhe)
                const _mythusTouchShift = (isMobile && !isHoverDevice) ? 65 : 0;
                const mobileOffset = (window.innerWidth < BREAKPOINT_MOBILE ? 17 : 0) + _mythusTouchShift;
                const anchorTop = wrapperVisualTop - _mythusAnchorHeight2 - _mythusAnchorGap2 + mobileOffset;
                _mythusAnchor.style.transform = `translate3d(${_mythusAnchorLeft}px, ${anchorTop}px, 0) rotate(4deg)`;
            }

            // GESICHTEN Anchor – folgt GESICHTEN Box Wrapper
            if (_gesichtenAnchorGray) {
                const wrapperVisualTop = _gesichtenWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + gesichtenHoverOffset;
                const mobileAnchorOffset = isMobile ? 4 : 0;
                const deskAnchorOffsetG = (!isMobile && !_isPortraitLayout()) ? 40 : 0; // Desktop: Anchor 40px tiefer
                const anchorTop = wrapperVisualTop - _gesichtenAnchorHeight2 - _gesichtenAnchorGap2 + 28 + mobileAnchorOffset + deskAnchorOffsetG + _gesichtenTouchOffset;
                _gesichtenAnchorGray.style.transform = `translate3d(${_gesichtenAnchorLeft}px, ${anchorTop}px, 0) rotate(-4deg)`;
            }
        }

        // MYTHUS box - position:fixed wie RIVUS/GESICHTEN, Transform: docTop - scrollY*(1-speed).
        // Vorher im Fluss (scrollY*speed) → auf iOS-Momentum desynchron zum fixed Anker (Wobbeln)
        // und die Box-Kante hinkte der Michael-Wipe-Linie nach (Durchblitzen). Formel ist visuell
        // identisch zur Fluss-Variante → kein Sprung.
        if (_anchorsReady && _mythusBoxWrapper) {
            _mythusBoxWrapper.style.transform = `translate3d(0, ${_mythusWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + mythusHoverOffset}px, 0)`;
        }
        if (_mythusBox) {
            const mythusShift = window.innerWidth < BREAKPOINT_MOBILE ? '0%' : '20%';
            // Touch: Textbox 45px tiefer (nur die Box, nicht der Anker)
            const mythusBoxOffsetY = (window.innerWidth < BREAKPOINT_MOBILE ? 12 : 0) + ((isMobile && !isHoverDevice) ? 45 : 0);
            _mythusBox.style.transform = `translate3d(${mythusShift}, ${mythusBoxOffsetY}px, 0)`;
        }

        // KONZEPT filled & outline
        if (_konzeptFilled) {
            _konzeptFilled.style.transform = `translate3d(0, ${scrollY * konzeptAParallaxSpeed}px, 0) rotate(-2deg)`;
        }
        if (_konzeptOutline) {
            _konzeptOutline.style.transform = `translate3d(0, ${scrollY * konzeptAParallaxSpeed}px, 0) rotate(-2deg)`;
        }

        // MYTHUS filled & outline
        const _mythusTouchShiftF = (isMobile && !isHoverDevice) ? 30 : 0; // Touch: filled/outline 30px tiefer (höher als Anker bei 65)
        if (_mythusFilled)  _mythusFilled.style.transform  = `translate3d(0, ${scrollY * mythusAParallaxSpeed + 8 + mythusHoverOffset + _mythusTouchShiftF}px, 0) rotate(2deg)`;
        if (_mythusOutline) _mythusOutline.style.transform = `translate3d(0, ${scrollY * mythusAParallaxSpeed + 8 + mythusHoverOffset + _mythusTouchShiftF}px, 0) rotate(2deg)`;

        // RIVUS content box (links) - position:fixed wie KONZEPT, Transform: docTop - scrollY*(1-speed)
        if (_anchorsReady && _rivusContentBoxWrapper2) {
            const rivusTop = _box2WrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + rivusHoverOffset + _rivusTouchMeet + _rivusAnchorBoxExtra;
            _rivusContentBoxWrapper2.style.transform = `translate3d(0, ${rivusTop}px, 0)`;
        }
        if (_rivusContentBox2) {
            const xOffset = isMobile ? 0 : (-window.innerWidth * 0.2 + getGesichtenRightOffset() + 61);
            _rivusContentBox2.style.transform = `translate3d(${xOffset}px, 0, 0)`;
        }

        // GESICHTEN content box - position:fixed wie RIVUS, transform analog zu _box2WrapperDocTop
        if (_anchorsReady && _gesichtenContentBoxWrapper) {
            const mobileGesichtenOffset = isMobile ? 46 : 0;
            // Desktop: nur die Textbox 30px tiefer (Anchor + Snaplinie nutzen _gesichtenWrapperDocTop, bleiben)
            const desktopGesichtenTextOffset = (!isMobile && !_isPortraitLayout()) ? 30 : 0;
            const gesichtenTop = _gesichtenWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED) + mobileGesichtenOffset + gesichtenHoverOffset + desktopGesichtenTextOffset + _gesichtenTouchOffset;
            _gesichtenContentBoxWrapper.style.transform = `translate3d(0, ${gesichtenTop}px, 0)`;
        }
        if (_gesichtenContentBox) {
            const isPortrait = _isPortraitLayout();
            const totalXOffset = (isMobile || isPortrait) ? 0 : window.innerWidth * 0.2;
            const yOffset = (!isPortrait && !isMobile) ? 50 : 0;
            _gesichtenContentBox.style.transform = `translate3d(${totalXOffset}px, ${yOffset}px, 0)`;
        }

        // RIVUS filled & outline
        if (_rivusFilled)  _rivusFilled.style.transform  = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed + rivusHoverOffset + _rivusTouchMeet}px, 0) rotate(-2deg)`;
        if (_rivusOutline) _rivusOutline.style.transform = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed + rivusHoverOffset + _rivusTouchMeet}px, 0) rotate(-2deg)`;

        // GESICHTEN filled & outline
        const gesichtenFilledOffset = isMobile ? -26 : 0;
        if (_gesichtenAnchorFilled)  _gesichtenAnchorFilled.style.transform  = `translate3d(0, ${scrollY * rivusAParallaxSpeed + gesichtenFilledOffset + gesichtenHoverOffset + _gesichtenTouchOffset}px, 0) rotate(-2deg)`;
        if (_gesichtenAnchorOutline) _gesichtenAnchorOutline.style.transform = `translate3d(0, ${scrollY * rivusAParallaxSpeed + gesichtenFilledOffset + gesichtenHoverOffset + _gesichtenTouchOffset}px, 0) rotate(-2deg)`;

        // Text-Layer
        for (let i = 0; i < _allTextBehinds.length; i++) {
            _allTextBehinds[i].style.transform = `translate3d(0, ${textSpeed}px, 0)`;
        }
        for (let i = 0; i < _allTextFronts.length; i++) {
            _allTextFronts[i].style.transform = `translate3d(0, ${textSpeed}px, 0)`;
        }

        // Parallax-Bilder (nur sichtbare)
        const vh = window.innerHeight;
        for (let i = 0; i < _allParallaxImages.length; i++) {
            const rect = _allParallaxImages[i].getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) {
                _allParallaxImages[i].style.transform = `translate3d(0, ${imageSpeed * 0.3}px, 0)`;
            }
        }
        for (let i = 0; i < _allHoverImages.length; i++) {
            const rect = _allHoverImages[i].getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) {
                _allHoverImages[i].style.transform = `translate3d(0, ${imageSpeed * 0.3}px, 0)`;
            }
        }
    }

    // Logo stays fixed size, no animation needed

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Resize handler
    // Alle Positionen werden bei jedem Resize neu berechnet
    // Die Berechnungen sind idempotent (OFFSET-basiert, ohne Transform/Scroll-Einfluss)
    let resizeTimer;
    let _lastResizeWidth = window.innerWidth; // Touch: reine Höhen-Resizes (iOS URL-Leiste) ignorieren
    // =============== AKTIVES-SCROLLEN ERKENNUNG ===============
    let isTouching = false;
    let isScrollbarHeld = false;

    window.addEventListener('touchstart', () => {
        isTouching = true;
        cancelMagnetSnap();
    }, { passive: true });
    window.addEventListener('touchend', () => {
        isTouching = false;
        scheduleSnapCheck();
    }, { passive: true });
    window.addEventListener('touchcancel', () => { isTouching = false; }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
        if (e.clientX > document.documentElement.clientWidth) {
            isScrollbarHeld = true;
            cancelMagnetSnap();
        }
    });
    window.addEventListener('pointerup', () => {
        if (isScrollbarHeld) {
            isScrollbarHeld = false;
            scheduleSnapCheck();
        }
    });

    // Berechnet S_exit pro Bild: Scroll-Position, bei der Bild-Unterkante = Text-Unterkante.
    // Freeze-Fenster: [S_meet, S_exit]. Nur auf Desktop (non-Mobile).
    function recalculateLayout() {
        _anchorsReady = false; // Zurücksetzen damit updateScene den Fallback nutzt

        // Bei Wechsel von Mobile → Desktop: Inline-Opacity/-PointerEvents der Bilder zurücksetzen,
        // die updateMobileImageVisibility() gesetzt hat und die sonst bestehen bleiben.
        if (window.innerWidth >= BREAKPOINT_MOBILE) {
            [_benImage, _mythusDaniel, _michaelImage, _marcusImage].forEach(el => {
                if (!el) return;
                el.style.opacity = '';
                el.style.pointerEvents = '';
            });
        }

        // Fixed Wrapper zurücksetzen, bevor DOM-Messungen stattfinden.
        // Browser rendert nicht zwischen synchronen Anweisungen → kein Flicker.
        // Ohne Reset liefert getDocumentTop() für Kindelemente fixed-positionierter
        // Wrapper falsche Werte (z.B. _alexDocTop ≈ 0 statt korrekter Dokumentposition).
        const _resetFixedWrapper = (el) => {
            if (!el) return;
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.width = '';
            el.style.marginTop = '';
            el.style.transform = '';
        };
        _resetFixedWrapper(_contentBoxWrapper);
        _resetFixedWrapper(_rivusContentBoxWrapper2);
        _resetFixedWrapper(_gesichtenContentBoxWrapper);
        _resetFixedWrapper(_mythusBoxWrapper); // wird unten (wie GESICHTEN) fixiert → vor Re-Messung lösen

        // Box-Höhen neu messen (orientierungsabhängig)
        const _box2El = document.getElementById('rivus-content-box');
        const _mythusBoxEl = document.getElementById('mythus-box');
        const _gesichtenBoxEl = document.getElementById('gesichten-content-box');
        if (_box2El) _cachedBox2Height = _box2El.offsetHeight;
        if (_mythusBoxEl) _cachedMythusBoxHeight = _mythusBoxEl.offsetHeight;
        if (_gesichtenBoxEl) _cachedRivusBoxHeight = _gesichtenBoxEl.offsetHeight;

        updateScene();
        applyFrozenViewportMetrics(); // vor allen Messungen: vh-Maße einfrieren (narrowHover + Desktop/iPad-Browser)
        calculateKonzeptAParallaxSpeed();
        positionGesichtenAndBox2();
        // _box2WrapperDocTop direkt aus DOM messen (gleicher Wert wie in positionAnchors und Parallax).
        // Direkte DOM-Messung verhindert Abweichungen durch Formel-Approximation (anchorTop+height+margin).
        if (_rivusContentBoxWrapper2) {
            _box2WrapperDocTop = getDocumentTop(_rivusContentBoxWrapper2);
            // Gleicher Touch-Offset wie in positionAnchons, damit filled/outline-Speed
            // (calculateGesichtenAParallaxSpeed) denselben docTop sieht wie der graue Anker.
            if (_isPhone()) _box2WrapperDocTop += 170;
        }
        calculateGesichtenAParallaxSpeed();
        positionAnchors(); // fixiert Wrapper; ab hier ist der DOM im Runtime-Zustand
        positionBen();     // benNaturalTop jetzt konsistent mit Laufzeit (Wrapper fixed)
        calculateBenMobileParallaxSpeed();
        capTextRightBoundary();
        // Nach RIVUS-Fixierung: Blöcke neu positionieren und DocTops korrekt messen
        positionMythusBlock();
        if (_mythusBoxWrapper) _mythusWrapperDocTop = getDocumentTop(_mythusBoxWrapper);
        calculateMythusAParallaxSpeed();
        positionMythusDaniel();
        positionMythusBoxText();
        positionRivusAndBox3();
        positionMichaelAndMarcus();
        calculateMichaelMobileParallaxSpeed();
        if (_gesichtenContentBoxWrapper) {
            _gesichtenWrapperDocTop = getDocumentTop(_gesichtenContentBoxWrapper);
            _gesichtenContentBoxWrapper.style.position = 'fixed';
            _gesichtenContentBoxWrapper.style.top = '0';
            _gesichtenContentBoxWrapper.style.left = '0';
            _gesichtenContentBoxWrapper.style.width = '100%';
            _gesichtenContentBoxWrapper.style.marginTop = '0';
        }
        // MYTHUS-Box-Wrapper genauso fixieren wie GESICHTEN (docTop wurde oben in Zeile mit
        // _mythusWrapperDocTop im Fluss gemessen). Behebt Wobbeln + Michael-Durchblitzen.
        if (_mythusBoxWrapper) {
            _mythusBoxWrapper.style.position = 'fixed';
            _mythusBoxWrapper.style.top = '0';
            _mythusBoxWrapper.style.left = '0';
            _mythusBoxWrapper.style.width = '100%';
            _mythusBoxWrapper.style.marginTop = '0';
        }
        applyParallaxEffect(window.scrollY); // Anchors mit korrekten DocTops aktualisieren
        calculateRivusAParallaxSpeed();
        calculateMeetingPoints();
        ensureLogoSrc();       // Bild-Logo bei Bedarf laden (Nicht-Smartphone)
        computeLogoFillSize(); // Frame-Füllgröße des Text-Logos (Smartphone-Intro) neu messen
        updateScene(); // faded-out nach korrekter Positionierung neu auswerten
    }

    // =============== BEN STAIRCASE: iPad Portrait Split ===============
    function updateBenStaircase() {
        const benList = document.querySelector('#ben-container .words-stair');
        if (!benList) return;

        const isSplit = window.innerWidth <= BREAKPOINT_MOBILE
                     || (window.innerWidth <= 1024 && _layoutH() > window.innerWidth);

        const d3    = benList.querySelector('.ben-desktop-3');
        const d4    = benList.querySelector('.ben-desktop-4');
        const i3    = benList.querySelector('.ben-ipad-3');
        const i4    = benList.querySelector('.ben-ipad-4');
        const i5    = benList.querySelector('.ben-ipad-5');
        const masse = benList.querySelector('.ben-masse');

        if (!d3 || !d4 || !i3 || !i4 || !i5 || !masse) return;

        if (isSplit) {
            d3.style.display = 'none';
            d4.style.display = 'none';
            i3.style.display = 'list-item';
            i4.style.display = 'list-item';
            i5.style.display = 'list-item';

            // Treppenoffsets für 3.–6. sichtbare Position
            i3.style.left    = '48px';
            i4.style.left    = '64px';
            i5.style.left    = '80px';
            masse.style.left = '96px';

            // Skew: i3=nth-child(5)odd, i4=6even, i5=7odd, masse=8even → alterniert korrekt
            i3.style.transform    = '';
            i4.style.transform    = '';
            i5.style.transform    = '';
            masse.style.transform = '';
        } else {
            d3.style.display = '';
            d4.style.display = '';
            i3.style.display = 'none';
            i4.style.display = 'none';
            i5.style.display = 'none';

            // masse ist nth-child(8)=even, soll als 5. sichtbare Zeile odd wirken
            masse.style.left      = '80px';
            masse.style.transform = 'skew(60deg, -30deg) scaleY(0.66667)';
        }
    }

    function updateDanielStaircase() {
        const danielList = document.querySelector('#mythus-daniel-image-with-info .words-stair');
        if (!danielList) return;

        const isMobile = window.innerWidth <= BREAKPOINT_MOBILE;
        const step = 16;
        const oddT  = 'skew(60deg, -30deg) scaleY(0.66667)';
        const evenT = 'skew(0deg, -30deg) scaleY(1.33333)';

        const d1     = danielList.querySelector('.daniel-desktop-1');
        const d3     = danielList.querySelector('.daniel-desktop-3');
        const year   = danielList.querySelector('.daniel-year');
        const canvas = danielList.querySelector('.daniel-canvas');
        const size   = danielList.querySelector('.daniel-size');
        const m1     = danielList.querySelector('.daniel-mobile-1');
        const m2     = danielList.querySelector('.daniel-mobile-2');
        const m3     = danielList.querySelector('.daniel-mobile-3');
        const m4     = danielList.querySelector('.daniel-mobile-4');

        if (!d1 || !d3 || !year || !canvas || !size || !m1 || !m2 || !m3 || !m4) return;

        if (isMobile) {
            d1.style.display = 'none';
            d3.style.display = 'none';
            m1.style.display = 'list-item';
            m2.style.display = 'list-item';
            m3.style.display = 'list-item';
            m4.style.display = 'list-item';

            m1.style.left = `${step * 1}px`;     m1.style.transform = oddT;
            m2.style.left = `${step * 2}px`;     m2.style.transform = evenT;
            year.style.left = `${step * 3}px`;   year.style.transform = oddT;
            m3.style.left = `${step * 4}px`;     m3.style.transform = evenT;
            m4.style.left = `${step * 5}px`;     m4.style.transform = oddT;
            canvas.style.left = `${step * 6}px`; canvas.style.transform = evenT;
            size.style.left = `${step * 7}px`;   size.style.transform = oddT;
        } else {
            d1.style.display = '';
            d3.style.display = '';
            m1.style.display = 'none';
            m2.style.display = 'none';
            m3.style.display = 'none';
            m4.style.display = 'none';

            year.style.left = '';   year.style.transform = '';
            canvas.style.left = ''; canvas.style.transform = '';
            size.style.left = '';   size.style.transform = '';
        }
    }

    updateBenStaircase();
    updateDanielStaircase();

    // Snap-Erhalt über Resize hinweg: War die Seite beim Resize-Beginn auf einem Snap-Punkt,
    // wird sie nach dem Recalc exakt dorthin zurückgesetzt (Browser kann scrollY beim
    // Resize verschieben → gesnappte Blöcke rutschen sonst sichtbar aus der Snaplinie).
    window.addEventListener('resize', () => {
        const _hoverDev = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        // Touch-Geräte: reine Höhenänderung (iOS Safari URL-Leiste ein/aus) NICHT neu berechnen.
        // recalculateLayout() setzt den Scroll-Spacer kurz auf 0 → maxScroll bricht ein → Browser
        // klemmt scrollY nach oben (Sprung „zu Mythus" am Seitenende). Layout nutzt feste _layoutH().
        if (!_hoverDev && window.innerWidth === _lastResizeWidth) return;
        _lastResizeWidth = window.innerWidth;
        isResizing = true; // Snap-Mechanik pausieren (keine Snaps durch Resize-Scroll-Events)
        _updateAspectClasses(); // sofort (Media-Query-Ersatz); auf Hover-Geräten eingefroren → kein Flip beim Höhen-Ziehen
        if (_hoverDev && _endFloor > 0) {
            // Ende = GESICHTEN-Snap + fester Scrollweg (höhenunabhängig). Spacer zweistufig
            // setzen → maxScroll == _endFloor (robust gegen Messfehler).
            _endSEnd = _applyEndSpacer(Math.round(_endFloor));
            // Synchron neu zeichnen → pro Frame nur der finale, konsistente Zustand (kein Ruckeln).
            applyParallaxEffect(window.scrollY);
        }
        clearTimeout(resizeTimer);
        // Transition während Resize deaktivieren
        document.body.classList.add('no-image-transition');
        resizeTimer = setTimeout(() => {
            recalculateLayout();
            updateBenStaircase();
            updateDanielStaircase();
            // Snap-Mechanik erst nach kurzem Nachlauf wieder aktivieren (Trailing-Scroll-Events)
            setTimeout(() => { isResizing = false; }, 250);
            requestAnimationFrame(() => document.body.classList.remove('no-image-transition'));
        }, 150);
    });

    // =============== THEME TOGGLE ===============
    const themeSwitch = document.querySelector('.theme-switch__checkbox');

    // setTheme im äußeren Scope, damit updateScene() darauf zugreifen kann
    const setTheme = (isDark) => {
        const themeColorMeta = document.querySelector("meta[name='theme-color']");
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark-mode');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#1a1a1a'); // dunkle Rahmenfarbe
            if (themeSwitch) themeSwitch.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#ff6633'); // orange Rahmenfarbe
            if (themeSwitch) themeSwitch.checked = false;
        }
    };

    // Debug-Interface: recalculateLayout zugänglich machen
    window.__debug = window.__debug || {};
    window.__debug._recalculate = recalculateLayout;

    // Theme aus localStorage oder OS-Präferenz laden
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    } else {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            const isDark = themeSwitch.checked;
            setTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });

        // OS-Preference nur wenn kein manuelles Theme gesetzt
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches);
            }
        });
    }
});
