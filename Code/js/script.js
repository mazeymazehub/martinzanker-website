document.addEventListener('DOMContentLoaded', function() {
    // =============== DYNAMISCHE PARALLAX-GESCHWINDIGKEIT ===============
    // Geschwindigkeit passt sich an Viewport-Größe an

    const DESKTOP_WIDTH = 1400; // Referenz-Breite für Desktop
    const BASE_PARALLAX_SPEED = 0.35; // Feste Geschwindigkeit für Boxen, Anchors, Bilder
    const BASE_DANIEL_SPEED = 0.50; // Feste Geschwindigkeit für Daniel

    // Nur für GESICHTEN filled/outline - dynamische Geschwindigkeit
    let parallaxSpeed = BASE_PARALLAX_SPEED;

    function updateParallaxSpeeds() {
        // Faktor basierend auf Viewport-Breite (0.6 bis 1.0)
        const viewportFactor = Math.max(0.6, Math.min(window.innerWidth / DESKTOP_WIDTH, 1));
        parallaxSpeed = BASE_PARALLAX_SPEED * viewportFactor;
    }

    // Initial berechnen
    updateParallaxSpeeds();

    // Bei Resize neu berechnen
    window.addEventListener('resize', updateParallaxSpeeds);

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

    function calculateKonzeptAParallaxSpeed() {
        const konzeptFilled = document.querySelector('.konzept-heading-filled');
        const benImage = document.querySelector('.main-heading-image');
        const konzeptAnchor = document.querySelector('.konzept-heading-anchor');

        if (!konzeptFilled || !benImage || !konzeptAnchor) return;

        // Treffpunkt dynamisch basierend auf Viewport-Breite
        const widthFactor = Math.max(0, Math.min(1, (window.innerWidth - NARROW_WIDTH) / (WIDE_WIDTH - NARROW_WIDTH)));
        const meetingRatio = MEETING_RATIO_NARROW + widthFactor * (MEETING_RATIO_WIDE - MEETING_RATIO_NARROW);
        const meetY = window.innerHeight * meetingRatio;

        // A's Startposition: Dokumentposition ohne Transforms
        const aStart = getDocumentTop(konzeptFilled);

        // Anchor's Startposition berechnen aus der Beziehung zu Ben
        // Anchor = Ben.bottom + BOX_BEN_GAP - anchorGap - Anchor.height
        const benStart = getDocumentTop(benImage);
        const benHeight = benImage.offsetHeight;
        const anchorHeight = konzeptAnchor.offsetHeight;
        const anchorGap = getKonzeptAnchorGap();
        const anchorStart = benStart + benHeight + BOX_BEN_GAP - anchorGap - anchorHeight;

        // Anchor's effektive Geschwindigkeit (wie Ben/Box)
        const anchorEffectiveSpeed = BASE_PARALLAX_SPEED; // 0.35

        // Berechne erforderliche Geschwindigkeit für A
        // Formel: speedA = 1 - (aStart - meetY) * (1 - anchorSpeed) / (anchorStart - meetY)
        const numerator = (aStart - meetY) * (1 - anchorEffectiveSpeed);
        const denominator = anchorStart - meetY;

        console.log('=== KONZEPT A Parallax Berechnung ===');
        console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
        console.log('Meeting Ratio:', (meetingRatio * 100).toFixed(0) + '%', '→ meetY:', meetY.toFixed(0));
        console.log('A Start (Dokument):', aStart.toFixed(0));
        console.log('Anchor Start (berechnet):', anchorStart.toFixed(0));
        console.log('Distanz A->meetY:', (aStart - meetY).toFixed(0));
        console.log('Distanz Anchor->meetY:', (anchorStart - meetY).toFixed(0));

        if (Math.abs(denominator) < 10) {
            // Anchor startet sehr nah am Treffpunkt, verwende Default
            konzeptAParallaxSpeed = anchorEffectiveSpeed;
        } else {
            konzeptAParallaxSpeed = 1 - numerator / denominator;
        }

        // Begrenze auf erweiterten Bereich (-0.5 bis 1)
        // Negative Werte bedeuten: A scrollt schneller als normal (nötig wenn A unter Anchor startet)
        konzeptAParallaxSpeed = Math.max(-0.5, Math.min(1, konzeptAParallaxSpeed));

        console.log('Berechnete Speed für A:', konzeptAParallaxSpeed.toFixed(3));
        console.log('=====================================');
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

    // =============== CONTENT BOX POSITIONIERUNG ===============
    // Box wird relativ zu Ben positioniert (fixer Abstand)

    const BOX_BEN_GAP = 290; // Abstand Ben-Unterkante zu Box-Oberkante

    function positionContentBox() {
        const benImage = document.querySelector('.main-heading-image');
        const contentBoxWrapper = document.querySelector('.content-box-wrapper');

        if (!benImage || !contentBoxWrapper) return;

        // Aktuelle visuelle Position von Ben (inkl. Parallax-Transform)
        const benRect = benImage.getBoundingClientRect();

        // Zielposition: Box-Oberkante soll BOX_BEN_GAP unter Ben-Unterkante liegen
        const targetBoxTop = benRect.bottom + BOX_BEN_GAP;

        // Setze position: fixed für exakte Positionierung
        contentBoxWrapper.style.position = 'fixed';
        contentBoxWrapper.style.top = `${targetBoxTop}px`;
        contentBoxWrapper.style.left = '0';
        contentBoxWrapper.style.width = '100%';
        contentBoxWrapper.style.marginTop = '0'; // CSS margin-top entfernen
    }

    // =============== GESICHTEN & BOX 2 POSITIONIERUNG ===============
    // "Bus-Prinzip": GESICHTEN erscheint an idealer Position (68.5vh),
    // aber wird nach unten verschoben falls Box 1 im Weg ist

    function positionGesichtenAndBox2() {
        const box1 = document.querySelector('.content-box');
        const gesichtenContainer = document.querySelector('.gesichten-anchor-container');
        const box2Wrapper = document.querySelector('.content-box-wrapper-2');

        if (!box1 || !gesichtenContainer || !box2Wrapper) return;

        // Ideale Position für GESICHTEN-Container (68.5vh vom Seitenanfang)
        // Der Container hat bereits padding-top: 68.5vh
        // Wir berechnen, ob Box 1 zu weit runter reicht

        // Mindestabstand zwischen Box 1 und GESICHTEN-Container
        const minGap = window.innerHeight * 0.1; // 10vh Mindestabstand

        // Untere Kante von Box 1 (absolute Position auf der Seite)
        const box1Rect = box1.getBoundingClientRect();
        const box1Bottom = box1Rect.bottom + window.scrollY;

        // Wo GESICHTEN-Container idealerweise beginnen würde
        // (nach konzept-heading-container + content-box-wrapper)
        const gesichtenRect = gesichtenContainer.getBoundingClientRect();
        const gesichtenTop = gesichtenRect.top + window.scrollY;

        // Berechne den aktuellen Abstand
        const currentGap = gesichtenTop - box1Bottom;

        // Wenn der Abstand zu klein ist, verschiebe GESICHTEN nach unten
        if (currentGap < minGap) {
            const offset = minGap - currentGap;
            gesichtenContainer.style.marginTop = `${offset}px`;
        } else {
            gesichtenContainer.style.marginTop = '0px';
        }
    }

    // =============== DANIEL POSITIONIERUNG ===============
    // Daniel wird vertikal zur Mitte der zweiten grauen Box positioniert

    function positionDaniel() {
        const danielContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        const danielImage = document.querySelector('.unterpunkt-heading-image');
        const contentBoxLeft = document.querySelector('.content-box-2');
        const unterpunktContainer = document.querySelector('.unterpunkt-heading-container');

        if (!danielContainer || !danielImage || !contentBoxLeft || !unterpunktContainer) return;

        // Bei schmalen Bildschirmen keine absolute Positionierung
        if (window.innerWidth < 900) {
            danielContainer.style.top = 'auto';
            return;
        }

        const boxRect = contentBoxLeft.getBoundingClientRect();
        const boxTop = boxRect.top + window.scrollY;
        const boxHeight = boxRect.height;
        const textCenterY = boxTop + (boxHeight / 2);

        const containerRect = unterpunktContainer.getBoundingClientRect();
        const containerTop = containerRect.top + window.scrollY;

        const danielHeight = danielImage.offsetHeight;
        const vhInPx = window.innerHeight * 1.77; // 177vh (2vh höher)
        const danielTopAbsolute = textCenterY - (danielHeight / 2) - vhInPx;
        const danielTopRelative = danielTopAbsolute - containerTop;
        danielContainer.style.top = `${danielTopRelative}px`;
    }

    // Initial positionieren nach Laden aller Bilder
    window.addEventListener('load', () => {
        positionContentBox();
        positionKonzeptAnchor();
        calculateKonzeptAParallaxSpeed(); // Geschwindigkeit berechnen
        positionGesichtenAndBox2();
        positionDaniel();
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
        positionKonzeptAnchor(); // Anchor-Position basierend auf Box aktualisieren
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

        // Unterpunkt heading image (Daniel) - FESTE Geschwindigkeit
        const unterpunktHeadingImageContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        if (unterpunktHeadingImageContainer) {
            const danielImageSpeedCalc = scrollY * BASE_DANIEL_SPEED;
            unterpunktHeadingImageContainer.style.transform = `translate3d(0, ${danielImageSpeedCalc}px, 0)`;
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

        // Second content box (left) - FESTE Geschwindigkeit (scrollt mit GESICHTEN anchor)
        const contentBoxLeft = document.querySelector('.content-box-2');
        if (contentBoxLeft) {
            const contentBoxLeftSpeed = scrollY * BASE_PARALLAX_SPEED;
            contentBoxLeft.style.transform = `translate3d(-20vw, ${contentBoxLeftSpeed}px, 0)`;
        }

        // GESICHTEN anchor (gray) - FESTE Geschwindigkeit (scrollt mit Box)
        const gesichtenAnchorGray = document.querySelector('.gesichten-anchor-gray');
        if (gesichtenAnchorGray) {
            const gesichtenAnchorSpeed = scrollY * BASE_PARALLAX_SPEED;
            gesichtenAnchorGray.style.transform = `translate3d(0, ${gesichtenAnchorSpeed}px, 0)`;
        }

        // GESICHTEN filled & outline - NUR DIESE mit DYNAMISCHER Geschwindigkeit
        const gesichtenFilled = document.querySelector('.gesichten-anchor-filled');
        const gesichtenOutline = document.querySelector('.gesichten-anchor-outline');
        if (gesichtenFilled) {
            const gesichtenFilledSpeed = scrollY * parallaxSpeed;
            gesichtenFilled.style.transform = `translate3d(0, ${gesichtenFilledSpeed}px, 0)`;
        }
        if (gesichtenOutline) {
            const gesichtenOutlineSpeed = scrollY * parallaxSpeed;
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
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            updateScene();
            positionContentBox();
            positionKonzeptAnchor();
            calculateKonzeptAParallaxSpeed(); // Geschwindigkeit bei Resize neu berechnen
            positionGesichtenAndBox2();
            positionDaniel();
        }, 250);
    });

    // =============== THEME TOGGLE ===============
    const themeSwitch = document.querySelector('.theme-switch__checkbox');
    if (themeSwitch) {
        // Function to set the theme
        const setTheme = (isDark) => {
            if (isDark) {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('dark-mode');
                themeSwitch.checked = true;
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.classList.remove('dark-mode');
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
