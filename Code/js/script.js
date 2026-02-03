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
        const box2 = document.querySelector('.content-box-2');
        const mythusContainer = document.getElementById('mythus-anchor-container');

        if (!box2 || !mythusContainer) return;

        mythusContainer.style.marginTop = '0px';

        let minGap = getBoxGap();
        // Portrait-Modus: MYTHUS-Block 350px tiefer (200 + 150)
        if (window.innerHeight / window.innerWidth > 1.2) {
            minGap += 350;
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
        const meetY = window.innerHeight * meetingRatio;

        const aStart = getDocumentTop(mythusFilled);

        const mythusBoxStart = getMythusBoxLogicalTop();
        const anchorHeight = mythusAnchor.offsetHeight;
        const anchorGap = getKonzeptAnchorGap();
        const anchorStart = mythusBoxStart - anchorGap - anchorHeight;

        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED;

        const numerator = (aStart - meetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        if (Math.abs(denominator) < 10) {
            mythusAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            mythusAParallaxSpeed = 1 - numerator / denominator;
        }

        mythusAParallaxSpeed = Math.min(1, mythusAParallaxSpeed);
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

        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const mythusBoxLogicalBottom = mythusBoxLogicalTop + mythusBoxHeight;
            // MYTHUS ist Block 3, folgt nach Box 2
            const box2 = document.querySelector('.content-box-2');
            if (!box2) return;
            const box2LogicalTop = getBox2LogicalTop();
            const box2LogicalBottom = box2LogicalTop + box2.offsetHeight;
            const minGap = getBoxGap();
            const mythusLogicalTop = box2LogicalBottom + minGap;
            const danielContainerElement = document.getElementById('mythus-daniel-container');
            const danielContainerRelativeTop = getDocumentTop(danielContainerElement) - getDocumentTop(mythusContainer);
            const danielContainerLogicalTop = mythusLogicalTop + danielContainerRelativeTop;

            const targetDanielTop = mythusBoxLogicalBottom + UNTERPUNKT_BOX_GAP;
            let offset = targetDanielTop - danielContainerLogicalTop + 100;
            // Portrait-Modus: Daniel 370px höher
            if (window.innerHeight / window.innerWidth > 1.2) {
                offset -= 370;
            }
            mythusDaniel.style.top = `${offset}px`;
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
        const meetY = window.innerHeight * meetingRatio;

        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return;
        const S_meet = S_meet_numerator / S_meet_denominator;

        const alignmentOffset = (naturalTop_Box - naturalTop_Daniel) + (boxHeight - danielHeight) / 2;
        const parallaxCorrection = S_meet * (speed_Box - speed_Daniel);
        let finalOffset = alignmentOffset + parallaxCorrection + 100;
        // Portrait-Modus: Daniel 125px höher
        if (window.innerHeight / window.innerWidth > 1.2) {
            finalOffset -= 125;
        }

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
        const gesichtenFilled = document.querySelector('.gesichten-anchor-filled');
        const contentBox2 = document.querySelector('.content-box-2');
        const gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');

        if (!gesichtenFilled || !contentBox2 || !gesichtenAnchor) return;

        // Treffpunkt dynamisch berechnen (gleich wie KONZEPT, 75px höher)
        const meetingRatio = getMeetingRatio();
        let meetY = window.innerHeight * meetingRatio - 75;
        // Portrait-Modus: Treffpunkt 60px tiefer
        if (window.innerHeight / window.innerWidth > 1.2) {
            meetY += 60;
        }

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(gesichtenFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Box2
        // Anchor = Box2.top - anchorGap - Anchor.height
        const box2Start = getDocumentTop(contentBox2);
        const anchorHeight = gesichtenAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap();
        const anchorStart = box2Start - anchorGap - anchorHeight;

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

        console.log('--- RIVUS CALCULATION ---');
        console.log({
            meetingRatio,
            meetY,
            aStart,
            anchorStart,
            box2Start,
            anchorGap,
            anchorHeight,
            numerator,
            denominator,
            calculatedSpeed: 1 - numerator / denominator,
            finalSpeed: gesichtenAParallaxSpeed
        });
    }

    // positionGesichtenAnchor() entfällt — Anchor wird in positionAnchors() via transform positioniert.

    // =============== GESICHTEN A (filled/outline) PARALLAX-BERECHNUNG ===============
    let rivusAParallaxSpeed = BASE_PARALLAX_SPEED;

    function calculateRivusAParallaxSpeed() {
        const rivusFilled = document.getElementById('rivus-anchor-filled');
        const rivusContentBox = document.getElementById('rivus-content-box');
        const rivusAnchor = document.getElementById('rivus-anchor-gray');

        if (!rivusFilled || !rivusContentBox || !rivusAnchor) return;

        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        const aStart = getDocumentTop(rivusFilled);

        const box3Start = getBox3LogicalTop();
        const anchorHeight = rivusAnchor.offsetHeight;
        const anchorGap = getGesichtenAnchorGap(); // We can reuse this
        const anchorStart = box3Start - anchorGap - anchorHeight;

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

    // =============== CONTENT BOX POSITIONIERUNG ===============
    // Box wird relativ zu Alex positioniert (fixer Abstand)

    // Dynamischer Abstand Alex-Unterkante zu Box-Oberkante
    const BOX_ALEX_GAP_NARROW = 150; // Kleinerer Abstand für schmale Fenster
    const BOX_ALEX_GAP_WIDE = 290;   // Originalwert für breite Fenster

    // Portrait-Modus: zusätzlicher Abstand Alex→KONZEPT-Box (siehe Portrait-Kommentarblock bei getMeetingRatio())
    const PORTRAIT_BOX_OFFSET = 70;

    function getBoxAlexGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        let gap = BOX_ALEX_GAP_NARROW + widthFactor * (BOX_ALEX_GAP_WIDE - BOX_ALEX_GAP_NARROW);
        // Portrait-Modus: KONZEPT-Block weiter von Alex entfernt (aspectRatio > 1.2)
        if (window.innerHeight / window.innerWidth > 1.2) {
            gap += PORTRAIT_BOX_OFFSET;
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
        return BOX_GAP_NARROW + widthFactor * (BOX_GAP_WIDE - BOX_GAP_NARROW);
    }

    function positionGesichtenAndBox2() {
        const box1 = document.querySelector('.content-box');
        const alexImage = document.querySelector('.main-heading-image');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');

        if (!box1 || !alexImage || !gesichtenContainer) return;

        // WICHTIG: Zuerst marginTop zurücksetzen, um die natürliche Position zu messen
        gesichtenContainer.style.marginTop = '0px';

        // Dynamischer Mindestabstand (- 150px: alle Blöcke ab Block 2 höher)
        let minGap = getBoxGap() - 165;
        // Portrait-Modus: RIVUS-Anchor + Textbox 230px tiefer (80 + 150)
        if (window.innerHeight / window.innerWidth > 1.2) {
            minGap += 230;
        }

        // Box 1 als Referenz (RIVUS ist jetzt direkt nach Box 1)
        const alexBaseTop = getDocumentTop(alexImage);
        const alexHeight = alexImage.offsetHeight;
        const box1LogicalTop = alexBaseTop + alexHeight + getBoxAlexGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;

        const gesichtenBaseTop = getDocumentTop(gesichtenContainer);

        const naturalGap = gesichtenBaseTop - box1LogicalBottom;
        const offset = minGap - naturalGap;
        gesichtenContainer.style.marginTop = `${offset}px`;
    }

    function positionRivusAndBox3() {
        const mythusBox = document.getElementById('mythus-box');
        const rivusContainer = document.getElementById('rivus-anchor-container');

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
        const offset = minGap - naturalGap - 20;
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
        const contentBox2 = document.querySelector('.content-box-2');

        if (!benContainer || !contentBox2) return;

        // Treffpunkt: Ben soll bei diesem Viewport-Anteil erscheinen
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        // Ben's Startposition
        const benStart = getDocumentTop(benContainer);

        // Box2's Startposition (Ben soll unter Box2 erscheinen)
        const box2Start = getDocumentTop(contentBox2);
        const box2Height = contentBox2.offsetHeight;
        const targetBenPos = box2Start + box2Height + UNTERPUNKT_BOX_GAP;

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
        const rivusContainer = document.getElementById('rivus-anchor-container');
        const rivusBoxWrapper = document.getElementById('rivus-content-box-wrapper');

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
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const box2Wrapper = document.querySelector('.content-box-wrapper-2');

        if (!box1 || !alexImage || !gesichtenContainer || !box2Wrapper) return 0;

        // Box 1 als Referenz (RIVUS folgt direkt nach Box 1)
        const alexBaseTop = getDocumentTop(alexImage);
        const alexHeight = alexImage.offsetHeight;
        const box1LogicalTop = alexBaseTop + alexHeight + getBoxAlexGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;

        // RIVUS-Container startet nach dem dynamischen Gap (- 150px: alle Blöcke ab Block 2 höher)
        const minGap = getBoxGap() - 165;
        const gesichtenLogicalTop = box1LogicalBottom + minGap;

        // Box 2 ist innerhalb von gesichtenContainer
        // Ihre relative Position zu gesichtenContainer bleibt konstant
        const box2RelativeTop = getDocumentTop(box2Wrapper) - getDocumentTop(gesichtenContainer);

        return gesichtenLogicalTop + box2RelativeTop;
    }

    function positionBen() {
        const benContainer = document.getElementById('ben-image-with-info');
        const benImage = benContainer ? benContainer.querySelector('.unterpunkt-heading-image') : null;
        const contentBox2 = document.querySelector('.content-box-2');
        const unterpunktContainer = document.getElementById('ben-container');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');

        if (!benContainer || !benImage || !contentBox2 || !unterpunktContainer || !gesichtenContainer || !gesichtenAnchor) return;

        // WICHTIG: Zuerst top zurücksetzen, um die natürliche Position zu messen
        benContainer.style.top = '0px';

        // Logische/natürliche Positionen der Elemente ermitteln
        const box2LogicalTop = getBox2LogicalTop();
        const box2Height = contentBox2.offsetHeight;
        const benNaturalTop = getDocumentTop(benContainer);

        // Bei schmalen Bildschirmen (Mobile): Stelle die ursprüngliche, komplexere Logik wieder her.
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const box2LogicalBottom = box2LogicalTop + box2Height;

            // Logische Position über Box 1-Kette berechnen (RIVUS folgt direkt nach Box 1)
            const box1 = document.querySelector('.content-box');
            const alexImage = document.querySelector('.main-heading-image');
            if (!box1 || !alexImage) return;
            const alexBaseTop = getDocumentTop(alexImage);
            const alexHeight = alexImage.offsetHeight;
            const box1LogicalBottom = alexBaseTop + alexHeight + getBoxAlexGap() + box1.offsetHeight;
            const minGap = getBoxGap() - 165;
            const gesichtenLogicalTop = box1LogicalBottom + minGap;
            const benContainerRelativeTop = getDocumentTop(unterpunktContainer) - getDocumentTop(gesichtenContainer);
            const benContainerLogicalTop = gesichtenLogicalTop + benContainerRelativeTop;

            // Ben soll UNTERPUNKT_BOX_GAP unter Box2-Unterkante liegen
            const targetBenTop = box2LogicalBottom + UNTERPUNKT_BOX_GAP;
            const offset = targetBenTop - benContainerLogicalTop;
            benContainer.style.top = `${offset}px`;
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

        // 2. Treffpunkt 'meetY' berechnen (wo die anvisierten Texte sich treffen sollen)
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        // 3. Den Scroll-Punkt 'S_meet' berechnen, an dem der Anchor den Treffpunkt erreicht
        const S_meet_numerator = naturalTop_Box - anchorGap - anchorHeight - meetY;
        const S_meet_denominator = (1 - speed_Box);
        if (Math.abs(S_meet_denominator) < 0.001) return; // Division durch Null vermeiden
        const S_meet = S_meet_numerator / S_meet_denominator;

        // 4. Den finalen Offset für Ben berechnen, um die Zentrierung bei 'S_meet' zu erreichen
        const alignmentOffset = (naturalTop_Box - naturalTop_Ben) + (boxHeight - benImageHeight) / 2;
        const parallaxCorrection = S_meet * (speed_Box - speed_Ben);
        let finalOffset = alignmentOffset + parallaxCorrection;
        // Portrait-Modus: Ben 90px tiefer
        if (window.innerHeight / window.innerWidth > 1.2) {
            finalOffset += 90;
        }

        benContainer.style.top = `${finalOffset}px`;
    }

    let michaelMobileParallaxSpeed = BASE_UNTERPUNKT_SPEED;

    function calculateMichaelMobileParallaxSpeed() {
        if (window.innerWidth >= 600) return;

        const michaelContainer = document.getElementById('michael-image-with-info');
        const rivusContentBox = document.getElementById('rivus-content-box');

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
        const rivusContentBox = document.getElementById('rivus-content-box');
        const unterpunktContainerForMichael = michaelContainer.closest('.unterpunkt-heading-container'); 
        const rivusContainer = document.getElementById('rivus-anchor-container');
        const rivusAnchor = document.getElementById('rivus-anchor-gray');

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

        if (window.innerWidth < 600) {
            // Mobile logic for Michael
            const box3LogicalBottom = box3LogicalTop + box3Height;
            const michaelContainerLogicalTop = getDocumentTop(unterpunktContainerForMichael);
            const targetMichaelTop = box3LogicalBottom + UNTERPUNKT_BOX_GAP;
            const offset = targetMichaelTop - michaelContainerLogicalTop;
            michaelContainer.style.top = `${offset}px`;
            if (marcusContainer) {
                marcusContainer.style.top = `${offset}px`;
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

        const alignmentOffset = (naturalTop_Box - naturalTop_Michael) + (boxHeight - michaelHeight) / 2;
        const parallaxCorrection = S_meet * (speed_Box - speed_Michael);
        let finalOffset = alignmentOffset + parallaxCorrection;
        // Portrait-Modus: Michael + Marcus 150px tiefer
        if (window.innerHeight / window.innerWidth > 1.2) {
            finalOffset += 150;
        }

        const finalTop = `${finalOffset + 200}px`;
        michaelContainer.style.top = finalTop;
        if (marcusContainer) {
            marcusContainer.style.top = finalTop;
        }
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
        const anchors = [_konzeptAnchor, _gesichtenAnchor, _mythusAnchor, _rivusAnchorGray];
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

        // RIVUS Anchor
        if (_gesichtenAnchor && _gesichtenFilled && _contentBoxWrapper2) {
            _rivusAnchorHeight2 = _gesichtenAnchor.offsetHeight;
            _rivusAnchorGap2 = getGesichtenAnchorGap();
            _box2WrapperDocTop = getDocumentTop(_contentBoxWrapper2);
            _rivusAnchorLeft = _gesichtenFilled.getBoundingClientRect().left;
        }

        // MYTHUS Anchor
        if (_mythusAnchor && _mythusFilled && _mythusBoxWrapper) {
            _mythusAnchorHeight2 = _mythusAnchor.offsetHeight;
            _mythusAnchorGap2 = getKonzeptAnchorGap();
            _mythusWrapperDocTop = getDocumentTop(_mythusBoxWrapper);
            _mythusAnchorLeft = _mythusFilled.getBoundingClientRect().left;
        }

        // GESICHTEN Anchor
        if (_rivusAnchorGray && _rivusAnchorFilled && _rivusContentBoxWrapper) {
            _gesichtenAnchorHeight2 = _rivusAnchorGray.offsetHeight;
            _gesichtenAnchorGap2 = getGesichtenAnchorGap();
            _gesichtenWrapperDocTop = getDocumentTop(_rivusContentBoxWrapper);
            _gesichtenAnchorLeft = _rivusAnchorFilled.getBoundingClientRect().left;
        }

        _anchorsReady = true;

        // Sofort erste korrekte Position setzen
        applyParallaxEffect(window.scrollY);
    }

    // Initial positionieren nach Laden aller Bilder
    // Reihenfolge: Box 1 → RIVUS (Block 2) → Ben → MYTHUS (Block 3) → Daniel → GESICHTEN (Block 4) → Michael/Marcus
    window.addEventListener('load', () => {
        calculateKonzeptAParallaxSpeed();
        positionGesichtenAndBox2();
        calculateGesichtenAParallaxSpeed();
        positionBen();
        calculateBenMobileParallaxSpeed();
        positionMythusBlock();
        calculateMythusAParallaxSpeed();
        positionMythusDaniel();
        positionRivusAndBox3();
        calculateRivusAParallaxSpeed();
        positionMichaelAndMarcus();
        calculateMichaelMobileParallaxSpeed();
        positionAnchors();
    });

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

    // =============== DOM ELEMENT CACHE (Performance) ===============
    // Alle häufig genutzten Elemente einmal cachen statt pro Frame zu suchen
    const _alexImage = document.querySelector('.main-heading-image');
    const _contentBoxWrapper = document.querySelector('.content-box-wrapper');
    const _contentBoxWrapper2 = document.querySelector('.content-box-wrapper-2');
    const _mythusBoxWrapper = document.getElementById('mythus-box-wrapper');
    const _rivusContentBoxWrapper = document.getElementById('rivus-content-box-wrapper');
    const _contentBox = document.querySelector('.content-box');
    const _contentBox2 = document.querySelector('.content-box-2');
    const _mythusBox = document.getElementById('mythus-box');
    const _rivusContentBox = document.getElementById('rivus-content-box');
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
    const _gesichtenFilled = document.querySelector('.gesichten-anchor-filled');
    const _gesichtenOutline = document.querySelector('.gesichten-anchor-outline');
    const _gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');
    const _rivusAnchorFilled = document.getElementById('rivus-anchor-filled');
    const _rivusAnchorOutline = document.querySelector('#rivus-anchor-container .gesichten-anchor-outline');
    const _rivusAnchorGray = document.getElementById('rivus-anchor-gray');
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
    const _heroSection = document.querySelector('.hero-section');
    const _visHeadings = [
        document.querySelector('.main-heading-filled'),
        _konzeptFilled,
        document.querySelector('.unterpunkt-heading-filled'),
        _gesichtenFilled,
        _rivusAnchorFilled,
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
    });

    function updateScene() {
        // Phase 1: Alle Transforms schreiben (WRITE, kein Layout-Reflow)
        applyParallaxEffect(latestScroll);

        // Phase 2: Alle Layout-Reads gebatcht (ein einziger Reflow)
        const fadeThreshold = window.innerHeight * 0.07;
        const visRects = [];
        for (let i = 0; i < _visHeadings.length; i++) {
            visRects.push(_visHeadings[i] ? _visHeadings[i].getBoundingClientRect().top : Infinity);
        }

        // Phase 3: Alle Layout-Writes (kein Read mehr → kein Reflow)

        // Heading-Sichtbarkeit
        for (let i = 0; i < _visHeadings.length; i++) {
            if (_visHeadings[i]) {
                if (visRects[i] < fadeThreshold) {
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
            document.querySelector('.gesichten-anchor-filled'),
            document.getElementById('rivus-anchor-filled'),
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

    // Parallax effect (optimiert: gecachte DOM-Referenzen)
    function applyParallaxEffect(scrollY) {
        const textSpeed = scrollY * 0.25;
        const imageSpeed = scrollY * 0.5;
        const isMobile = window.innerWidth < 600;

        // Main heading image
        if (_mainImageContainer) {
            _mainImageContainer.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }

        // Ben bei RIVUS
        if (_benImage) {
            const speed = isMobile ? benMobileParallaxSpeed : BASE_UNTERPUNKT_SPEED;
            const xOffset = isMobile ? '-50%' : '0';
            _benImage.style.transform = `translate3d(${xOffset}, ${scrollY * speed}px, 0)`;
        }

        // MYTHUS Daniel
        if (_mythusDaniel) {
            const xOffset = isMobile ? '-50%' : '0';
            _mythusDaniel.style.transform = `translate3d(${xOffset}, ${scrollY * BASE_UNTERPUNKT_SPEED}px, 0)`;
        }

        // Michael
        if (_michaelImage) {
            const speed = isMobile ? michaelMobileParallaxSpeed : BASE_UNTERPUNKT_SPEED;
            _michaelImage.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
        }

        // Marcus
        if (_marcusImage) {
            const speed = isMobile ? michaelMobileParallaxSpeed : BASE_UNTERPUNKT_SPEED;
            _marcusImage.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
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
                _konzeptAnchor.style.transform = `translate3d(${_konzeptAnchorLeft}px, ${anchorTop}px, 0)`;
            }

            // RIVUS Anchor – folgt Box 2 Wrapper (position:relative + parallax)
            if (_gesichtenAnchor) {
                const wrapperVisualTop = _box2WrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const anchorTop = wrapperVisualTop - _rivusAnchorHeight2 - _rivusAnchorGap2 + 15;
                _gesichtenAnchor.style.transform = `translate3d(${_rivusAnchorLeft}px, ${anchorTop}px, 0)`;
            }

            // MYTHUS Anchor – folgt MYTHUS Box Wrapper
            if (_mythusAnchor) {
                const wrapperVisualTop = _mythusWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const anchorTop = wrapperVisualTop - _mythusAnchorHeight2 - _mythusAnchorGap2;
                _mythusAnchor.style.transform = `translate3d(${_mythusAnchorLeft}px, ${anchorTop}px, 0)`;
            }

            // GESICHTEN Anchor – folgt GESICHTEN Box Wrapper
            if (_rivusAnchorGray) {
                const wrapperVisualTop = _gesichtenWrapperDocTop - scrollY * (1 - BASE_PARALLAX_SPEED);
                const anchorTop = wrapperVisualTop - _gesichtenAnchorHeight2 - _gesichtenAnchorGap2 + 12;
                _rivusAnchorGray.style.transform = `translate3d(${_gesichtenAnchorLeft}px, ${anchorTop}px, 0)`;
            }
        }

        // MYTHUS box - vertikal auf Wrapper, horizontal auf Box
        if (_mythusBoxWrapper) {
            _mythusBoxWrapper.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }
        if (_mythusBox) {
            _mythusBox.style.transform = 'translate3d(20%, 0, 0)';
        }

        // KONZEPT filled & outline
        if (_konzeptFilled) {
            _konzeptFilled.style.transform = `translate3d(0, ${scrollY * konzeptAParallaxSpeed}px, 0)`;
        }
        if (_konzeptOutline) {
            _konzeptOutline.style.transform = `translate3d(0, ${scrollY * konzeptAParallaxSpeed}px, 0)`;
        }

        // MYTHUS filled & outline
        if (_mythusFilled) {
            _mythusFilled.style.transform = `translate3d(0, ${scrollY * mythusAParallaxSpeed}px, 0)`;
        }
        if (_mythusOutline) {
            _mythusOutline.style.transform = `translate3d(0, ${scrollY * mythusAParallaxSpeed}px, 0)`;
        }

        // Content box 2 (links) - vertikal auf Wrapper, horizontal auf Box
        if (_contentBoxWrapper2) {
            _contentBoxWrapper2.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }
        if (_contentBox2) {
            const rightOffset = getGesichtenRightOffset();
            const totalXOffset = -window.innerWidth * 0.2 + rightOffset + 45;
            _contentBox2.style.transform = `translate3d(${totalXOffset}px, 0, 0)`;
        }

        // RIVUS content box - vertikal auf Wrapper, horizontal auf Box
        if (_rivusContentBoxWrapper) {
            _rivusContentBoxWrapper.style.transform = `translate3d(0, ${scrollY * BASE_PARALLAX_SPEED}px, 0)`;
        }
        if (_rivusContentBox) {
            const totalXOffset = window.innerWidth * 0.2;
            _rivusContentBox.style.transform = `translate3d(${totalXOffset}px, 0, 0)`;
        }

        // RIVUS filled & outline
        if (_gesichtenFilled) {
            _gesichtenFilled.style.transform = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed}px, 0)`;
        }
        if (_gesichtenOutline) {
            _gesichtenOutline.style.transform = `translate3d(0, ${scrollY * gesichtenAParallaxSpeed}px, 0)`;
        }

        // GESICHTEN filled & outline
        if (_rivusAnchorFilled) {
            _rivusAnchorFilled.style.transform = `translate3d(0, ${scrollY * rivusAParallaxSpeed}px, 0)`;
        }
        if (_rivusAnchorOutline) {
            _rivusAnchorOutline.style.transform = `translate3d(0, ${scrollY * rivusAParallaxSpeed}px, 0)`;
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
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            _anchorsReady = false; // Zurücksetzen damit updateScene den Fallback nutzt
            updateScene();
            calculateKonzeptAParallaxSpeed();
            positionGesichtenAndBox2();
            calculateGesichtenAParallaxSpeed();
            positionBen();
            calculateBenMobileParallaxSpeed();
            positionMythusBlock();
            calculateMythusAParallaxSpeed();
            positionMythusDaniel();
            positionRivusAndBox3();
            calculateRivusAParallaxSpeed();
            positionMichaelAndMarcus();
            calculateMichaelMobileParallaxSpeed();
            positionAnchors();
        }, 250);
    });

    // =============== THEME TOGGLE ===============
    const themeSwitch = document.querySelector('.theme-switch__checkbox');
    if (themeSwitch) {
        // Function to set the theme
        const setTheme = (isDark) => {
            const themeColorMeta = document.querySelector("meta[name='theme-color']");
            if (isDark) {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('dark-mode');
                if (themeColorMeta) themeColorMeta.setAttribute('content', '#1a1a1a');
                themeSwitch.checked = true;
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.classList.remove('dark-mode');
                if (themeColorMeta) themeColorMeta.setAttribute('content', '#E9E9E4');
                themeSwitch.checked = false;
            }
        };

        // Check for saved theme in localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme === 'dark');
        } else {
            // If no theme is saved, check the user's OS preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark);
        }

        // Add event listener for the toggle
        themeSwitch.addEventListener('change', () => {
            const isDark = themeSwitch.checked;
            setTheme(isDark);
            // Save the theme preference to localStorage
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });

        // Also listen for changes in OS preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only change if no theme has been manually set by the user
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches);
            }
        });
    }
});
