# Banking Finance Management System

FinEdge is a responsive front-end concept for a personal banking and finance management dashboard. It provides a consistent navigation layout and user account screens for managing profile information and application preferences.

## Current Pages

- **Profile** - View and edit personal information, contact details, and preferences.
- **Settings** - Manage general preferences such as language, currency, theme, date format, and notification options.

The remaining navigation items shown in the sidebar are placeholders for future dashboard features.

## Technologies

- HTML5
- CSS3
- Bootstrap 5.3.3 via CDN

## Project Structure

```text
Banking-Finance-Management-System/
|-- CSS/
|   |-- profile.css
|   `-- settings.css
|-- HTML/
|   |-- profile.html
|   `-- settings.html
`-- README.md
```

## Running the Project

This is a static website, so no build tools or server are required.

1. Open `HTML/profile.html` or `HTML/settings.html` in a web browser.
2. For the best development experience, open the project folder in VS Code and use a local server extension such as Live Server.

The pages load Bootstrap from a CDN, so an internet connection is required for Bootstrap styles to load.

## Current Limitations

- The forms and settings controls are visual only and do not persist data.
- No backend, authentication, database, or transaction processing is currently included.
- Several sidebar links refer to pages that are planned but not yet implemented.

## Planned Improvements

- Add dashboard, accounts, transfers, transactions, budget, savings, and bills pages.
- Connect profile and settings forms to persistent user data.
- Add authentication and secure account management.
- Improve mobile navigation and accessibility across all screens.