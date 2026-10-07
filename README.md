# Pocket expense tracker

A responsive money tracker built with vanilla JavaScript and Vite. Track expenses and income, see monthly and all-time balances, split shared payments, and record money received from other people. Amounts use INR.

## Track your money

- **Expenses:** Add, edit, delete, search, and filter paid expenses, see category spending, and export the current results as CSV.
- **Income:** Record salary, freelance payments, gifts, or other money received. Edit or delete records and export filtered income as CSV.
- **Split share:** Enter a new payment or link an existing expense, name the people who owe you, and enter each person's share. Use **Split equally with you** to divide the available amount between you and the named people. Any rounding remainder stays in your share.
- **Repayments:** Record partial or full amounts received and their dates. See outstanding amounts by person, filter pending or settled shares, and undo a repayment entered by mistake. Removing a share leaves the original expense; deleting a shared expense also removes its shares and repayments after confirmation.

Remaining cash is **income − the full amount of paid expenses + repayments received**. Outstanding shares are shown separately and only increase cash when you record a repayment. Monthly cash uses each income, expense, or repayment's own date; the outstanding total includes all dates. This is a balance of recorded activity, not a bank-account connection.

For example, receive ₹1,000, pay a ₹300 dinner bill, and assign ₹100 to a friend. You have ₹700 remaining and ₹100 owed to you. After the friend repays ₹40, you have ₹740 remaining and ₹60 still owed. Linking a recorded dinner expense does not add a second expense.

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

Expenses, income, shares, and repayments are stored in this browser's local storage. Existing expenses are migrated on first use, with the old storage left intact. Records persist across reloads but do not sync between devices. Clearing browser data removes them; the expense and income CSV exports provide portable copies of those records, but do not include share or repayment history. No account, backend, or credentials are needed. The UI uses optional Google Fonts with local sans-serif fallbacks.
