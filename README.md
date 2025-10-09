# Billing App

Local-first desktop suite for generating invoices, receipts, and waybills. The project pairs a Django backend (serving forms, calculations, and PDFs) with a standalone frontend asset bundle and an Electron shell so everything runs offline on the end-user's machine.

## Project layout

```text
backend/
    manage.py
    billing_app/
        invoices/
        receipts/
        waybills/
frontend/
    templates/
    static/
electron/
    main.js
    preload.js
    package.json
.github/
    copilot-instructions.md
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- Linux desktop environment (tested on Ubuntu 22.04)

## Setup

```bash
# install python deps
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# apply initial migrations
python manage.py migrate

# install electron deps
cd ../electron
npm install
```

## Development

Run Django API and Electron shell together:

```bash
cd electron
npm run dev
```

Useful backend commands:

- `python manage.py runserver 127.0.0.1:8765`
- `python manage.py test`

Package the desktop app:

```bash
cd electron
npm run package
```

All HTML, CSS, and JavaScript is located in `frontend/`; Django’s `TEMPLATES` and `STATICFILES_DIRS` settings point there. Generated PDFs live in-memory for download—avoid committing them. Default tax percentages live in `backend/billing_app/settings.py` under `TAX_SETTINGS`.
