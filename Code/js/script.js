document.addEventListener('DOMContentLoaded', function() {
    // =============== BASIS-KONSTANTEN ===============
    const BASE_PARALLAX_SPEED = 0.35; // Feste Geschwindigkeit für Boxen, Anchors, Bilder
    const BASE_DANIEL_SPEED = 0.50; // Feste Geschwindigkeit für Daniel

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

    // Hilfsfunktion: Dynamischen Treffpunkt-Ratio berechnen
    function getMeetingRatio() {
        const aspectRatio = window.innerHeight / window.innerWidth;
        // Für hohe/schmale Bildschirme (z.B. iPad Portrait) einen tieferen Treffpunkt wählen
        if (aspectRatio > 1.2) { 
            return 0.25; // Fester, tieferer Wert
        }
        // Originale Logik für breitere Bildschirme (Landscape)
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return MEETING_RATIO_NARROW + widthFactor * (MEETING_RATIO_WIDE - MEETING_RATIO_NARROW);
    }

    function calculateKonzeptAParallaxSpeed() {
        const konzeptFilled = document.querySelector('.konzept-heading-filled');
        const benImage = document.querySelector('.main-heading-image');
        const konzeptAnchor = document.querySelector('.konzept-heading-anchor');

        if (!konzeptFilled || !benImage || !konzeptAnchor) return;

        // Treffpunkt dynamisch berechnen
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(konzeptFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Ben
        // Anchor = Ben.bottom + BOX_BEN_GAP - anchorGap - Anchor.height
        const benStart = getDocumentTop(benImage);
        const benHeight = benImage.offsetHeight;
        const anchorHeight = konzeptAnchor.offsetHeight;
        const anchorGap = getKonzeptAnchorGap();
        const anchorStart = benStart + benHeight + getBoxBenGap() - anchorGap - anchorHeight;

        // Anchor's effektive Geschwindigkeit (wie Ben/Box)
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

        // Begrenze auf erweiterten Bereich (-0.5 bis 1)
        // Negative Werte bedeuten: A scrollt schneller als normal (nötig wenn A unter Anchor startet)
        konzeptAParallaxSpeed = Math.max(-0.5, Math.min(1, konzeptAParallaxSpeed));

        console.log('--- KONZEPT CALCULATION ---');
        console.log({
            meetingRatio,
            meetY,
            aStart,
            anchorStart,
            benStart,
            benHeight,
            boxBenGap: getBoxBenGap(),
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

    function positionKonzeptAnchor() {
        const konzeptAnchor = document.querySelector('.konzept-heading-anchor');
        const contentBox = document.querySelector('.content-box');
        const konzeptFilled = document.querySelector('.konzept-heading-filled');

        if (!konzeptAnchor || !contentBox || !konzeptFilled) return;

        // Aktuelle visuelle Position der Box (inkl. aller Transforms)
        const boxRect = contentBox.getBoundingClientRect();
        // X-Position von KONZEPT (filled) übernehmen
        const filledRect = konzeptFilled.getBoundingClientRect();
        // Höhe des Anchors
        const anchorHeight = konzeptAnchor.offsetHeight;

        // Zielposition: Anchor-Unterkante soll dynamischen Gap über Box-Oberkante haben
        // Berechne absolute Viewport-Position für Anchor-Oberkante
        const anchorGap = getKonzeptAnchorGap();
        const targetAnchorTop = boxRect.top - anchorGap - anchorHeight;

        // Setze position: fixed für exakte Positionierung
        konzeptAnchor.style.position = 'fixed';
        konzeptAnchor.style.top = `${targetAnchorTop}px`;
        konzeptAnchor.style.left = `${filledRect.left}px`; // X-Position angleichen
        konzeptAnchor.style.transform = 'none';
    }

    // =============== GESICHTEN A (filled/outline) PARALLAX-BERECHNUNG ===============
    // Analog zu KONZEPT: A scrollt mit berechneter Geschwindigkeit, um Anchor bei MEETING_POINT zu treffen

    let gesichtenAParallaxSpeed = BASE_PARALLAX_SPEED; // Wird dynamisch berechnet

    // Abstand GESICHTEN-Anchor-Unterkante zu Box2-Oberkante (negativ = überlappt)
    const GESICHTEN_ANCHOR_GAP_NARROW = -30;  // Bei schmalem Fenster
    const GESICHTEN_ANCHOR_GAP_WIDE = -60;    // Bei breitem Fenster

    function getGesichtenAnchorGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return GESICHTEN_ANCHOR_GAP_NARROW + widthFactor * (GESICHTEN_ANCHOR_GAP_WIDE - GESICHTEN_ANCHOR_GAP_NARROW);
    }

    // Dynamischer Rechts-Offset für GESICHTEN und Box2 (35px bei ≤400px, 0px bei ≥1400px)
    function getGesichtenRightOffset() {
        return Math.max(0, 35 - (window.innerWidth - NARROW_WIDTH) * 0.035);
    }

    function calculateGesichtenAParallaxSpeed() {
        const gesichtenFilled = document.querySelector('.gesichten-anchor-filled');
        const contentBox2 = document.querySelector('.content-box-2');
        const gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');

        if (!gesichtenFilled || !contentBox2 || !gesichtenAnchor) return;

        // Treffpunkt dynamisch berechnen (gleich wie KONZEPT)
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

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

        // Begrenze auf erweiterten Bereich (-0.5 bis 1)
        gesichtenAParallaxSpeed = Math.max(-0.5, Math.min(1, gesichtenAParallaxSpeed));

        console.log('--- GESICHTEN CALCULATION ---');
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

    // =============== GESICHTEN ANCHOR POSITIONIERUNG ===============
    // Analog zu KONZEPT: Anchor wird relativ zu Box2 positioniert

    function positionGesichtenAnchor() {
        const gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');
        const contentBox2 = document.querySelector('.content-box-2');
        const gesichtenFilled = document.querySelector('.gesichten-anchor-filled');

        if (!gesichtenAnchor || !contentBox2 || !gesichtenFilled) return;

        // Aktuelle visuelle Position der Box2 (inkl. aller Transforms)
        const box2Rect = contentBox2.getBoundingClientRect();
        // X-Position von GESICHTEN (filled) übernehmen
        const filledRect = gesichtenFilled.getBoundingClientRect();
        // Höhe des Anchors
        const anchorHeight = gesichtenAnchor.offsetHeight;

        // Zielposition: Anchor-Unterkante soll dynamischen Gap über Box2-Oberkante haben
        const anchorGap = getGesichtenAnchorGap();
        const targetAnchorTop = box2Rect.top - anchorGap - anchorHeight;

        // Setze position: fixed für exakte Positionierung
        gesichtenAnchor.style.position = 'fixed';
        gesichtenAnchor.style.top = `${targetAnchorTop}px`;
        gesichtenAnchor.style.left = `${filledRect.left}px`; // X-Position angleichen
        gesichtenAnchor.style.transform = 'none';
    }

    // =============== CONTENT BOX POSITIONIERUNG ===============
    // Box wird relativ zu Ben positioniert (fixer Abstand)

    // Dynamischer Abstand Ben-Unterkante zu Box-Oberkante
    const BOX_BEN_GAP_NARROW = 150; // Kleinerer Abstand für schmale Fenster
    const BOX_BEN_GAP_WIDE = 290;   // Originalwert für breite Fenster

    function getBoxBenGap() {
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        return BOX_BEN_GAP_NARROW + widthFactor * (BOX_BEN_GAP_WIDE - BOX_BEN_GAP_NARROW);
    }

    function positionContentBox() {
        const benImage = document.querySelector('.main-heading-image');
        const contentBoxWrapper = document.querySelector('.content-box-wrapper');

        if (!benImage || !contentBoxWrapper) return;

        // Aktuelle visuelle Position von Ben (inkl. Parallax-Transform)
        const benRect = benImage.getBoundingClientRect();

        // Zielposition: Box-Oberkante soll BOX_BEN_GAP unter Ben-Unterkante liegen
        const targetBoxTop = benRect.bottom + getBoxBenGap();

        // Setze position: fixed für exakte Positionierung
        contentBoxWrapper.style.position = 'fixed';
        contentBoxWrapper.style.top = `${targetBoxTop}px`;
        contentBoxWrapper.style.left = '0';
        contentBoxWrapper.style.width = '100%';
        contentBoxWrapper.style.marginTop = '0'; // CSS margin-top entfernen
    }

    // =============== GESICHTEN & BOX 2 POSITIONIERUNG ===============
    // Dynamischer Abstand zwischen Box 1 und Box 2/GESICHTEN
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
        const benImage = document.querySelector('.main-heading-image');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const box2Wrapper = document.querySelector('.content-box-wrapper-2');

        if (!box1 || !benImage || !gesichtenContainer || !box2Wrapper) return;

        // WICHTIG: Zuerst marginTop zurücksetzen, um die natürliche Position zu messen
        gesichtenContainer.style.marginTop = '0px';

        // Dynamischer Mindestabstand basierend auf Viewport-Breite
        const minGap = getBoxGap();

        // Box 1 ist in einem position:fixed Container, daher funktioniert getDocumentTop() nicht.
        // Stattdessen: Berechne die "logische" Position von Box 1 basierend auf Ben
        // (So wie es positionContentBox() macht)
        const benBaseTop = getDocumentTop(benImage);
        const benHeight = benImage.offsetHeight;
        const box1LogicalTop = benBaseTop + benHeight + getBoxBenGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;

        const gesichtenBaseTop = getDocumentTop(gesichtenContainer);

        // Natürlicher Gap (ohne unser marginTop)
        const naturalGap = gesichtenBaseTop - box1LogicalBottom;

        // Berechne Offset um gewünschten Gap zu erreichen
        const offset = minGap - naturalGap;
        gesichtenContainer.style.marginTop = `${offset}px`;
    }

    // =============== DANIEL POSITIONIERUNG ===============
    // Bei breiten Fenstern: Daniel neben Box 2 (mittig vertikal)
    // Bei schmalen Fenstern: Daniel unter Box 2 mit Parallax-Erscheinen

    // Abstand Daniel-Oberkante zu Box2-Unterkante (bei schmalen Fenstern)
    const DANIEL_BOX2_GAP = -160; // Pixel unter Box 2 (negativ = überlappt)

    // Daniel-Parallax-Geschwindigkeit für schmale Fenster (wird berechnet)
    let danielMobileParallaxSpeed = BASE_DANIEL_SPEED;

    function calculateDanielMobileParallaxSpeed() {
        if (window.innerWidth >= 600) return; // Nur für schmale Fenster

        const danielContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        const contentBox2 = document.querySelector('.content-box-2');

        if (!danielContainer || !contentBox2) return;

        // Treffpunkt: Daniel soll bei diesem Viewport-Anteil erscheinen
        const meetingRatio = getMeetingRatio();
        const meetY = window.innerHeight * meetingRatio;

        // Daniel's Startposition
        const danielStart = getDocumentTop(danielContainer);

        // Box2's Startposition (Daniel soll unter Box2 erscheinen)
        const box2Start = getDocumentTop(contentBox2);
        const box2Height = contentBox2.offsetHeight;
        const targetDanielPos = box2Start + box2Height + DANIEL_BOX2_GAP;

        // Box2's effektive Geschwindigkeit
        const box2EffectiveSpeed = BASE_PARALLAX_SPEED;

        // Berechne Geschwindigkeit, damit Daniel bei meetY mit Box2-Unterkante zusammentrifft
        const numerator = (danielStart - meetY) * (1 - box2EffectiveSpeed);
        const denominator = targetDanielPos - meetY;

        if (Math.abs(denominator) < 10) {
            danielMobileParallaxSpeed = box2EffectiveSpeed;
        } else {
            danielMobileParallaxSpeed = 1 - numerator / denominator;
        }

        // Begrenze auf sinnvollen Bereich
        danielMobileParallaxSpeed = Math.max(-0.5, Math.min(1, danielMobileParallaxSpeed));

        console.log('=== DANIEL Mobile Parallax ===');
        console.log('Daniel Start:', danielStart.toFixed(0));
        console.log('Target (unter Box2):', targetDanielPos.toFixed(0));
        console.log('MeetY:', meetY.toFixed(0));
        console.log('Berechnete Speed:', danielMobileParallaxSpeed.toFixed(3));
        console.log('==============================');
    }

    // Hilfsfunktion: Berechne die logische Position von Box 2
    // (basierend auf Ben → Box 1 → GESICHTEN-Gap → Box 2)
    function getBox2LogicalTop() {
        const benImage = document.querySelector('.main-heading-image');
        const box1 = document.querySelector('.content-box');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const box2Wrapper = document.querySelector('.content-box-wrapper-2');

        if (!benImage || !box1 || !gesichtenContainer || !box2Wrapper) return 0;

        // Box 1's logische Position (wie in positionGesichtenAndBox2)
        const benBaseTop = getDocumentTop(benImage);
        const benHeight = benImage.offsetHeight;
        const box1LogicalTop = benBaseTop + benHeight + getBoxBenGap();
        const box1Height = box1.offsetHeight;
        const box1LogicalBottom = box1LogicalTop + box1Height;

        // GESICHTEN-Container startet nach dem dynamischen Gap
        const minGap = getBoxGap();
        const gesichtenLogicalTop = box1LogicalBottom + minGap;

        // Box 2 ist innerhalb von gesichtenContainer
        // Ihre relative Position zu gesichtenContainer bleibt konstant
        const box2RelativeTop = getDocumentTop(box2Wrapper) - getDocumentTop(gesichtenContainer);

        return gesichtenLogicalTop + box2RelativeTop;
    }

    function positionDaniel() {
        const danielContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        const danielImage = document.querySelector('.unterpunkt-heading-image');
        const contentBox2 = document.querySelector('.content-box-2');
        const unterpunktContainer = document.querySelector('.unterpunkt-heading-container');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const gesichtenAnchor = document.querySelector('.gesichten-anchor-gray');
    
        if (!danielContainer || !danielImage || !contentBox2 || !unterpunktContainer || !gesichtenContainer || !gesichtenAnchor) return;
    
        // WICHTIG: Zuerst top zurücksetzen, um die natürliche Position zu messen
        danielContainer.style.top = '0px';
    
        // Logische/natürliche Positionen der Elemente ermitteln
        const box2LogicalTop = getBox2LogicalTop();
        const box2Height = contentBox2.offsetHeight;
        const danielNaturalTop = getDocumentTop(danielContainer);
    
        // Bei schmalen Bildschirmen (Mobile): Stelle die ursprüngliche, komplexere Logik wieder her.
        if (window.innerWidth < BREAKPOINT_MOBILE) {
            const box2LogicalBottom = box2LogicalTop + box2Height;
    
            // Originale Logik für danielContainerLogicalTop wiederherstellen
            const benImage = document.querySelector('.main-heading-image');
            const box1 = document.querySelector('.content-box');
            if (!benImage || !box1) return;
            const benBaseTop = getDocumentTop(benImage);
            const benHeight = benImage.offsetHeight;
            const box1LogicalBottom = benBaseTop + benHeight + getBoxBenGap() + box1.offsetHeight;
            const minGap = getBoxGap();
            const gesichtenLogicalTop = box1LogicalBottom + minGap;
            const danielContainerRelativeTop = getDocumentTop(unterpunktContainer) - getDocumentTop(gesichtenContainer);
            const danielContainerLogicalTop = gesichtenLogicalTop + danielContainerRelativeTop;
    
            // Daniel soll DANIEL_BOX2_GAP unter Box2-Unterkante liegen
            const targetDanielTop = box2LogicalBottom + DANIEL_BOX2_GAP;
            const offset = targetDanielTop - danielContainerLogicalTop;
            danielContainer.style.top = `${offset}px`;
            return;
        }
    
        // Bei breiten Bildschirmen: NEUE, PRÄZISE REGEL (bleibt unverändert)
        // Leitet den nötigen Offset ab, damit die Bildmitte die Boxmitte an dem exakten Scrollpunkt trifft,
        // an dem die "GESICHTEN"-Texte sich überlagern.
    
        // 1. Parameter sammeln
        const naturalTop_Box = box2LogicalTop;
        const naturalTop_Daniel = danielNaturalTop;
        const boxHeight = contentBox2.offsetHeight;
        const danielHeight = danielImage.offsetHeight;
        const speed_Box = BASE_PARALLAX_SPEED;
        const speed_Daniel = BASE_DANIEL_SPEED;
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
    
        // 4. Den finalen Offset für Daniel berechnen, um die Zentrierung bei 'S_meet' zu erreichen
        const alignmentOffset = (naturalTop_Box - naturalTop_Daniel) + (boxHeight - danielHeight) / 2;
        const parallaxCorrection = S_meet * (speed_Box - speed_Daniel);
        const finalOffset = alignmentOffset + parallaxCorrection;
    
        danielContainer.style.top = `${finalOffset}px`;
    }    // Initial positionieren nach Laden aller Bilder
    window.addEventListener('load', () => {
        positionContentBox();
        positionKonzeptAnchor();
        calculateKonzeptAParallaxSpeed();
        positionGesichtenAndBox2();
        positionGesichtenAnchor();
        calculateGesichtenAParallaxSpeed();
        positionDaniel();
        calculateDanielMobileParallaxSpeed();
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
        updateTextVisibility();
        applyParallaxEffect(latestScroll);
        updateMainHeadingVisibility();
        positionContentBox(); // Box-Position basierend auf Ben aktualisieren
        positionKonzeptAnchor(); // KONZEPT-Anchor basierend auf Box aktualisieren
        positionGesichtenAnchor(); // GESICHTEN-Anchor basierend auf Box2 aktualisieren
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

        // Update logo video/gif size (or text if not present)
        const logos = header.querySelectorAll('.logo-gif');
        const logoText = header.querySelector('.logo-text');

        if (logos.length > 0) {
            logos.forEach(logo => {
                logo.style.height = `${newTextSize}px`;

                // Move logo 2px up when fully shrunk
                if (progress === 1) {
                    logo.style.transform = 'translate(-50%, calc(-50% - 2px))';
                } else {
                    logo.style.transform = 'translate(-50%, -50%)';
                }
            });
        } else if (logoText) {
            logoText.style.fontSize = `${newTextSize}px`;

            // Move text 2px up when fully shrunk
            if (progress === 1) {
                logoText.style.transform = 'translate(-50%, calc(-50% - 2px))';
            } else {
                logoText.style.transform = 'translate(-50%, -50%)';
            }
        }

        // Update hero section margin to match header size (nav height + header height)
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.style.marginTop = `${navHeight + newHeight}px`;
        }

        // Update header backdrop height to match
        const headerBackdrop = document.querySelector('.header-backdrop');
        if (headerBackdrop) {
            headerBackdrop.style.height = `${navHeight + newHeight}px`;
        }
    }

    // Main heading fade out animation
    function updateMainHeadingVisibility() {
        const headings = [
            document.querySelector('.main-heading-filled'),
            document.querySelector('.konzept-heading-filled'),
            document.querySelector('.unterpunkt-heading-filled'),
            document.querySelector('.gesichten-anchor-filled')
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

    // Parallax effect
    function applyParallaxEffect(scrollY) {
        const textSpeed = scrollY * 0.25;
        const imageSpeed = scrollY * 0.5;

        const allTextBehinds = document.querySelectorAll('.text-behind');
        const allTextFronts = document.querySelectorAll('.text-front');
        const allParallaxImages = document.querySelectorAll('.parallax-image');
        const allHoverImages = document.querySelectorAll('.hover-image');

        // Main heading image - FESTE Geschwindigkeit (wie vor Dynamisierung)
        const mainHeadingImageContainer = document.querySelector('.main-heading-container .image-with-info');
        if (mainHeadingImageContainer) {
            const mainImageSpeed = scrollY * BASE_PARALLAX_SPEED;
            mainHeadingImageContainer.style.transform = `translate3d(0, ${mainImageSpeed}px, 0)`;
        }

        // Unterpunkt heading image (Daniel)
        // Bei schmalen Fenstern: berechnete Geschwindigkeit für Parallax-Erscheinen
        // Bei breiten Fenstern: feste Geschwindigkeit
        const unterpunktHeadingImageContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        if (unterpunktHeadingImageContainer) {
            const danielSpeed = window.innerWidth < 600 ? danielMobileParallaxSpeed : BASE_DANIEL_SPEED;
            const danielImageSpeedCalc = scrollY * danielSpeed;
            // Bei Mobile: translateX(-50%) für Zentrierung beibehalten
            const xOffset = window.innerWidth < 600 ? '-50%' : '0';
            unterpunktHeadingImageContainer.style.transform = `translate3d(${xOffset}, ${danielImageSpeedCalc}px, 0)`;
        }

        // Content box wrapper - Position wird via positionContentBox() basierend auf Ben gesetzt
        // Kein Parallax-Transform hier, da position: fixed verwendet wird

        // Content box - nur horizontaler Offset
        const contentBox = document.querySelector('.content-box');
        if (contentBox) {
            contentBox.style.transform = `translate3d(20%, 0, 0)`;
        }

        // KONZEPT filled & outline (A) - mit BERECHNETER Geschwindigkeit
        const konzeptFilled = document.querySelector('.konzept-heading-filled');
        const konzeptOutline = document.querySelector('.konzept-heading-outline');
        if (konzeptFilled) {
            const konzeptFilledSpeed = scrollY * konzeptAParallaxSpeed;
            konzeptFilled.style.transform = `translate3d(0, ${konzeptFilledSpeed}px, 0)`;
        }
        if (konzeptOutline) {
            const konzeptOutlineSpeed = scrollY * konzeptAParallaxSpeed;
            konzeptOutline.style.transform = `translate3d(0, ${konzeptOutlineSpeed}px, 0)`;
        }

        // Second content box (left) - FESTE Geschwindigkeit (scrollt mit Box)
        // Dynamischer Rechts-Offset auf schmalen Bildschirmen (berechnet in Pixeln)
        const contentBoxLeft = document.querySelector('.content-box-2');
        if (contentBoxLeft) {
            const contentBoxLeftSpeed = scrollY * BASE_PARALLAX_SPEED;
            const rightOffset = getGesichtenRightOffset();
            const vwOffset = window.innerWidth * 0.2; // 20vw in Pixel
            const totalXOffset = -vwOffset + rightOffset + 45;
            contentBoxLeft.style.transform = `translate3d(${totalXOffset}px, ${contentBoxLeftSpeed}px, 0)`;
        }

        // GESICHTEN anchor (gray) - Position wird via positionGesichtenAnchor() gesetzt
        // Kein Parallax-Transform hier, da position: fixed verwendet wird

        // GESICHTEN filled & outline (A) - mit BERECHNETER Geschwindigkeit
        const gesichtenFilled = document.querySelector('.gesichten-anchor-filled');
        const gesichtenOutline = document.querySelector('.gesichten-anchor-outline');
        if (gesichtenFilled) {
            const gesichtenFilledSpeed = scrollY * gesichtenAParallaxSpeed;
            gesichtenFilled.style.transform = `translate3d(0, ${gesichtenFilledSpeed}px, 0)`;
        }
        if (gesichtenOutline) {
            const gesichtenOutlineSpeed = scrollY * gesichtenAParallaxSpeed;
            gesichtenOutline.style.transform = `translate3d(0, ${gesichtenOutlineSpeed}px, 0)`;
        }

        allTextBehinds.forEach(el => {
            el.style.transform = `translate3d(0, ${textSpeed}px, 0)`;
        });

        allTextFronts.forEach(el => {
            el.style.transform = `translate3d(0, ${textSpeed}px, 0)`;
        });

        // Apply parallax only to images in view for better performance
        allParallaxImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                img.style.transform = `translate3d(0, ${imageSpeed * 0.3}px, 0)`;
            }
        });

        allHoverImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                img.style.transform = `translate3d(0, ${imageSpeed * 0.3}px, 0)`;
            }
        });
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
            updateScene();
            positionContentBox();
            positionKonzeptAnchor();
            calculateKonzeptAParallaxSpeed();
            positionGesichtenAndBox2();
            positionGesichtenAnchor();
            calculateGesichtenAParallaxSpeed();
            positionDaniel();
            calculateDanielMobileParallaxSpeed();
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
