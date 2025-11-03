
```instructions
# Billing App — AI Playbook

## Architecture at a glance
- Electron shell (`electron/main.js`) launches Django via child process and points Chromium to `http://127.0.0.1:8765/`.
- Django project lives in `backend/`; domain apps: `billing_app/invoices`, `receipts`, `waybills`. Each app exposes APIs (`api.py`), form parsing, and services.
- Frontend assets (templates, CSS, JS) live entirely in `frontend/`. Templates are dual-use (edit + preview) and JS keeps edit/preview views in sync.
- PDFs rendered server-side with WeasyPrint (`billing_app/pdf_api.py`). Payloads come from the preview DOM cloned client-side.

## Backend conventions
- Tax and levy config defined in `billing_app/settings.py::TAX_SETTINGS`; APIs read this directly (see `invoices/api.py::calculate_preview`).
- Monetary math stays in `Decimal` land (`invoices/services/calculator.py`). Avoid floats or implicit rounding.
- Line items arrive as JSON strings; always parse via `InvoiceForm._parse_items` / equivalent form helpers to reuse validation.
- Document numbering handled in `services/numbering.py` per app; numbers may be reserved up front via API.
- Firestore counters are optional: `services/counter_store.py` falls back to local storage when Application Default Credentials are missing.

## Frontend patterns
- Each document type has a JS controller (`frontend/static/js/{invoice,receipt,waybill}.js`) that keeps form + preview in sync, reserves numbers, and builds the PDF payload.
- Preview/PDF share markup via cloning: `buildPdfPayload` wraps the preview in `.pdf-export-wrapper`. When adjusting layout, update both general styles and `pdf-export-wrapper` overrides to keep preview == PDF.
- Global styles (`static/css/general.css`) define document sizing: edit mode is A3-sized canvas; preview and PDFs are A4. Keep changes consistent across `.document`, `.is-preview`, and `.pdf-export-wrapper` selectors.
- Logo/signature assets are served from `/assets/` (configured in `urls.py`). Use that path in templates and ensure new assets land in `assets/` root.

## Key workflows
1. **Bootstrap backend**
	```bash
	python3 -m venv backend/.venv
	source backend/.venv/bin/activate
	pip install -r backend/requirements.txt
	cd backend
	python manage.py migrate
	python manage.py runserver 127.0.0.1:8765
	```
2. **Run unit tests** – focus on domain apps (`python manage.py test invoices receipts waybills`).
3. **Electron dev shell** – `cd electron && npm install && npm run dev` starts Electron + waits for Django.

## PDF generation gotchas
- `_wrap_html` in `pdf_api.py` injects CSS bundles: `CSS_BUNDLES` maps doc types to `{general.css, invoice.css, ...}`. Add new CSS files there when splitting styles.
- Base URL for WeasyPrint is `FRONTEND_DIR`; reference static assets relative to that (e.g., `src="/assets/logo.png"`).
- Keep printable styles lightweight: avoid fixed positioning unless mirrored in preview. Test with `python manage.py runserver` then hit `/api/pdf/render/` manually if needed.

## Packaging notes
- Current flow ships Python + Django alongside Electron; PyInstaller spec lives in docs (`DEPLOYMENT.md`). Ensure migrations run on first launch and database path moves to Electron's `app.getPath('userData')` for packaged builds.
- Collect static files (`python manage.py collectstatic`) before bundling if serving without Django's DEBUG static finder.

## When adding features
- Copy API patterns from existing `api.py` modules: parse form, reuse services, return DTO (dict-friendly) responses.
- Frontend toast helpers live in each JS module. Keep UX consistent by calling `showToast(message, type)`.
- Update both template (`frontend/templates/…`) and JS when adding fields—preview HTML mirrors edit form fields.

Need more detail on a subsystem? Call it out in your request.
