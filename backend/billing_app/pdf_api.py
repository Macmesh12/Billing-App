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
    Render PDF or JPEG from provided HTML fragment.
    
    This is the main API endpoint for document generation.
    Accepts HTML payload from frontend and returns rendered document.
    
    POST /api/pdf/render/
    
    Request JSON:
    {
        "html": "<div>...</div>",           # Required: HTML fragment to render
        "document_type": "invoice",         # Optional: invoice/receipt/waybill
        "format": "pdf",                    # Optional: pdf or jpeg (default: pdf)
        "filename": "invoice-001.pdf"       # Optional: suggested filename
    }
    
    Response: Binary document with Content-Disposition header
    
    Error Response: JSON with "error" field
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

    # ============================================
    # PARSE AND VALIDATE REQUEST PAYLOAD
    # ============================================
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return _cors(JsonResponse({"error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST))

    # Extract HTML fragment from payload
    fragment_raw = payload.get("html")
    if fragment_raw is None:
        return _cors(JsonResponse({"error": "Missing 'html' field"}, status=HTTPStatus.BAD_REQUEST))

    fragment = str(fragment_raw)
    if not fragment.strip():
        return _cors(JsonResponse({"error": "Empty HTML payload"}, status=HTTPStatus.BAD_REQUEST))

    # Extract document type and format
    document_type = str(payload.get("document_type") or "document").strip().lower()
    requested_format = str(payload.get("format") or "pdf").strip().lower() or "pdf"

    # ============================================
    # DETERMINE OUTPUT FORMAT
    # ============================================
    # Normalize format to either "pdf" or "jpeg"
    if requested_format in {"jpg", "jpeg"}:
        output_format = "jpeg"
        extension = "jpg"
    elif requested_format == "pdf":
        output_format = "pdf"
        extension = "pdf"
    else:
        return _cors(JsonResponse({"error": "Unsupported format requested"}, status=HTTPStatus.BAD_REQUEST))

    # Sanitize and set filename for download
    filename = _safe_filename(payload.get("filename"), ext=extension)

    # ============================================
    # PREPARE HTML DOCUMENT FOR RENDERING
    # ============================================
    # Wrap HTML fragment with CSS and proper document structure
    html_document = _wrap_html(fragment, document_type)
    
    # Set base URL for resolving relative paths (e.g., /assets/logo.png)
    base_url = request.build_absolute_uri("/")
    html = HTML(string=html_document, base_url=base_url)

    # ============================================
    # RENDER DOCUMENT
    # ============================================
    try:
        if output_format == "pdf":
            # Generate PDF using WeasyPrint
            data = html.write_pdf()
            content_type = "application/pdf"
        else:
            # Generate JPEG (via PNG intermediate)
            # WeasyPrint doesn't support JPEG directly, so we convert from PNG
            if Image is None:
                return _cors(JsonResponse({"error": "JPEG rendering requires Pillow to be installed"}, status=HTTPStatus.SERVICE_UNAVAILABLE))
            
            # Step 1: Render to PNG
            png_bytes = html.write_png()
            
            # Step 2: Convert PNG to JPEG using Pillow
            with Image.open(BytesIO(png_bytes)) as png_image:
                jpeg_buffer = BytesIO()
                # Convert to RGB (JPEG doesn't support transparency)
                png_image.convert("RGB").save(jpeg_buffer, format="JPEG", quality=92, optimize=True)
                data = jpeg_buffer.getvalue()
            
            content_type = "image/jpeg"
    except Exception:  # pragma: no cover - bubble error as JSON
        # Log error and return friendly message to client
        LOGGER.exception("Failed to render document for type %s (format %s)", document_type, output_format)
        return _cors(JsonResponse({"error": "Failed to render document"}, status=HTTPStatus.INTERNAL_SERVER_ERROR))

    # ============================================
    # RETURN RENDERED DOCUMENT
    # ============================================
    response = HttpResponse(data, content_type=content_type)
    # Set Content-Disposition to trigger browser download
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)
