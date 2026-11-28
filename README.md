# FinEdge - Banking Finance Management System

FinEdge is a browser-based finance management demo. It includes a dashboard and pages for accounts, cards, transfers, transactions, budgets, expenses, savings goals, bills, profile, and settings.

## Features

- Sign up and log in to a local demo account.
- Store finance data separately for each user in JSON Server.
- View account balances and recent activity on the dashboard.
- Manage accounts and cards, record demo transfers, track expenses, and set savings goals.
- Add bills and pay them from a selected account. A successful bill payment reduces that account's balance.
- Keep profile and settings data for the signed-in user.

Money transfers are recorded for demonstration only. No real money is moved.

## Requirements

- Node.js and npm
- A local web server, such as the VS Code Live Server extension

## Run locally

1. Install the project dependencies:

   ```sh
   npm install
   ```

2. Create a local database file from the safe example:

   ```powershell
   Copy-Item db.example.json db.json
   ```

3. Start the JSON Server API from the project root:

   ```sh
   npm run api
   ```

   On Windows PowerShell, if the `npm` command is blocked by the execution policy, use:

   ```powershell
   npm.cmd run api
   ```

4. In a second terminal, serve the project root with VS Code Live Server or another local HTTP server.
5. Open the served `HTML/signup.html` page to create an account, or `HTML/login.html` to sign in.

The API runs at `http://localhost:3000`. Serve the pages over HTTP rather than opening them directly as `file://` URLs.

## Data

JSON Server stores accounts in the local, ignored `db.json` file. Create it from the sanitized `db.example.json` before starting the API. Each signed-in user has a separate `userData` record, and a new signup starts with empty finance data. Keep a backup before manually editing or resetting this file. Never commit real user data.

## Project layout

```text
CSS/          Page and shared styles
HTML/         Application pages
JAVASCRIPT/   Page behavior and shared data helpers
db.example.json  Safe starter data for local JSON Server
db.json         Ignored local JSON Server data
package.json  Project scripts and dependencies
```

## Limitations and security

- This is a local development/demo app, not a production banking system.
- JSON Server does not provide production-grade authentication or access control. Passwords are stored as plain text in the local JSON data.
- Do not use real passwords, financial account details, or other sensitive information.
- No automated test suite is configured yet.
- Bootstrap, fonts, and icons are loaded from external CDNs on pages that use them, so an internet connection may be needed for those assets.
