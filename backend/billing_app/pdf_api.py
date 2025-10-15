"""PDF rendering API endpoints."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from http import HTTPStatus
from io import BytesIO

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

try:
    from weasyprint import HTML
except ImportError:  # pragma: no cover - handled gracefully at runtime
    HTML = None

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency
    Image = None

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


def _safe_filename(raw: str | None, ext: str = "pdf") -> str:
    extension = (ext or "pdf").lower().lstrip(".") or "pdf"
    candidate = (raw or f"document.{extension}").strip()
    filtered = "".join(ch for ch in candidate if ch.isalnum() or ch in {"-", "_", "."})
    if not filtered:
        filtered = f"document.{extension}"
    if not filtered.lower().endswith(f".{extension}"):
        filtered = f"{filtered}.{extension}"
    return filtered


@csrf_exempt
def render_pdf(request: HttpRequest) -> HttpResponse:
    """
    Render PDF or JPEG from HTML fragment.
    
    This endpoint accepts HTML content and renders it to PDF or JPEG format
    using WeasyPrint. The HTML is wrapped with appropriate CSS for the
    document type before rendering.
    
    Request:
        Method: POST
        Body (JSON):
            - html: HTML fragment to render (required)
            - document_type: Type of document (invoice, receipt, waybill) for CSS selection
            - format: Output format - "pdf" or "jpeg" (default: "pdf")
            - filename: Desired output filename (sanitized automatically)
    
    Response:
        - Content-Type: application/pdf or image/jpeg
        - Content-Disposition: attachment with sanitized filename
        - Body: Binary PDF or JPEG data
    
    Errors:
        - 400: Invalid JSON, missing html field, or unsupported format
        - 405: Method not allowed (not POST)
        - 500: Rendering failed
        - 503: WeasyPrint or Pillow not available
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))

    # Only accept POST requests
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))

    # Check if WeasyPrint is available
    if HTML is None:
        return _cors(JsonResponse({"error": "PDF renderer is not available"}, status=HTTPStatus.SERVICE_UNAVAILABLE))

    # Parse JSON payload
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return _cors(JsonResponse({"error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST))

    # Validate HTML field
    fragment_raw = payload.get("html")
    if fragment_raw is None:
        return _cors(JsonResponse({"error": "Missing 'html' field"}, status=HTTPStatus.BAD_REQUEST))

    fragment = str(fragment_raw)
    if not fragment.strip():
        return _cors(JsonResponse({"error": "Empty HTML payload"}, status=HTTPStatus.BAD_REQUEST))

    # Extract document type and requested format
    document_type = str(payload.get("document_type") or "document").strip().lower()
    requested_format = str(payload.get("format") or "pdf").strip().lower() or "pdf"

    # Normalize format and determine file extension
    if requested_format in {"jpg", "jpeg"}:
        output_format = "jpeg"
        extension = "jpg"
    elif requested_format == "pdf":
        output_format = "pdf"
        extension = "pdf"
    else:
        return _cors(JsonResponse({"error": "Unsupported format requested"}, status=HTTPStatus.BAD_REQUEST))

    # Sanitize filename
    filename = _safe_filename(payload.get("filename"), ext=extension)

    # Wrap HTML fragment with CSS and document structure
    html_document = _wrap_html(fragment, document_type)
    # Use absolute URL for resolving relative paths in HTML
    base_url = request.build_absolute_uri("/")
    html = HTML(string=html_document, base_url=base_url)

    # Render to requested format
    try:
        if output_format == "pdf":
            # Render directly to PDF
            data = html.write_pdf()
            content_type = "application/pdf"
        else:
            # Render to JPEG via PNG intermediate
            if Image is None:
                return _cors(JsonResponse({"error": "JPEG rendering requires Pillow to be installed"}, status=HTTPStatus.SERVICE_UNAVAILABLE))
            # WeasyPrint renders to PNG, then convert to JPEG
            png_bytes = html.write_png()
            with Image.open(BytesIO(png_bytes)) as png_image:
                jpeg_buffer = BytesIO()
                # Convert to RGB (remove alpha) and save as JPEG
                png_image.convert("RGB").save(jpeg_buffer, format="JPEG", quality=92, optimize=True)
                data = jpeg_buffer.getvalue()
            content_type = "image/jpeg"
    except Exception:  # pragma: no cover - bubble error as JSON
        LOGGER.exception("Failed to render document for type %s (format %s)", document_type, output_format)
        return _cors(JsonResponse({"error": "Failed to render document"}, status=HTTPStatus.INTERNAL_SERVER_ERROR))

    # Return rendered document as file download
    response = HttpResponse(data, content_type=content_type)
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)
