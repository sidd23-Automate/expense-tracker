# Pocket expense tracker

A responsive expense tracker built with vanilla JavaScript and Vite. Add, edit, delete, search, and filter expenses; see monthly totals and category spending; export filtered expenses as CSV. Amounts use INR.

## Development

Requires Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
```

## Validation

```sh
npm test
npm run build
```

`npm run preview` serves the production build locally.

## Publish

The workflow in `.github/workflows/deploy.yml` tests, builds, and deploys the app on every push to `main`. GitHub Pages must be enabled for this repository with **GitHub Actions** as the source under **Settings → Pages**. Once enabled, rerun the deployment workflow if its first run failed.

The Pages build uses `npm run build -- --base=/expense-tracker/` so assets and the home link work under the repository's URL path. The expected site URL is `https://sidd23-automate.github.io/expense-tracker/`; the Actions deployment must complete before the site is available.

To check the Pages build locally:

```sh
npm run build -- --base=/expense-tracker/
npm run preview -- --port 4173 --base=/expense-tracker/
```

Open the preview's `/expense-tracker/` path. Expenses remain on each user's browser and are not uploaded to GitHub.

Expenses are stored in this browser's local storage. They persist across reloads but do not sync between devices. Clearing browser data removes them; CSV export provides a portable copy. No account, backend, or credentials are needed. The UI uses optional Google Fonts with local sans-serif fallbacks.
