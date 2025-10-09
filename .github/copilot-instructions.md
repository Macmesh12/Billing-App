# Billing App — AI Playbook

## Architecture at a glance
- Django project lives in `backend/`; feature apps are `invoices/`, `receipts/`, and `waybills/`, each with models, forms, views, urls, admin, and `services/` helpers.
- HTML lives under `frontend/templates/`; every document template extends `base.html` and switches between edit/preview states via module-level CSS classes.
- Static assets sit in `frontend/static/`: shared styles in `css/general.css`, module overrides in `css/{invoice,receipt,waybill}.css`, and JS in `js/{main,invoice,receipt,waybill}.js`.
- Electron shell in `electron/` boots Django (`python backend/manage.py runserver 127.0.0.1:8765`) before opening a `BrowserWindow`; `package.json` scripts rely on `concurrently` + `wait-on`.

## Key backend patterns
- Tax percentages are centralized in `billing_app/settings.py::TAX_SETTINGS`; every invoice view uses `_build_tax_rows` in `invoices/views.py` to hydrate totals for templates and PDFs.
- Invoice math lives in `invoices/services/calculator.py` (Decimal-based); numbering helpers are in each app’s `services/numbering.py` and exposed via `model` properties (e.g., `Invoice.invoice_number`).
- Document views are class-based: form screens use `FormView`, detail/PDF reuse the same template with a `preview` flag. PDFs render through WeasyPrint when installed; HTML falls back if the lib is missing.
- JSON form payloads (line items) are stored on the model via `JSONField`. The associated `ModelForm` parses/sanitizes JSON (see `InvoiceForm._parse_items`) and rehydrates the hidden field in `__init__` for edit/detail flows.

## Frontend conventions
- `static/js/main.js` exposes a global `BillingApp` helper with currency formatting, number parsing, and preview toggling (which also flips `hidden` attributes). Module scripts consume this helper—no ES modules.
- Invoice and waybill scripts (`static/js/invoice.js`, `static/js/waybill.js`) keep an in-memory `items` array, render editable rows, sync the hidden JSON field, and mirror rows into preview tables. They guard DOM lookups so detail/PDF views don’t crash.
- Templates render server totals for PDFs but expect JS to refresh them in edit mode. Always keep `data-` attributes (e.g., `data-levy`, `data-rate`) intact when modifying markup—calculations depend on them.

## Electron workflow
- `electron/main.js` spawns Django via Node’s `child_process.spawn` and kills it on `will-quit`; keep the server port aligned with `settings.ALLOWED_HOSTS` and `mainWindow.loadURL`.
- Development script (`npm run dev`) requires Python in PATH; adjust to `python3` if contributors use that executable name.

## Build & test habits
- Python deps listed in `backend/requirements.txt`; create a venv inside `backend/` and run `python manage.py migrate` before first launch.
- Unit tests live alongside each app (e.g., `invoices/tests.py` covers numbering + tax math). Prefer `python manage.py test invoices` for quick checks when touching those services.
- Ignore generated PDFs/SQLite DB—`.gitignore` already excludes `backend/db.sqlite3` and build artifacts.

## When extending features
- Reuse `_build_tax_rows` when new invoice-related templates need levy breakdowns.
- Mirror any new document module across: model/service/form/view/template/static JS/CSS folders to retain parity with existing apps.
- Keep preview controls wired through `BillingApp.togglePreview`; if you introduce new interactive blocks, add selectors there instead of duplicating logic.
