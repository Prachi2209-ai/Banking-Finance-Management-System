# Banking Finance Management System

FinEdge is a responsive front-end concept for a personal banking and finance management dashboard. It provides screens for accounts, bills, budgeting, money transfers, savings, transactions, profiles, settings, login, and signup.

## Current Pages

- **Dashboard** - View an overview of account activity and financial information.
- **Accounts & Cards** - Review account and card details.
- **Bills** - Track bill-related information.
- **Budget** - Organize budget categories and spending plans.
- **Money Transfer** - Access the money transfer interface.
- **Savings** - Review savings information and goals.
- **Transactions** - Browse transaction activity.
- **Profile** - View and edit personal information, contact details, and preferences.
- **Settings** - Manage general preferences such as language, currency, theme, date format, and notification options.
- **Login and Signup** - Access the authentication screens.

## Technologies

- HTML5
- CSS3
- Bootstrap 5.3.3 via CDN

## Project Structure

```text
Banking-Finance-Management-System/
|-- CSS/
|   |-- AccountsCards.css
|   |-- bills.css
|   |-- budget.css
|   |-- dashboard.css
|   |-- login.css
|   |-- MoneyTransfer.css
|   |-- profile.css
|   |-- savings.css
|   |-- settings.css
|   |-- signup.css
|   `-- Transactions.css
|-- HTML/
|   |-- AccountsCards.html
|   |-- bills.html
|   |-- budget.html
|   |-- dashboard.html
|   |-- login.html
|   |-- MoneyTransfer.html
|   |-- profile.html
|   |-- Savings.html
|   |-- settings.html
|   |-- signup.html
|   `-- Transactions.html
`-- README.md
```

## Running the Project

This is a static website, so no build tools or server are required.

1. Open `HTML/dashboard.html` in a web browser, or open any page in the `HTML/` directory directly.
2. For the best development experience, open the project folder in VS Code and use a local server extension such as Live Server.

The pages load Bootstrap from a CDN, so an internet connection is required for Bootstrap styles to load.

## Current Limitations

- The forms and settings controls are visual only and do not persist data.
- No backend, authentication, database, or transaction processing is currently included.
- The pages are static front-end screens and are not connected to a backend.

## Planned Improvements

- Add dashboard, accounts, transfers, transactions, budget, savings, and bills pages.
- Connect profile and settings forms to persistent user data.
- Add authentication and secure account management.
- Improve mobile navigation and accessibility across all screens.