document.addEventListener('DOMContentLoaded', function() {
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

        // Main heading image - slow parallax (higher value = slower scroll relative to page)
        // Transform the container so both image and info scroll together
        const mainHeadingImageContainer = document.querySelector('.main-heading-container .image-with-info');
        if (mainHeadingImageContainer) {
            const mainImageSpeed = scrollY * 0.35; // Slower scroll - image stays visible longer
            mainHeadingImageContainer.style.transform = `translate3d(0, ${mainImageSpeed}px, 0)`;
        }

        // Unterpunkt heading image (Daniel) - medium scroll (faster than boxes, slower than text)
        // Transform the container so both image and info scroll together
        const unterpunktHeadingImageContainer = document.querySelector('.unterpunkt-heading-container .image-with-info');
        if (unterpunktHeadingImageContainer) {
            // Faster than boxes (0.35), slower than text (1.0) - use 0.50
            const danielImageSpeed = scrollY * 0.50;
            unterpunktHeadingImageContainer.style.transform = `translate3d(0, ${danielImageSpeed}px, 0)`;
        }

        // Content box - same parallax speed as main heading image
        const contentBox = document.querySelector('.content-box');
        if (contentBox) {
            const contentBoxSpeed = scrollY * 0.35; // Same speed as Ben image
            contentBox.style.transform = `translate3d(20%, ${contentBoxSpeed}px, 0)`;
        }

        // KONZEPT anchor - scrolls with box speed
        const konzeptAnchor = document.querySelector('.konzept-heading-anchor');
        if (konzeptAnchor) {
            const anchorSpeed = scrollY * 0.35; // Same speed as box
            konzeptAnchor.style.transform = `translate3d(0, ${anchorSpeed}px, 0)`;
        }

        // Content box grain removed - it's a child of content-box, so it moves with the parent automatically

        // Second content box (left) - same parallax speed
        const contentBoxLeft = document.querySelector('.content-box-2');
        if (contentBoxLeft) {
            const contentBoxLeftSpeed = scrollY * 0.35;
            contentBoxLeft.style.transform = `translate3d(-20vw, ${contentBoxLeftSpeed}px, 0)`;
        }

        // GESICHTEN anchor (gray) - scrolls with box speed
        const gesichtenAnchorGray = document.querySelector('.gesichten-anchor-gray');
        if (gesichtenAnchorGray) {
            const anchorSpeed = scrollY * 0.35; // Same speed as box
            gesichtenAnchorGray.style.transform = `translate3d(0, ${anchorSpeed}px, 0)`;
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
