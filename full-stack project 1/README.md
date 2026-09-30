# Little Ember Coffee — Project 1

A responsive single-page website for a fictional neighbourhood café. The brand, writing and layout were created for this project, without a website template.

## Technologies used
- HTML5 for semantic page sections and form labels.
- CSS3 for mobile-first styles, Flexbox, Grid and media queries.
- Basic JavaScript for the mobile menu and practice form validation.

## How to run
Open `dist/index.html` in a browser. No installation or build is needed. Keep its `css`, `js` and `images` folders together. The `dist` folder is the complete website and can be renamed to `project-1` for submission.

## Layout plan
Desktop: navigation → heading beside coffee photo → story in two columns → three favourite coffee cards → two-column menu → three reasons → gallery → contact details beside form → footer.

Mobile: content stacks in one column with a toggleable navigation menu. Tablet uses two coffee-card columns; desktop uses three. Breakpoints are 768px and 1024px.

## Features
- Home, story, menu, gallery and contact anchor navigation.
- Mobile menu with an expanded state and Escape-key support.
- Required form fields, native email checking and a small JavaScript check.
- Skip link, visible keyboard focus, image descriptions and reduced-motion support.
- No backend, database, framework or external JavaScript library.

The form is a local demonstration. It never sends or saves entries. All prices, business details and the café itself are fictional. Photos are illustrative, not images of a real Little Ember café.

## Learning notes
Read the HTML first, then the base mobile styles, the two media queries, and finally the JavaScript. `querySelector` finds an element; `addEventListener` handles an action; `classList.toggle` changes whether the menu is open. Grid arranges page columns, while Flexbox aligns navigation links and small rows.

## Credits
See `dist/images/CREDITS.md` for photograph sources.

## Checks completed
Browser checks at 390px, 768px and 1440px found no horizontal overflow. The mobile menu opens and closes, including with Escape. A valid practice message shows confirmation; an invalid email is blocked. All section links resolve and all four displayed images load. JavaScript passed `node --check`.
