# Malerei & Vermittlung - Website

Eine moderne, responsive Website für Malerei & Vermittlung, orientiert am Design der Parsons School (New School).

## Struktur

### Seiten
- **index.html** - Landing-Page mit Scroll-Effekten und Parallax-Animationen
- **werke.html** - Galerie-Seite mit Filter-Funktion
- **ausstellungen.html** - Übersicht vergangener und kommender Ausstellungen
- **kontakt.html** - Kontaktformular und Kontaktinformationen
- **impressum.html** - Rechtliche Informationen

### Features

#### Responsive Design
- Funktioniert auf Desktop, Tablet und Mobile
- Mobile Navigation mit Hamburger-Menü
- Flexible Grid-Layouts
- Clamp-basierte Typography für optimale Lesbarkeit

#### Scroll-Verhalten (beibehalten aus Original)
- Header schrumpft beim Scrollen
- Logo wird kleiner beim Scrollen
- Text-Container mit Fade-In/Fade-Out Effekt
- Parallax-Effekt auf Bildern und Texten
- Z-Ebenen-System für Tiefenwirkung

#### Interaktive Elemente
- Bild-Hover-Effekte (Farbwechsel von Original zu Rot)
- Category-Filter auf Werke-Seite
- Smooth Scrolling
- Animierte Navigation

## Verwendete Technologien

- **HTML5** - Semantisches Markup
- **CSS3** - Moderne CSS Features (Grid, Flexbox, Clamp, etc.)
- **JavaScript (Vanilla)** - Keine Frameworks, pure Performance
- **Custom Fonts** - ZIGZAG & Andron

## Anpassungen

### Texte ändern
Alle Texte können direkt in den HTML-Dateien angepasst werden.

### Bilder ersetzen

#### Dummy-Bilder ersetzen
In [werke.html](werke.html) gibt es Dummy-Bilder mit Farbverläufen:
```html
<div class="dummy-image" style="background: linear-gradient(...);">
    <span>Landschaft 1</span>
</div>
```

Diese durch echte Bilder ersetzen:
```html
<img src="img/dein-bild.jpg" alt="Beschreibung" class="work-image">
```

#### Neue Werke hinzufügen
```html
<div class="work-item" data-category="portraits">
    <div class="work-image-wrapper">
        <img src="img/neues-werk.jpg" alt="Titel" class="work-image">
        <div class="work-overlay">
            <h3>Werk Titel</h3>
            <p>Technik, Jahr</p>
        </div>
    </div>
</div>
```

### Farben anpassen
Die Farben sind als CSS-Variablen in `:root` in [css/styles.css](css/styles.css) definiert: `--color-primary` (#ff6633, Orange), `--color-dark` (#333333), `--color-light` (#E9E9E4).

### Kontaktdaten
Aktualisiere die Platzhalter in:
- [kontakt.html](kontakt.html)
- [impressum.html](impressum.html)
- Footer in allen HTML-Dateien

### Logo
Das Logo-GIF befindet sich unter `img/logo.gif`. Ersetze es durch dein eigenes Logo (sollte transparent sein für beste Ergebnisse).

## Kategorien auf Werke-Seite

Verfügbare Kategorien:
- `all` - Zeigt alle Werke
- `portraits` - Portrait-Arbeiten
- `landscapes` - Landschaften
- `abstract` - Abstrakte Arbeiten

Neue Kategorie hinzufügen:
1. Button in [werke.html](werke.html) hinzufügen
2. `data-category` Attribut bei Werken setzen

## Browser-Kompatibilität

Getestet und funktioniert in:
- Chrome/Edge (neueste Versionen)
- Firefox (neueste Versionen)
- Safari (neueste Versionen)
- Mobile Browsers (iOS Safari, Chrome Mobile)

## Performance-Optimierungen

- `will-change` für animierte Elemente
- `requestAnimationFrame` für Scroll-Animationen
- Lazy-Loading ready (kann hinzugefügt werden)
- Optimierte Transform-Animationen (GPU-beschleunigt)
- `prefers-reduced-motion` Support

## Nächste Schritte

1. **Eigene Bilder einfügen** - Ersetze Dummy-Bilder durch echte Werke
2. **Texte anpassen** - Füge deine eigenen Beschreibungen hinzu
3. **Kontaktformular Backend** - Verbinde das Kontaktformular mit einem Backend (z.B. FormSpree, EmailJS)
4. **SEO optimieren** - Meta-Beschreibungen hinzufügen
5. **Analytics** - Google Analytics oder ähnliches einbinden
6. **Hosting** - Website auf Server deployen

## Ordnerstruktur

```
Code/
├── index.html
├── werke.html
├── ausstellungen.html
├── kontakt.html
├── impressum.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── script.js
│   └── works.js
├── img/
│   ├── logo.gif
│   ├── parallax/
│   └── Gesichten/
└── fonts/
    ├── ZIGZAG-NotRounded.woff2
    └── Andron Freefont LAT Reg.woff2
```

## Support

Bei Fragen oder Problemen, bitte die Kommentare im Code beachten oder mich kontaktieren.

---

**Viel Erfolg mit deiner neuen Website!**
