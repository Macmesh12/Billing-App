
```instructions
# Billing App — AI Playbook (concise)

## Big picture
- Desktop app packaged with Electron. Electron spawns a local Django process and opens a BrowserWindow that loads the app from `http://127.0.0.1:8765/`.
- Frontend/UI artifacts live in `frontend/` (templates + static). Backend is a Django project in `backend/`—logic, DB, PDF generation and HTTP API.
- Domain apps: `invoices/`, `receipts/`, `waybills/`. Each app follows the pattern: `models.py`, `forms.py`, `views.py`, `urls.py`, and `services/` for small helpers.

## Project-specific patterns and rationale
- Centralized tax config: `backend/billing_app/settings.py::TAX_SETTINGS`. Business logic reads directly from this setting (see `invoices/views._build_tax_rows`).
- Decimal-first math: `invoices/services/calculator.py` uses `Decimal` and explicit rounding—do not replace with floats.
- Line items stored as JSON on models; `InvoiceForm._parse_items` is the canonical parser/validator for line-item payloads.
- Templates are dual-use (edit + preview). Preview mode is enabled by `preview` context flag; JS updates the edit view but server must recompute totals for PDF/save.

## API-first conventions (current recommended approach)
- The repo exposes small JSON endpoints under each app. Examples:
  - `POST /invoices/api/calculate-preview/` — returns subtotal, levies, grand_total (uses `InvoiceForm._parse_items` + `calculate_totals`).
  - `POST /invoices/api/create/` — creates invoice using `InvoiceForm`.
  - `GET /invoices/api/<pk>/` — returns invoice DTO (items, totals, number).
- API implementations live in `backend/invoices/api.py`, `backend/receipts/api.py`, `backend/waybills/api.py`. They intentionally reuse forms/models/services to keep business rules centralized.

## Startup and developer workflows (exact commands)
1. Create & activate venv, install Python deps:
	```bash
	python3 -m venv backend/.venv
	source backend/.venv/bin/activate
	pip install -r backend/requirements.txt
	```
2. Migrate DB and run dev server:
	```bash
	cd backend
	python manage.py migrate
	python manage.py runserver 127.0.0.1:8765
	```
3. Run targeted tests for backend logic (fast):
	```bash
	cd backend
	python manage.py test invoices
	```

## Key files to inspect when making changes
- Business & math: `backend/invoices/services/calculator.py` and `backend/invoices/services/numbering.py`.
- Form parsing: `backend/invoices/forms.py` (look for `_parse_items`).
- API examples: `backend/invoices/api.py` — copy pattern for new endpoints (reuse forms + services).
- Frontend: `frontend/templates/*` and `frontend/static/*` (JS uses global `BillingApp` in `frontend/static/js/main.js`).
- Electron wiring: `electron/main.js` shows how Django is spawned and the dev workflow uses `wait-on` + `concurrently`.



## Packaging & distribution notes
- Packaging approaches:
  - Bundle a Python runtime and run Django as a child process from Electron (current dev flow). Ensure migrations run on first-run and DB is stored in user-data folder.
  - Alternative: Build the backend into a native binary (PyInstaller) and ship that binary with Electron.
- Static files inside a packaged app: either ship collected static files or use WhiteNoise to serve bundled static files reliably.

## Example developer tasks for AI agents
- Add an API endpoint for invoice calculations: reuse `InvoiceForm._parse_items` and `invoices/services/calculator.calculate_totals`.
- Convert a server-rendered template into a static frontend page that calls the API: move logic to JS + `fetch('/invoices/api/calculate-preview/')`.

If you want, I can expand this playbook with an exact Electron startup script, a packaging checklist, or sample frontend fetch examples. Reply which section to expand.
```
