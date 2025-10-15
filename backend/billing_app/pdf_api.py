"""PDF rendering API endpoints."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from http import HTTPStatus

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

try:
    from weasyprint import HTML
except ImportError:  # pragma: no cover - handled gracefully at runtime
    HTML = None

LOGGER = logging.getLogger(__name__)

CSS_BUNDLES: dict[str, list[str]] = {
    "base": ["general.css"],
    "invoice": ["general.css", "invoice.css"],
    "receipt": ["general.css", "receipt.css"],
    "waybill": ["general.css", "waybill.css"],
}

_STATIC_CSS_DIR = settings.FRONTEND_DIR / "static" / "css"


def _cors(response: HttpResponse) -> HttpResponse:
    """Attach permissive CORS headers."""
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type, Accept")
    response.setdefault("Access-Control-Expose-Headers", "Content-Disposition")
    return response


@lru_cache(maxsize=None)
def _load_css_bundle(document_type: str) -> str:
    """Return concatenated CSS for the requested document type."""
    bundle_key = document_type if document_type in CSS_BUNDLES else "base"
    css_parts: list[str] = []
    for css_name in CSS_BUNDLES[bundle_key]:
        css_path = _STATIC_CSS_DIR / css_name
        if css_path.exists():
            css_parts.append(css_path.read_text(encoding="utf-8"))
    return "\n\n".join(css_parts)


def _wrap_html(fragment: str, document_type: str) -> str:
    css = _load_css_bundle(document_type)
    safe_type = "".join(ch for ch in document_type if ch.isalnum() or ch in {"-", "_"}) or "document"
    body_class = f"billing-app pdf-export pdf-{safe_type}".strip()
    return (
        "<!DOCTYPE html>\n"
        "<html lang=\"en\">\n"
        "<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<title>Document</title>\n"
        "<style>\n"
        f"{css}\n"
        "</style>\n"
        "</head>\n"
        f"<body class=\"{body_class}\">\n"
        f"{fragment}\n"
        "</body>\n"
        "</html>"
    )


def _safe_filename(raw: str | None) -> str:
    candidate = (raw or "document.pdf").strip()
    filtered = "".join(ch for ch in candidate if ch.isalnum() or ch in {"-", "_", "."})
    if not filtered:
        filtered = "document.pdf"
    if not filtered.lower().endswith(".pdf"):
        filtered = f"{filtered}.pdf"
    return filtered


@csrf_exempt
def render_pdf(request: HttpRequest) -> HttpResponse:
    """Render PDF bytes from provided HTML fragment."""
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))

    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))

    if HTML is None:
        return _cors(JsonResponse({"error": "PDF renderer is not available"}, status=HTTPStatus.SERVICE_UNAVAILABLE))

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return _cors(JsonResponse({"error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST))

    fragment_raw = payload.get("html")
    if fragment_raw is None:
        return _cors(JsonResponse({"error": "Missing 'html' field"}, status=HTTPStatus.BAD_REQUEST))

    fragment = str(fragment_raw)
    if not fragment.strip():
        return _cors(JsonResponse({"error": "Empty HTML payload"}, status=HTTPStatus.BAD_REQUEST))

    document_type = str(payload.get("document_type") or "document").strip().lower()
    filename = _safe_filename(payload.get("filename"))

    html_document = _wrap_html(fragment, document_type)

    try:
        pdf_bytes = HTML(string=html_document, base_url=str(settings.FRONTEND_DIR)).write_pdf()
    except Exception:  # pragma: no cover - bubble error as JSON
        LOGGER.exception("Failed to render PDF for document type: %%s", document_type)
        return _cors(JsonResponse({"error": "Failed to render PDF"}, status=HTTPStatus.INTERNAL_SERVER_ERROR))

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)
