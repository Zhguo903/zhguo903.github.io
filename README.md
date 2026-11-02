# Zihan Guo — Personal Website

Live site: https://zhguo903.github.io/

A bilingual personal portfolio with research, projects, education, experience and a downloadable CV. Built with HTML, CSS and JavaScript.

## Local preview

Run `python3 -m http.server 4173` from this directory, then open http://localhost:4173.

## Update and publish

Edit the files in this repository and push to `main`. GitHub Pages publishes directly from the repository root; `.nojekyll` keeps the static files unchanged.

- `index.html`: page content and links.
- `translations.js` and `i18n.js`: Chinese translations and language switching.
- `app.js` and `motion.js`: interactions and animation.
- `styles.css` and `motion.css`: layout and styling.
- `assets/`: portrait, project figures and `GZH_CV.pdf`.

When replacing an asset, update its URL version in `index.html` to avoid stale browser caches. Keep both language versions aligned.
