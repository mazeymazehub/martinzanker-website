// image-transition.js
// Scroll-getriebener Wipe für Bildübergänge im Desktop-Schmalmodus (< 640 px Breite).
// Trennlinie = Mitte der jeweiligen Textbox.
// Trigger     = Textbox-Oberkante passiert Bild-Unterkante.
// KONZEPT-Übergang: clip-path:inset() von oben schrumpft und gibt Ben frei.
// RIVUS/MYTHUS:     Clip-Path-Wipe zwischen Old-/New-Image.
// Nur aktiv bei (hover: hover) and (pointer: fine).
(function () {
    'use strict';
    // Läuft jetzt auch auf Touch-Smartphones (nicht nur narrowHover). Die Breiten-
    // Begrenzung übernimmt update() selbst: bei >= BP wird zurückgesetzt und returned.

    const BP = 640;

    let _e = null;
    function refs() {
        if (_e) return _e;
        return (_e = {
            konzept:    document.querySelector('.content-box-wrapper'),
            konzeptBox: document.querySelector('.content-box'),
            rivus:      document.getElementById('rivus-content-box-wrapper'),
            mythus:     document.getElementById('mythus-box-wrapper'),
            ben:        document.getElementById('ben-image-with-info'),
            benOverlay: document.getElementById('ben-stair-overlay'),
            daniel:     document.getElementById('mythus-daniel-image-with-info'),
            michael:    document.getElementById('michael-image-with-info'),
            marcus:     document.getElementById('marcus-image-with-info'),
        });
    }

    // ── Hilfsfunktionen ─────────────────────────────────────────────────────────
    function vis(el, show) {
        if (!el) return;
        el.style.transition    = 'none';
        el.style.opacity       = show ? '1' : '0';
        el.style.clipPath      = '';
        el.style.zIndex        = '';
        el.style.pointerEvents = show ? 'auto' : 'none';
    }

    // Pixel-basierter Wipe: newImg erscheint unterhalb wipeY, oldImg oberhalb.
    function applyWipeAtY(wipeY, newImg, oldImg, benEl) {
        const benR = benEl ? benEl.getBoundingClientRect() : null;

        if (newImg) {
            const own = newImg.getBoundingClientRect();
            const top = (own && own.height > 1) ? own.top    : (benR ? benR.top    : null);
            const h   = (own && own.height > 1) ? own.height : (benR ? benR.height : null);
            if (top !== null && h > 0) {
                const px = Math.max(0, wipeY - top);
                const t  = px / h;
                newImg.style.transition    = 'none';
                newImg.style.opacity       = t > 0.9995 ? '0' : '1';
                newImg.style.clipPath      = px < 1     ? ''
                                           : t > 0.9995 ? 'inset(100% 0 0 0)'
                                           : `inset(${px.toFixed(1)}px 0 0 0)`;
                newImg.style.zIndex        = '2';
                newImg.style.pointerEvents = t > 0.9995 ? 'none' : 'auto';
            }
        }
        if (oldImg) {
            const own    = oldImg.getBoundingClientRect();
            const bottom = (own && own.height > 1) ? own.bottom : (benR ? benR.bottom : null);
            const h      = (own && own.height > 1) ? own.height : (benR ? benR.height : null);
            if (bottom !== null && h > 0) {
                const px = Math.max(0, bottom - wipeY);
                const t  = px / h;
                oldImg.style.transition    = 'none';
                oldImg.style.opacity       = t > 0.9995 ? '0' : '1';
                oldImg.style.clipPath      = px < 1     ? ''
                                           : t > 0.9995 ? 'inset(0 0 100% 0)'
                                           : `inset(0 0 ${px.toFixed(1)}px 0)`;
                oldImg.style.zIndex        = '1';
                oldImg.style.pointerEvents = t > 0.9995 ? 'none' : 'auto';
            }
        }
    }

    // Inline-Styles, die der Schmalmodus auf die Bilder schreibt, beim Wechsel auf
    // breitere Fenster wieder entfernen — sonst bleibt das gerade ausgeblendete/
    // weggeclippte Bild (z. B. Daniel) mit opacity:0 oder clip-path versteckt hängen.
    let _narrowActive = false;
    function clearInline(el) {
        if (!el) return;
        el.style.opacity       = '';
        el.style.clipPath      = '';
        el.style.zIndex        = '';
        el.style.pointerEvents = '';
        el.style.transition    = '';
    }
    function resetWideMode() {
        const el = refs();
        [el.ben, el.daniel, el.michael, el.marcus, el.benOverlay].forEach(clearInline);
    }

    // ── Haupt-Update ───────────────────────────────────────────────────────────
    function update() {
        if (window.innerWidth >= BP) {
            if (_narrowActive) { resetWideMode(); _narrowActive = false; }
            return;
        }
        _narrowActive = true;

        const el = refs();
        const benR = el.ben ? el.ben.getBoundingClientRect() : null;
        if (!benR || benR.height < 1) return;

        const imgBottom = benR.bottom;

        const konzR = el.konzept ? el.konzept.getBoundingClientRect() : null;
        const rivR  = el.rivus   ? el.rivus.getBoundingClientRect()   : null;
        const mythR = el.mythus  ? el.mythus.getBoundingClientRect()  : null;

        const konzTop = konzR ? konzR.top : Infinity;
        const rivTop  = rivR  ? rivR.top  : Infinity;
        const mythTop = mythR ? mythR.top : Infinity;

        // ── State-Machine ──────────────────────────────────────────────────────

        // 1. MYTHUS betritt Bildbereich → Wipe Daniel → Michael
        if (mythTop < imgBottom) {
            // Touch: Wipe-Linie 30px tiefer, damit sie hinter der (per Offset 45px tieferen) Box liegt
            const _touchWipe = window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 30 : 0;
            const wipeY = (mythR ? (mythR.top + mythR.bottom) / 2 : 0) + _touchWipe;
            vis(el.ben, false);
            vis(el.benOverlay, false);
            applyWipeAtY(wipeY, el.michael, el.daniel, el.ben);
            vis(el.marcus, false);
            return;
        }

        // 2. RIVUS betritt Bildbereich → Wipe Ben → Daniel
        if (rivTop < imgBottom) {
            const wipeY = rivR ? (rivR.top + rivR.bottom) / 2 : 0;
            applyWipeAtY(wipeY, el.daniel, el.ben, el.ben);
            if (el.benOverlay) {
                const px = Math.max(0, benR.bottom - wipeY);
                const t  = px / benR.height;
                el.benOverlay.style.transition    = 'none';
                el.benOverlay.style.opacity       = t > 0.9995 ? '0' : '1';
                el.benOverlay.style.clipPath      = px < 1     ? ''
                                                  : t > 0.9995 ? 'inset(0 0 100% 0)'
                                                  : `inset(0 0 ${px.toFixed(1)}px 0)`;
                el.benOverlay.style.pointerEvents = 'none'; // Overlay ist nur Label, darf Klicks nicht abfangen
            }
            vis(el.michael, false);
            vis(el.marcus, false);
            return;
        }

        // 3. KONZEPT betritt Bildbereich → clip-path von oben schrumpft, gibt Ben sukzessiv frei
        // A = Pixel, die von oben weggeschnitten werden (= wipeY - benR.top).
        // Sichtbarer Bereich: wipeY bis benR.bottom. Innerhalb der Textbox unsichtbar (z:10).
        // Unterhalb der Textbox-Unterkante: Ben sichtbar.
        // Ben bleibt immer opacity:1 → kein Opacity-Pop beim Zustandswechsel.
        if (konzTop < imgBottom) {
            // wipeY = Oberkante der dunklen KONZEPT-Box (innere Box, nicht Wrapper):
            // Wrapper-Top liegt etwas über der Box → Ben würde im Spalt durchblitzen.
            const konzBoxR = el.konzeptBox ? el.konzeptBox.getBoundingClientRect() : null;
            const wipeY = konzBoxR ? konzBoxR.top : (konzR ? konzR.top : 0);
            // +1px Überlappung + aufgerundet: Bens Schnittkante liegt 1px IN der (deckenden) Box,
            // sonst bleibt bei Sub-Pixel-Rundung eine hauchdünne helle Ben-Zeile an der Box-Oberkante.
            const A = Math.max(0, Math.min(benR.height, Math.ceil(wipeY - benR.top) + 1));
            el.ben.style.transition    = 'none';
            el.ben.style.opacity       = '1';
            el.ben.style.clipPath      = A < 1 ? '' : `inset(${A.toFixed(1)}px 0 0 0)`;
            el.ben.style.zIndex        = '';
            el.ben.style.pointerEvents = A < benR.height ? 'auto' : 'none'; // klickbar solange sichtbar (wie andere Bilder)
            if (el.benOverlay) {
                el.benOverlay.style.transition    = 'none';
                el.benOverlay.style.opacity       = '1';
                el.benOverlay.style.clipPath      = A < 1 ? '' : `inset(${A.toFixed(1)}px 0 0 0)`;
                el.benOverlay.style.zIndex        = '';
                el.benOverlay.style.pointerEvents = 'none'; // Overlay ist nur Label, darf Klicks auf Ben nicht abfangen
            }
            vis(el.daniel, false);
            vis(el.michael, false);
            vis(el.marcus, false);
            return;
        }

        // 4. Nichts sichtbar — Ben per Clip-Path ausblenden.
        // opacity bleibt 1, damit beim Übergang in State 3 kein Opacity-Pop entsteht.
        el.ben.style.transition    = 'none';
        el.ben.style.opacity       = '1';
        el.ben.style.clipPath      = 'inset(100% 0 0 0)';
        el.ben.style.zIndex        = '';
        el.ben.style.pointerEvents = 'none';
        if (el.benOverlay) {
            el.benOverlay.style.transition    = 'none';
            el.benOverlay.style.opacity       = '0';
            el.benOverlay.style.clipPath      = '';
            el.benOverlay.style.pointerEvents = 'none';
        }
        vis(el.daniel, false);
        vis(el.michael, false);
        vis(el.marcus, false);
    }

    // Vom Haupt-Skript getrieben (script.js → updateScene), direkt nach den Box-Transforms im selben
    // rAF-Frame. Ein eigener scroll-Listener würde Bens Clip einen Frame nachhinken lassen (die Box
    // wird im rAF des Haupt-Skripts gesetzt) → Durchblitzer beim Scrollen.
    window.__imageTransitionUpdate = update;
    window.addEventListener('resize', function () { _e = null; update(); });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }
})();
