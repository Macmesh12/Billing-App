# Billing App

Web-based billing application for generating invoices, receipts, and waybills. Built with Django backend serving HTML templates and static frontend assets.

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
.github/
    copilot-instructions.md
```

## Prerequisites

- Python 3.11+

## Setup

```bash
# install python deps
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# apply initial migrations
python manage.py migrate
```

## Development

Run the Django development server:

```bash
cd backend
source .venv/bin/activate
python manage.py runserver 127.0.0.1:8765
```

Then open your browser to `http://127.0.0.1:8765/`

Useful backend commands:

- `python manage.py runserver 127.0.0.1:8765`
- `python manage.py test`

All HTML, CSS, and JavaScript is located in `frontend/`; Django's `TEMPLATES` and `STATICFILES_DIRS` settings point there. Generated PDFs live in-memory for download—avoid committing them. Default tax percentages live in `backend/billing_app/settings.py` under `TAX_SETTINGS`.
