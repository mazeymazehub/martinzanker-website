document.addEventListener('DOMContentLoaded', function() {
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

    // Header & Logo Animation
    const header = document.querySelector('header');
    const logo = document.querySelector('.logo');
    let initialLogoHeight = 0;
    let minScale = 0.6;

    function calculateMinScale() {
        if (logo && logo.complete) {
            initialLogoHeight = logo.offsetHeight;
        }
    }

    if (logo) {
        if (logo.complete) {
            calculateMinScale();
        } else {
            logo.addEventListener('load', calculateMinScale);
        }
    }

    // Scroll handling
    let latestScroll = 0;
    let ticking = false;

    const fadeOutThreshold = window.innerHeight * 0.09;
    const fadeInThreshold = window.innerHeight * 0.30;

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
        updateLogoSize(latestScroll);
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

    // Logo size animation
    function updateLogoSize(scrollY) {
        if (!logo || initialLogoHeight === 0) return;

        const scrollStart = 0;
        const scrollEnd = 100;

        let progress = (scrollY - scrollStart) / (scrollEnd - scrollStart);
        progress = Math.max(0, Math.min(1, progress));

        const scale = 1 - progress * (1 - minScale);

        logo.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

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
            calculateMinScale();
            updateScene();
        }, 250);
    });
});
