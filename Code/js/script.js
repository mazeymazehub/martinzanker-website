document.addEventListener('DOMContentLoaded', function() {
    // =============== BASIS-KONSTANTEN ===============
    const BASE_PARALLAX_SPEED = 0.35; // Feste Geschwindigkeit für Boxen, Anchors, Bilder
    const BASE_UNTERPUNKT_SPEED = 0.50; // Feste Geschwindigkeit für Unterpunkt-Bilder (Ben, Daniel, Michael, Marcus)

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
       Erkennung: window.innerHeight / window.innerWidth > 1.2
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

    // Hilfsfunktion: Dynamischen Treffpunkt-Ratio berechnen
    function getMeetingRatio() {
        const aspectRatio = window.innerHeight / window.innerWidth;
        // Portrait-Modus: fester Treffpunkt (siehe Kommentarblock oben)
        if (aspectRatio > 1.2) {
            if (window.innerWidth < BREAKPOINT_MOBILE) {
                return Math.max(0, 0.13 - 100 / window.innerHeight); // Original Smartphone-Wert
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
        let meetY = window.innerHeight * meetingRatio;
        // Portrait-Modus: Treffpunkt 80px tiefer
        if (window.innerHeight / window.innerWidth > 1.2) {
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

        let minGap = getBoxGap();
        // Portrait-Modus: MYTHUS-Block 350px tiefer (200 + 150)
        if (window.innerHeight / window.innerWidth > 1.2) {
            minGap += 350;
        }
        // Mobile: MYTHUS-Block 68px tiefer
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            minGap += 68;
        }
        // Desktop (Landscape): MYTHUS-Position angepasst (verhindert Doppel-Snap mit RIVUS)
        const isPortrait = window.innerHeight / window.innerWidth > 1.2;
        if (!isPortrait && window.innerWidth >= 1025) {
            minGap -= 100;
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

        const meetingRatio = getMeetingRatio();
        let meetY = window.innerHeight * meetingRatio;
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            meetY = window.innerHeight * 0.80 - 200;
        } else if (window.innerHeight / window.innerWidth > 1.2) {
            meetY += 80;
        }

        const aStart = getDocumentTop(mythusFilled);
        const schriftenMeetY = window.innerWidth < BREAKPOINT_MOBILE ? meetY - 10 : meetY;

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
        const benRect = (benEl && window.innerWidth >= 601) ? benEl.getBoundingClientRect() : null;
        const rivusTextRightLimit = benRect ? benRect.left - 40 : rightLimit; // 40px Gutter

        // Inline-Stile zuerst zurücksetzen, damit CSS-Werte bei Orientierungswechsel wieder greifen
        paragraphs.forEach(p => {
            if (rivusBox && rivusBox.contains(p)) return;
            p.style.maxWidth = '';
        });

        // Neu berechnen basierend auf aktuellem Layout
        paragraphs.forEach(p => {
            // GESICHTEN-Box: Breite separat gesetzt, hier überspringen
            if (rivusBox && rivusBox.contains(p)) return;
            const left = p.getBoundingClientRect().left;
            // RIVUS-Textbox: Grenze an Bens linker Kante (Grid-Gutter)
            const limit = (rivusTextBox && rivusTextBox.contains(p)) ? rivusTextRightLimit : rightLimit;
            const available = limit - left;
            const computed = parseFloat(getComputedStyle(p).maxWidth);
            if (isNaN(computed) || computed > available) {
                p.style.maxWidth = Math.max(50, available) + 'px';
            }
        });

        // GESICHTEN-Box: Breite immer explizit per JS setzen
        if (rivusBox) {
            const isPortrait = window.innerHeight / window.innerWidth > 1.2;
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
        if (window.innerHeight / window.innerWidth > 1.2) {
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

        // Mobile: Daniel statisch 45px unter Logo-Unterkante
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const headerEl = document.querySelector('header');
            const topPos = headerEl ? headerEl.offsetHeight + 45 : 80;
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
        let meetY = window.innerHeight * meetingRatio - 75;
        if (window.innerHeight / window.innerWidth > 1.2) {
            meetY += 60;
        } else {
            meetY -= 8;
            meetY = Math.max(meetY, window.innerHeight * 0.07 + 50);
        }

        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return;
        const S_meet = S_meet_numerator / S_meet_denominator;
        _sMeetDaniel = S_meet;

        // Oberkante des aktiven Textes messen (für Top-Top-Ausrichtung bei S_meet)
        const _activeTextDaniel = mythusBox.querySelector('.lang-text.active') || mythusBox;
        const _firstElDaniel = _activeTextDaniel.querySelector('h2, p');
        const textTopOffsetDaniel = _firstElDaniel
            ? _firstElDaniel.offsetTop
            : (parseFloat(getComputedStyle(mythusBox).paddingTop) || 0);
        const alignmentOffset_Daniel = (naturalTop_Box - naturalTop_Daniel) + textTopOffsetDaniel;
        const parallaxCorrection_Daniel = S_meet * (speed_Box - speed_Daniel);
        let finalOffset = alignmentOffset_Daniel + parallaxCorrection_Daniel;

        const isPortraitDaniel = window.innerHeight / window.innerWidth > 1.2;
        if (window.innerWidth >= 1025 && !isPortraitDaniel) finalOffset += 55;

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

        // Treffpunkt dynamisch berechnen (gleich wie KONZEPT, 75px höher)
        const meetingRatio = getMeetingRatio();
        let meetY = window.innerHeight * meetingRatio - 75;
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            // Smartphone: RIVUS-Treffpunkt bei 80% der Bildschirmhöhe
            meetY = window.innerHeight * 0.80 - 170;
        } else if (window.innerHeight / window.innerWidth > 1.2) {
            // Portrait-Modus: Treffpunkt 60px tiefer
            meetY += 60;
        } else {
            // Landscape: Treffpunkt 8px höher
            meetY -= 8;
            // Sicherstellen, dass Snap erst passiert wenn RIVUS-Filled noch sichtbar ist
            // fadeThreshold = 0.07 * vh → meetY muss deutlich darüber liegen
            meetY = Math.max(meetY, window.innerHeight * 0.07 + 50);
        }

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(gesichtenFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Box2
        // Wenn Wrapper fixed: getDocumentTop(contentBox2) liefert 0 → _box2WrapperDocTop nutzen
        const box2Wrapper = document.getElementById('rivus-content-box-wrapper');
        const box2Start = (box2Wrapper && box2Wrapper.style.position === 'fixed')
            ? _box2WrapperDocTop
            : getDocumentTop(contentBox2);
        const anchorHeight = gesichtenAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap();
        const anchorStart = box2Start + 15 - anchorGap - anchorHeight;

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

        const meetingRatio = getMeetingRatio();
        let meetY = window.innerHeight * meetingRatio;
        if (window.innerHeight / window.innerWidth > 1.2 && window.innerWidth >= BREAKPOINT_MOBILE) {
            meetY += 80; // Portrait (Tablet): Treffpunkt 80px tiefer
        } else {
            meetY += 70; // Landscape/Desktop: +70 kompensiert den +70-Anchor-Offset
        }

        const aStart = getDocumentTop(rivusFilled);

        const box3Start = getDocumentTop(document.getElementById('gesichten-content-box-wrapper'));
        const anchorHeight = rivusAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap(); // We can reuse this
        const anchorStart = box3Start + 70 - anchorGap - anchorHeight;

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
    let meetingPointZoneOverrides = new Map();
    let isSnapping = false;
    let scrollEndTimer;
    let magnetAnimFrame = null;

    function calculateMeetingPoints() {
        meetingPoints = [];
        meetingPointZoneOverrides = new Map();

        // KONZEPT
        const konzeptAnchorEl = document.querySelector('.konzept-heading-anchor');
        const alexImg = document.querySelector('.main-heading-image');
        if (konzeptAnchorEl && alexImg) {
            const meetingRatio = getMeetingRatio();
            let meetY = window.innerHeight * meetingRatio;
            if (window.innerHeight / window.innerWidth > 1.2) meetY += 80;
            const anchorHeight = konzeptAnchorEl.offsetHeight;
            const anchorGap = getKonzeptAnchorGap();
            const anchorStart = getDocumentTop(alexImg) + alexImg.offsetHeight + getBoxAlexGap() - anchorGap - anchorHeight;
            const sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED);
            if (sMeet > 100) meetingPoints.push(sMeet);
        }

        // RIVUS
        const contentBoxWrapper2El = document.getElementById('rivus-content-box-wrapper');
        const gesichtenAnchorEl = document.querySelector('.rivus-anchor-gray');
        if (contentBoxWrapper2El && gesichtenAnchorEl) {
            const meetingRatio = getMeetingRatio();
            let meetY = window.innerHeight * meetingRatio - 75;
            if (window.innerWidth < BREAKPOINT_MOBILE) {
                meetY = window.innerHeight * 0.80 - 170;
            } else if (window.innerHeight / window.innerWidth > 1.2) {
                meetY += 60;
            } else {
                meetY -= 8;
                // Sicherstellen, dass Snap erst passiert wenn RIVUS-Filled noch sichtbar ist
                meetY = Math.max(meetY, window.innerHeight * 0.07 + 50);
            }
            const anchorHeight = gesichtenAnchorEl.offsetHeight;
            const anchorGap = getGesichtenAnchorGap();
            // _box2WrapperDocTop nutzen: fixed Wrapper → getDocumentTop() liefert 0
            const anchorStart = _box2WrapperDocTop + 15 - anchorGap - anchorHeight;
            const sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED);
            if (sMeet > 100) meetingPoints.push(sMeet);
        }

        // MYTHUS
        const mythusAnchorEl = document.getElementById('mythus-anchor');
        if (mythusAnchorEl) {
            const meetingRatio = getMeetingRatio();
            let meetY = window.innerHeight * meetingRatio - 75;
            if (window.innerWidth < BREAKPOINT_MOBILE) {
                meetY = window.innerHeight * 0.80 - 200;
            } else if (window.innerHeight / window.innerWidth > 1.2) {
                meetY += 60;
            } else {
                meetY -= 8;
                meetY = Math.max(meetY, window.innerHeight * 0.07 + 50);
            }
            const anchorHeight = mythusAnchorEl.offsetHeight;
            const anchorGap = getKonzeptAnchorGap();
            const mobileAnchorOffset = window.innerWidth < BREAKPOINT_MOBILE ? 33 : 0;
            const anchorStart = getDocumentTop(document.getElementById('mythus-box-wrapper')) - anchorGap - anchorHeight + mobileAnchorOffset;
            const sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED);
            if (sMeet > 100) {
                meetingPoints.push(sMeet);
                meetingPointZoneOverrides.set(sMeet, { before: 500, after: 180 });
            }
        }

        // GESICHTEN
        const rivusAnchorEl = document.getElementById('gesichten-anchor-gray');
        if (rivusAnchorEl) {
            const meetingRatio = getMeetingRatio();
            let meetY = window.innerHeight * meetingRatio;
            if (window.innerHeight / window.innerWidth > 1.2 && window.innerWidth >= BREAKPOINT_MOBILE) {
                meetY += 80; // Portrait (Tablet): Treffpunkt 80px tiefer
            }
            const anchorHeight = rivusAnchorEl.offsetHeight;
            const anchorGap = getGesichtenAnchorGap();
            const anchorStart = getDocumentTop(document.getElementById('gesichten-content-box-wrapper')) + 70 - anchorGap - anchorHeight;
            const sMeet = (anchorStart - meetY) / (1 - BASE_PARALLAX_SPEED);
            if (sMeet > 100) meetingPoints.push(sMeet);
        }

        // MICHAEL (Non-Mobile): Snap so dass Bildmitte = Viewport-Mitte
        if (window.innerWidth >= 601) {
            const michaelEl = document.getElementById('michael-image-with-info');
            if (michaelEl) {
                // position:relative → getDocumentTop gibt natural flow-Top ohne style.top
                // Visueller Offset durch JS-positionierung (style.top) muss addiert werden
                const naturalTop = getDocumentTop(michaelEl);
                const styleTop = parseFloat(michaelEl.style.top || '0');
                const michaelVisualDocTop = naturalTop + styleTop;
                const michaelHeight = michaelEl.offsetHeight;
                const sMichael = (michaelVisualDocTop + michaelHeight / 2 - window.innerHeight / 2) / (1 - BASE_UNTERPUNKT_SPEED);
                if (sMichael > 100) {
                    meetingPoints.push(sMichael);
                    const isDesktop = window.innerWidth >= 1025 && window.innerHeight / window.innerWidth <= 1.2;
                    if (isDesktop) meetingPointZoneOverrides.set(sMichael, 600);
                }
            }
        }

        meetingPoints.sort((a, b) => a - b);
        console.log('snapPoints:', meetingPoints.map(p => Math.round(p)));

        // Spacer-Höhe dynamisch setzen: letzter Snap-Punkt muss erreichbar sein
        const spacer = document.getElementById('scroll-spacer');
        if (spacer && meetingPoints.length > 0) {
            const lastPoint = meetingPoints[meetingPoints.length - 1];
            const needed = lastPoint;
            const contentHeight = document.body.scrollHeight - spacer.offsetHeight;
            spacer.style.height = Math.max(0, needed - contentHeight + window.innerHeight) + 'px';
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
        if (window.innerHeight / window.innerWidth > 1.2) {
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
    const BREAKPOINT_MOBILE = 600;

    function getBoxGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        let gap = BOX_GAP_NARROW + widthFactor * (BOX_GAP_WIDE - BOX_GAP_NARROW);
        // Smartphone: alles ab RIVUS 300px tiefer
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            gap += 300;
        }
        return gap;
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

        // Smartphone: RIVUS nach Ben positionieren
        // Ben ist position:fixed, daher Höhe aus CSS (80vh) manuell berechnen
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const benHeight = window.innerHeight * 0.80;
            const benBottom = box1LogicalBottom + UNTERPUNKT_BOX_GAP + benHeight;
            const targetTop = benBottom + 40 - 200; // 200px höher
            const offset = targetTop - gesichtenBaseTop;
            gesichtenContainer.style.marginTop = `${offset}px`;
            return;
        }

        // Dynamischer Mindestabstand (- 150px: alle Blöcke ab Block 2 höher)
        let minGap = getBoxGap() - 165;
        // Portrait-Modus: RIVUS-Anchor + Textbox 230px tiefer (80 + 150)
        if (window.innerHeight / window.innerWidth > 1.2) {
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

        let minGap = getBoxGap();
        // Portrait-Modus: GESICHTEN-Block 20px tiefer
        if (window.innerHeight / window.innerWidth > 1.2) {
            minGap += 20;
        }

        const mythusBoxLogicalTop = getMythusBoxLogicalTop();
        const mythusBoxHeight = mythusBox.offsetHeight;
        const mythusBoxLogicalBottom = mythusBoxLogicalTop + mythusBoxHeight;

        const rivusBaseTop = getDocumentTop(rivusContainer);

        const naturalGap = rivusBaseTop - mythusBoxLogicalBottom;
        let offset = minGap - naturalGap - 20;
        const isPortrait = window.innerHeight / window.innerWidth > 1.2;
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
        if (!isPortrait && !isMobile) offset -= 300;
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
        if (window.innerWidth >= 600) return; // Nur für schmale Fenster

        const benContainer = document.getElementById('ben-image-with-info');
        const contentBox2 = document.getElementById('rivus-content-box');

        if (!benContainer || !contentBox2) return;

        // Treffpunkt: Ben soll bei diesem Viewport-Anteil erscheinen
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

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

        // RIVUS-Container startet nach dem dynamischen Gap (- 150px: alle Blöcke ab Block 2 höher)
        let minGap = getBoxGap() - 165;
        // Portrait-Modus: gleicher +230px-Offset wie in positionGesichtenAndBox2()
        if (window.innerHeight / window.innerWidth > 1.2) {
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
        let meetY = window.innerHeight * meetingRatio - 75;
        if (window.innerHeight / window.innerWidth > 1.2) {
            meetY += 60;
        } else {
            meetY -= 8;
            meetY = Math.max(meetY, window.innerHeight * 0.07 + 50);
        }

        // 3. Den Scroll-Punkt 'S_meet' berechnen, an dem der Anchor den Treffpunkt erreicht
        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return; // Division durch Null vermeiden
        const S_meet = S_meet_numerator / S_meet_denominator;
        _sMeetBen = S_meet;

        // 4. Oberkante des aktiven Textes messen (für Top-Top-Ausrichtung bei S_meet)
        const _activeTextBen = contentBox2.querySelector('.lang-text.active') || contentBox2;
        const _firstElBen = _activeTextBen.querySelector('h2, p');
        const textTopOffsetBen = _firstElBen
            ? _firstElBen.offsetTop
            : (parseFloat(getComputedStyle(contentBox2).paddingTop) || 0);
        const alignmentOffset_Ben = (naturalTop_Box - naturalTop_Ben) + textTopOffsetBen;
        const parallaxCorrection_Ben = S_meet * (speed_Box - speed_Ben);
        const isPortraitBen = window.innerHeight / window.innerWidth > 1.2;
        const desktopOffsetBen = (window.innerWidth >= 1025 && !isPortraitBen) ? 15 : 0;
        const finalOffset = alignmentOffset_Ben + parallaxCorrection_Ben + desktopOffsetBen;
        benContainer.style.top = `${finalOffset}px`;
    }

    let michaelMobileParallaxSpeed = BASE_UNTERPUNKT_SPEED;

    function calculateMichaelMobileParallaxSpeed() {
        if (window.innerWidth >= 600) return;

        const michaelContainer = document.getElementById('michael-image-with-info');
        const rivusContentBox = document.getElementById('gesichten-content-box');

        if (!michaelContainer || !rivusContentBox) return;

        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

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

        michaelContainer.style.top = '0px';
        if (marcusContainer) {
            marcusContainer.style.top = '0px';
        }


        const box3LogicalTop = getBox3LogicalTop();
        const box3Height = rivusContentBox.offsetHeight;
        const michaelNaturalTop = getDocumentTop(michaelContainer);

        // Mobile: Michael + Marcus statisch 15px unter Logo-Unterkante
        if (window.innerWidth < 600) {
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
        const speed_Michael = BASE_UNTERPUNKT_SPEED;
        const anchorGap = getGesichtenAnchorGap();
        const anchorHeight = rivusAnchor.offsetHeight;

        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return;
        const S_meet = S_meet_numerator / S_meet_denominator;

        // Non-Mobile: Michael direkt unterhalb der GESICHTEN-Box (so groß wie möglich)
        // Formel: Michaels Oberkante trifft Box-Unterkante beim Snap-Punkt S_meet
        const alignmentOffset_Michael = (naturalTop_Box - naturalTop_Michael) + _cachedRivusBoxHeight;
        const parallaxCorrection_Michael = S_meet * (speed_Box - speed_Michael);
        const finalOffset = alignmentOffset_Michael + parallaxCorrection_Michael;

        const isPortrait = window.innerHeight / window.innerWidth > 1.2;
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
        const desktopOffset = (!isPortrait && !isMobile) ? -120 : 0;
        const imageTop = finalOffset + desktopOffset;
        michaelContainer.style.top = `${imageTop}px`;

        // Container-Mindesthöhe: sicherstellen, dass Michael vollständig sichtbar ist
        const outerContainer = document.getElementById('michael-marcus-container');
        if (outerContainer && michaelImage) {
            const required = imageTop + michaelImage.offsetHeight + 120; // 120px Abstand am Ende
            outerContainer.style.minHeight = `${Math.max(required, window.innerHeight)}px`;
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
            // Nur aus DOM messen wenn Wrapper zurückgesetzt (nach recalculateLayout-Reset).
            // Bei afterSwitch()-Aufruf ist Wrapper fixed → getDocumentTop()=0 → vorherigen Wert behalten.
            if (_rivusContentBoxWrapper2.style.position !== 'fixed') {
                _box2WrapperDocTop = getDocumentTop(_rivusContentBoxWrapper2);
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
            _mythusWrapperDocTop = getDocumentTop(_mythusBoxWrapper);
            _mythusAnchorLeft = _mythusFilled.getBoundingClientRect().left;
        }

        // GESICHTEN Anchor
        if (_gesichtenAnchorGray && _gesichtenAnchorFilled && _gesichtenContentBoxWrapper) {
            _gesichtenAnchorHeight2 = _gesichtenAnchorGray.offsetHeight;
            _gesichtenAnchorGap2 = getGesichtenAnchorGap();
            _gesichtenWrapperDocTop = getDocumentTop(_gesichtenContentBoxWrapper);
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

        // Sanfte Theme-Transitions erst nach initialem Rendern aktivieren
        requestAnimationFrame(() => {
            document.body.classList.add('theme-transitioning');
            document.documentElement.classList.add('theme-transitioning');
        });
    });

    // Touch-Toggle für Bild-Info (nur Mobile)
    document.querySelectorAll('#ben-image-with-info, #mythus-daniel-image-with-info, #michael-image-with-info, #marcus-image-with-info').forEach(container => {
        container.addEventListener('click', function(e) {
            if (window.innerWidth >= BREAKPOINT_MOBILE) return;
            const isActive = this.classList.contains('info-active');
            document.querySelectorAll('.info-active').forEach(el => {
                el.classList.remove('info-active');
                el.style.zIndex = '';
            });
            if (!isActive) {
                this.classList.add('info-active');
                this.style.zIndex = '20';
            }
            e.stopPropagation();
        });
    });
    document.addEventListener('click', () => {
        if (window.innerWidth >= BREAKPOINT_MOBILE) return;
        document.querySelectorAll('.info-active').forEach(el => {
            el.classList.remove('info-active');
            el.style.zIndex = '';
        });
    });

    // Locale-Toggle (DE/EN)
    const localeBtns = document.querySelectorAll('.locale-switch__btn');

    function setLocale(locale) {
        localeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.locale === locale));
        document.querySelectorAll('.locale-de, .locale-en, .locale-es').forEach(el => {
            el.classList.toggle('active', el.classList.contains('locale-' + locale));
        });
        document.querySelectorAll('[data-de]').forEach(el => {
            if (locale === 'en') el.textContent = el.dataset.en || el.dataset.de;
            else if (locale === 'es') el.textContent = el.dataset.es || el.dataset.de;
            else el.textContent = el.dataset.de;
        });
        localStorage.setItem('locale', locale);
    }

    // Wechselt Sprache/Level ohne Bildpositionen zu verschieben.
    // Kompensiert parent-Verschiebung durch DOM-Reflow direkt am style.top der Bilder.
    function applyWithStableImages(switchFn) {
        const imageIds = [
            'ben-image-with-info',
            'mythus-daniel-image-with-info',
            'michael-image-with-info',
        ];
        const snapshots = imageIds.map(id => {
            const el = document.getElementById(id);
            const parent = el ? el.offsetParent : null;
            return { el, beforeTop: parent ? getDocumentTop(parent) : 0 };
        });

        switchFn();
        document.body.classList.add('no-image-transition');

        // Bildpositionen kompensieren
        snapshots.forEach(({ el, beforeTop }) => {
            if (!el) return;
            const parent = el.offsetParent;
            const afterTop = parent ? getDocumentTop(parent) : 0;
            const delta = afterTop - beforeTop;
            if (delta !== 0) {
                el.style.top = (parseFloat(el.style.top || '0') - delta) + 'px';
            }
        });

        requestAnimationFrame(() => document.body.classList.remove('no-image-transition'));
    }

    function afterSwitch() {
        positionMythusBoxText();
        positionAnchors();
        // Bildpositionen neu berechnen: contentSpan ändert sich mit Sprache/Niveau
        positionBen();
        positionMythusDaniel();
        calculateRivusAParallaxSpeed();
        calculateMeetingPoints();
        calculateImageFreezeBounds();
    }

    let currentLocale = null;
    localeBtns.forEach(btn => btn.addEventListener('click', () => {
        const locale = btn.dataset.locale;
        if (locale === currentLocale) return;
        currentLocale = locale;
        applyWithStableImages(() => { setLocale(locale); capTextRightBoundary(); });
        requestAnimationFrame(() => afterSwitch());
    }));
    setLocale(localStorage.getItem('locale') || 'de');
    currentLocale = localStorage.getItem('locale') || 'de';

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
            applyWithStableImages(() => { setLanguage(lang); capTextRightBoundary(); });
            requestAnimationFrame(() => afterSwitch());
        });
    });

    // Gespeicherte Präferenz wiederherstellen (Standard: expert)
    setLanguage(localStorage.getItem('lang-level') || 'expert');
    currentLang = localStorage.getItem('lang-level') || 'expert';

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

    const fadeOutThreshold = window.innerHeight * 0.09;
    const fadeInThreshold = window.innerHeight * 0.30;

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

    // Cached anchor positioning data (computed in positionAnchors, used per frame)
    let _anchorsReady = false;
    let _alexDocTop = 0, _alexHeight = 0, _boxAlexGap = 0;
    let _konzeptAnchorHeight = 0, _konzeptAnchorGap = 0, _konzeptAnchorLeft = 0;
    let _rivusAnchorHeight2 = 0, _rivusAnchorGap2 = 0, _rivusAnchorLeft = 0, _box2WrapperDocTop = 0;
    let _mythusAnchorHeight2 = 0, _mythusAnchorGap2 = 0, _mythusAnchorLeft = 0, _mythusWrapperDocTop = 0;
    let _gesichtenAnchorHeight2 = 0, _gesichtenAnchorGap2 = 0, _gesichtenAnchorLeft = 0, _gesichtenWrapperDocTop = 0;
    // Image freeze bounds: S_meet = scroll when image top = text top; S_exit = scroll when image bottom = text bottom
    let _sMeetBen = 0, _sExitBen = 0;
    let _sMeetDaniel = 0, _sExitDaniel = 0;
    const _heroSection = document.querySelector('.hero-section');
    const _visHeadings = [
        document.querySelector('.main-heading-filled'),
        _konzeptFilled,
        document.querySelector('.unterpunkt-heading-filled'),
        _gesichtenAnchorFilled,
        _rivusFilled,
        _mythusFilled
    ];

    // Initial update
    updateScene();

    window.addEventListener('scroll', () => {
        latestScroll = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateScene();
                ticking = false;
            });
            ticking = true;
        }

        // Magnet Snap: Timer nur starten wenn User nicht aktiv scrollt
        if (!isSnapping && !isTouching && !isScrollbarHeld) {
            scheduleSnapCheck();
        }
    });

    function scheduleSnapCheck() {
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
                const zone = override
                    ? (typeof override === 'object'
                        ? (s < point ? override.before : override.after)
                        : override)
                    : Math.min(distPrev, distNext) * 0.24;
                if (dist <= zone && dist < minDist) { minDist = dist; target = point; }
            }
            if (target !== null) slowScrollTo(target);
        }, 200);
    }

    function updateScene() {
        // Phase 1: Alle Transforms schreiben (WRITE, kein Layout-Reflow)
        applyParallaxEffect(latestScroll);

        // Phase 2: Alle Layout-Reads gebatcht (ein einziger Reflow)
        const fadeThreshold = window.innerHeight * 0.07;
        const fadeThresholdEarly = window.innerHeight * 0.23; // RIVUS/MYTHUS/GESICHTEN früher ausblenden (nur Mobile)
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
            // Smallest mobile
            startHeight = 63;
            endHeight = 63; // No shrinking on smallest mobile
            navHeight = 25;
            startTextSize = 34; // 20% smaller than 42px (42 × 0.8 = 33.6)
            endTextSize = 34;

            // Intro-Animation: Logo startet 200px tiefer, bewegt sich beim Scrollen hoch
            const INTRO_OFFSET = 100;
            const introOffset = Math.max(0, INTRO_OFFSET - scrollY);
            const clampedScroll = Math.max(scrollY, 0);
            const progress = Math.min(clampedScroll / maxScroll, 1);
            const newHeight = startHeight;
            const header = document.querySelector('header');
            if (header) header.style.top = `${navHeight + introOffset}px`;
            if (_heroSection) _heroSection.style.marginTop = `${navHeight + newHeight + introOffset}px`;
            if (_headerBackdrop) _headerBackdrop.style.height = `${navHeight + newHeight}px`;
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

        // Clamp scrollY to prevent negative values (rubber band effect when scrolling up)
        let clampedScrollY = Math.max(scrollY, 0);
        let progress = Math.min(clampedScrollY / maxScroll, 1);
        let newHeight = startHeight - (startHeight - endHeight) * progress;
        let newTextSize = startTextSize - (startTextSize - endTextSize) * progress;

        header.style.height = `${newHeight}px`;

        const tx = progress === 1 ? 'translate(-50%, calc(-50% - 2px))' : 'translate(-50%, -50%)';
        if (_headerLogos.length > 0) {
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
        const fadeThreshold = window.innerHeight * 0.07;

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

        const show = el => { if (el) el.style.opacity = '1'; };
        const hide = el => { if (el) el.style.opacity = '0'; };

        if (gesichtenTop < imageFixedTop) {
            hide(_benImage); hide(_mythusDaniel); hide(_michaelImage); show(_marcusImage);
        } else if (mythusTop < imageFixedTop) {
            hide(_benImage); hide(_mythusDaniel); show(_michaelImage); hide(_marcusImage);
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
        const isMobile = window.innerWidth < 600;

        // Main heading image
        if (_mainImageContainer) {
            _mainImageContainer.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }

        // Mobile: Sichtbarkeit der Bilder per Scroll steuern (statisch, kein transform)
        if (isMobile) {
            updateMobileImageVisibility();
        } else {
            // Berechnet transform-Y mit optionalem Freeze-Fenster [sMeet, sExit].
            // Phase 1 (vor Snap):  normale Parallax
            // Phase 2 (Freeze):    Bild steht; transform kompensiert Page-Scroll
            // Phase 3 (nach Exit): Bild scrollt mit Box-Geschwindigkeit (synchron zum Text)
            const imgSpeed = BASE_UNTERPUNKT_SPEED;
            const boxSpeed = BASE_PARALLAX_SPEED;
            const frozenTransformY = (s, sMeet, sExit) => {
                if (sMeet <= 0 || sExit <= sMeet) return s * imgSpeed;
                if (s <= sMeet) return s * imgSpeed;
                if (s < sExit)  return s - sMeet * (1 - imgSpeed);
                // Nahtloser Übergang: ab sExit mit boxSpeed wegscrollen (= Textgeschwindigkeit)
                return (sExit - sMeet * (1 - imgSpeed)) + (s - sExit) * boxSpeed;
            };

            if (_benImage) {
                _benImage.style.transform = `translate3d(0, ${frozenTransformY(scrollY, _sMeetBen, _sExitBen)}px, 0)`;
            }
            if (_mythusDaniel) {
                _mythusDaniel.style.transform = `translate3d(0, ${frozenTransformY(scrollY, _sMeetDaniel, _sExitDaniel)}px, 0)`;
            }
            if (_michaelImage) {
                _michaelImage.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
            }
            if (_marcusImage) {
                _marcusImage.style.transform = `translate3d(0, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
            }
        }

        // Content box 1 - horizontaler Offset auf Box, Vertikalposition via transform auf Wrapper
        if (_contentBox) {
            _contentBox.style.transform = 'translate3d(20%, 0, 0)';
        }
        if (_anchorsReady && _contentBoxWrapper) {
            const boxTop = _alexDocTop + _alexHeight - scrollY * (1 - BASE_PARALLAX_SPEED) + _boxAlexGap;
            _contentBoxWrapper.style.transform = `translate3d(0, ${boxTop}px, 0)`;
        }

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
                const wrapperVisualTop = _box2WrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const anchorTop = wrapperVisualTop - _rivusAnchorHeight2 - _rivusAnchorGap2 + 15;
                _rivusAnchor.style.transform = `translate3d(${_rivusAnchorLeft}px, ${anchorTop}px, 0) rotate(-4deg)`;
            }

            // MYTHUS Anchor – folgt MYTHUS Box Wrapper
            if (_mythusAnchor) {
                const wrapperVisualTop = _mythusWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const mobileOffset = window.innerWidth < BREAKPOINT_MOBILE ? 38 : 0;
                const anchorTop = wrapperVisualTop - _mythusAnchorHeight2 - _mythusAnchorGap2 + mobileOffset;
                _mythusAnchor.style.transform = `translate3d(${_mythusAnchorLeft}px, ${anchorTop}px, 0) rotate(4deg)`;
            }

            // GESICHTEN Anchor – folgt GESICHTEN Box Wrapper
            if (_gesichtenAnchorGray) {
                const wrapperVisualTop = _gesichtenWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const anchorTop = wrapperVisualTop - _gesichtenAnchorHeight2 - _gesichtenAnchorGap2 + 70;
                _gesichtenAnchorGray.style.transform = `translate3d(${_gesichtenAnchorLeft}px, ${anchorTop}px, 0) rotate(-4deg)`;
            }
        }

        // MYTHUS box - vertikal auf Wrapper, horizontal auf Box
        if (_mythusBoxWrapper) {
            _mythusBoxWrapper.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }
        if (_mythusBox) {
            const mythusShift = window.innerWidth < BREAKPOINT_MOBILE ? '0%' : '20%';
            const mythusBoxOffsetY = window.innerWidth < BREAKPOINT_MOBILE ? 12 : 0;
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
        if (_mythusFilled) {
            _mythusFilled.style.transform = `translate3d(0, ${scrollY * mythusAParallaxSpeed}px, 0) rotate(2deg)`;
        }
        if (_mythusOutline) {
            _mythusOutline.style.transform = `translate3d(0, ${scrollY * mythusAParallaxSpeed}px, 0) rotate(2deg)`;
        }

        // RIVUS content box (links) - position:fixed wie KONZEPT, Transform: docTop - scrollY*(1-speed)
        if (_anchorsReady && _rivusContentBoxWrapper2) {
            const rivusTop = _box2WrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
            _rivusContentBoxWrapper2.style.transform = `translate3d(0, ${rivusTop}px, 0)`;
        }
        if (_rivusContentBox2) {
            const rightOffset = getGesichtenRightOffset();
            const totalXOffset = -window.innerWidth * 0.2 + rightOffset + 61;
            _rivusContentBox2.style.transform = `translate3d(${totalXOffset}px, 0, 0)`;
        }

        // GESICHTEN content box - vertikal auf Wrapper, horizontal auf Box
        if (_gesichtenContentBoxWrapper) {
            _gesichtenContentBoxWrapper.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }
        if (_gesichtenContentBox) {
            const totalXOffset = window.innerWidth * 0.2;
            const isPortrait = window.innerHeight / window.innerWidth > 1.2;
            const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
            const yOffset = (!isPortrait && !isMobile) ? 50 : 0;
            _gesichtenContentBox.style.transform = `translate3d(${totalXOffset}px, ${yOffset}px, 0)`;
        }

        // RIVUS filled & outline
        if (_rivusFilled) {
            _rivusFilled.style.transform = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed}px, 0) rotate(-2deg)`;
        }
        if (_rivusOutline) {
            _rivusOutline.style.transform = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed}px, 0) rotate(-2deg)`;
        }

        // GESICHTEN filled & outline
        if (_gesichtenAnchorFilled) {
            _gesichtenAnchorFilled.style.transform = `translate3d(0, ${scrollY * rivusAParallaxSpeed}px, 0) rotate(-2deg)`;
        }
        if (_gesichtenAnchorOutline) {
            _gesichtenAnchorOutline.style.transform = `translate3d(0, ${scrollY * rivusAParallaxSpeed}px, 0) rotate(-2deg)`;
        }

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
    function calculateImageFreezeBounds() {
        const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
        if (isMobile) { _sExitBen = 0; _sExitDaniel = 0; return; }

        const boxSpeed = BASE_PARALLAX_SPEED;

        // Hilfsfunktion: exakter Textbereich = Unterkante letztes Element − Oberkante erstes Element
        function getTextSpan(box) {
            // Nur aktive Sprachvariante auswählen, damit display:none-Elemente
            // (deren offsetTop=0) den lastEl nicht verfälschen.
            const container = box.querySelector('.lang-text.active') || box;
            const allEls = container.querySelectorAll('h2, p');
            if (allEls.length === 0) return box.offsetHeight;
            const firstEl = allEls[0];
            const lastEl  = allEls[allEls.length - 1];
            return lastEl.offsetTop + lastEl.offsetHeight - firstEl.offsetTop;
        }

        // Einheitliche Exit-Formel für beide Ausrichtungsstrategien:
        // • imgHeight > contentSpan (Bottom-Bottom-Eintritt): Exit wenn Text-OK = Bild-OK
        // • contentSpan > imgHeight (Top-Top-Eintritt):       Exit wenn Text-UK = Bild-UK
        // Freeze-Dauer = |imgHeight - contentSpan| / (1 - boxSpeed)
        function calcSExit(sMeet, imgHeight, contentSpan) {
            return sMeet + Math.abs(imgHeight - contentSpan) / (1 - boxSpeed);
        }

        // Ben / RIVUS-Box
        const box2 = document.getElementById('rivus-content-box');
        if (_benImage && box2 && _sMeetBen > 0) {
            const _benInnerImg = _benImage.querySelector('.unterpunkt-heading-image');
            const _benH = _benInnerImg ? _benInnerImg.offsetHeight : _benImage.offsetHeight;
            const _benSpan = getTextSpan(box2);
            _sExitBen = _benH > _benSpan ? 0 : calcSExit(_sMeetBen, _benH, _benSpan);
        } else {
            _sExitBen = 0;
        }

        // Daniel / MYTHUS-Box
        const mythusBox = document.getElementById('mythus-box');
        if (_mythusDaniel && mythusBox && _sMeetDaniel > 0) {
            const _danielInnerImg = _mythusDaniel.querySelector('.unterpunkt-heading-image');
            const _danielH = _danielInnerImg ? _danielInnerImg.offsetHeight : _mythusDaniel.offsetHeight;
            const _danielSpan = getTextSpan(mythusBox);
            _sExitDaniel = _danielH > _danielSpan ? 0 : calcSExit(_sMeetDaniel, _danielH, _danielSpan);
        } else {
            _sExitDaniel = 0;
        }
    }

    function recalculateLayout() {
        _anchorsReady = false; // Zurücksetzen damit updateScene den Fallback nutzt

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

        // Box-Höhen neu messen (orientierungsabhängig)
        const _box2El = document.getElementById('rivus-content-box');
        const _mythusBoxEl = document.getElementById('mythus-box');
        const _gesichtenBoxEl = document.getElementById('gesichten-content-box');
        if (_box2El) _cachedBox2Height = _box2El.offsetHeight;
        if (_mythusBoxEl) _cachedMythusBoxHeight = _mythusBoxEl.offsetHeight;
        if (_gesichtenBoxEl) _cachedRivusBoxHeight = _gesichtenBoxEl.offsetHeight;

        updateScene();
        calculateKonzeptAParallaxSpeed();
        positionGesichtenAndBox2();
        // _box2WrapperDocTop direkt aus DOM messen (gleicher Wert wie in positionAnchors und Parallax).
        // Direkte DOM-Messung verhindert Abweichungen durch Formel-Approximation (anchorTop+height+margin).
        if (_rivusContentBoxWrapper2) {
            _box2WrapperDocTop = getDocumentTop(_rivusContentBoxWrapper2);
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
        if (_gesichtenContentBoxWrapper) _gesichtenWrapperDocTop = getDocumentTop(_gesichtenContentBoxWrapper);
        applyParallaxEffect(window.scrollY); // Anchors mit korrekten DocTops aktualisieren
        calculateRivusAParallaxSpeed();
        calculateMeetingPoints();
        calculateImageFreezeBounds();
    }

    // =============== BEN STAIRCASE: iPad Portrait Split ===============
    function updateBenStaircase() {
        const benList = document.querySelector('#ben-container .words-stair');
        if (!benList) return;

        const isSplit = window.innerWidth <= 600
                     || (window.innerWidth <= 1024 && window.innerHeight > window.innerWidth);

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

    updateBenStaircase();

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        // Transition während Resize deaktivieren
        document.body.classList.add('no-image-transition');
        resizeTimer = setTimeout(() => {
            recalculateLayout();
            updateBenStaircase();
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
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#1a1a1a');
            if (themeSwitch) themeSwitch.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#E9E9E4');
            if (themeSwitch) themeSwitch.checked = false;
        }
    };

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
