"""
PDF and JPEG rendering API endpoints.

This module provides server-side document rendering using WeasyPrint.
It converts HTML fragments into PDF or JPEG files for download.

FEATURES:
- PDF generation using WeasyPrint HTML rendering engine
- JPEG generation via PDF -> PNG -> JPEG conversion (requires Pillow)
- CSS bundling per document type (invoice, receipt, waybill)
- Automatic styling injection with document-specific CSS
- Safe filename sanitization

ENDPOINTS:
- POST /api/pdf/render/ - Render HTML to PDF or JPEG

CSS BUNDLES:
The system loads different CSS files based on document type:
- invoice: general.css + invoice.css
- receipt: general.css + receipt.css
- waybill: general.css + waybill.css
- base: general.css only (fallback)

DEPENDENCIES:
- WeasyPrint: PDF rendering (required)
- Pillow: JPEG conversion (optional, only needed for JPEG format)
"""
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

# CSS bundle configuration: maps document types to CSS files
CSS_BUNDLES: dict[str, list[str]] = {
    "base": ["general.css"],
    "invoice": ["general.css", "invoice.css"],
    "receipt": ["general.css", "receipt.css"],
    "waybill": ["general.css", "waybill.css"],
}

# Directory containing CSS files
_STATIC_CSS_DIR = settings.FRONTEND_DIR / "static" / "css"


def _cors(response: HttpResponse) -> HttpResponse:
    """
    Attach permissive CORS headers to response.
    
    Allows cross-origin requests and exposes Content-Disposition header
    so the frontend can read the filename.
    
    Args:
        response: Django HTTP response object
        
    Returns:
        Modified response with CORS headers
    """
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type, Accept")
    response.setdefault("Access-Control-Expose-Headers", "Content-Disposition")
    return response


@lru_cache(maxsize=None)
def _load_css_bundle(document_type: str) -> str:
    """
    Load and concatenate CSS files for the requested document type.
    
    Results are cached for performance since CSS files rarely change.
    
    Args:
        document_type: Type of document (invoice, receipt, waybill, etc.)
        
    Returns:
        Concatenated CSS content as a string
    """
    bundle_key = document_type if document_type in CSS_BUNDLES else "base"
    css_parts: list[str] = []
    for css_name in CSS_BUNDLES[bundle_key]:
        css_path = _STATIC_CSS_DIR / css_name
        if css_path.exists():
            css_parts.append(css_path.read_text(encoding="utf-8"))
    return "\n\n".join(css_parts)


def _wrap_html(fragment: str, document_type: str) -> str:
    """
    Wrap HTML fragment in a complete HTML document with CSS.
    
    Creates a valid HTML document with:
    - DOCTYPE and html/head/body structure
    - Embedded CSS from the appropriate bundle
    - Document-specific body classes for styling
    
    Args:
        fragment: HTML content to wrap (usually document preview HTML)
        document_type: Type of document for CSS selection
        
    Returns:
        Complete HTML document as string
    """
    css = _load_css_bundle(document_type)
    # Sanitize document type for use in CSS class name
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
    """
    Sanitize filename to prevent security issues and filesystem errors.
    
    Removes special characters and ensures proper extension.
    
    Args:
        raw: Proposed filename (may be None or contain invalid chars)
        ext: File extension (pdf or jpg)
        
    Returns:
        Safe filename with proper extension
    """
    extension = (ext or "pdf").lower().lstrip(".") or "pdf"
    candidate = (raw or f"document.{extension}").strip()
    # Keep only alphanumeric characters, hyphens, underscores, and dots
    filtered = "".join(ch for ch in candidate if ch.isalnum() or ch in {"-", "_", "."})
    if not filtered:
        filtered = f"document.{extension}"
    # Ensure proper extension
    if not filtered.lower().endswith(f".{extension}"):
        filtered = f"{filtered}.{extension}"
    return filtered


@csrf_exempt
def render_pdf(request: HttpRequest) -> HttpResponse:
    """
    Render PDF or JPEG file from provided HTML fragment.
    
    This is the main endpoint for server-side document rendering.
    The frontend sends the document HTML (from preview mode) and this
    endpoint renders it to PDF or JPEG format.
    
    RENDERING PROCESS:
    1. Validate request and parse JSON payload
    2. Extract HTML fragment and metadata
    3. Wrap HTML with CSS bundle for document type
    4. Render to PDF using WeasyPrint
    5. If JPEG requested, convert PDF -> PNG -> JPEG
    6. Return file with Content-Disposition header for download
    
    Args:
        request: Django HTTP request object
        
    Returns:
        HttpResponse with PDF or JPEG binary data
        Status 200 OK with file attachment on success
        Status 400 BAD REQUEST for invalid payload
        Status 405 METHOD NOT ALLOWED if not POST
        Status 500 INTERNAL SERVER ERROR if rendering fails
        Status 503 SERVICE UNAVAILABLE if dependencies missing
        
    Example request body:
        {
            "html": "<div class='document'>...</div>",
            "document_type": "invoice",
            "format": "pdf",
            "filename": "INV-00001.pdf"
        }
    """
    # Handle preflight CORS request
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

    # Validate HTML content
    fragment_raw = payload.get("html")
    if fragment_raw is None:
        return _cors(JsonResponse({"error": "Missing 'html' field"}, status=HTTPStatus.BAD_REQUEST))

    fragment = str(fragment_raw)
    if not fragment.strip():
        return _cors(JsonResponse({"error": "Empty HTML payload"}, status=HTTPStatus.BAD_REQUEST))

    # Extract metadata
    document_type = str(payload.get("document_type") or "document").strip().lower()
    requested_format = str(payload.get("format") or "pdf").strip().lower() or "pdf"

    # Determine output format and extension
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

    # Wrap HTML fragment in complete document with CSS
    html_document = _wrap_html(fragment, document_type)
    base_url = request.build_absolute_uri("/")
    html = HTML(string=html_document, base_url=base_url)

    # Render document
    try:
        if output_format == "pdf":
            # Direct PDF rendering
            data = html.write_pdf()
            content_type = "application/pdf"
        else:
            # JPEG rendering: PDF -> PNG -> JPEG conversion
            if Image is None:
                return _cors(JsonResponse({"error": "JPEG rendering requires Pillow to be installed"}, status=HTTPStatus.SERVICE_UNAVAILABLE))
            png_bytes = html.write_png()
            with Image.open(BytesIO(png_bytes)) as png_image:
                jpeg_buffer = BytesIO()
                # Convert to RGB (remove alpha channel) and save as JPEG
                png_image.convert("RGB").save(jpeg_buffer, format="JPEG", quality=92, optimize=True)
                data = jpeg_buffer.getvalue()
            content_type = "image/jpeg"
    except Exception:  # pragma: no cover - bubble error as JSON
        LOGGER.exception("Failed to render document for type %s (format %s)", document_type, output_format)
        return _cors(JsonResponse({"error": "Failed to render document"}, status=HTTPStatus.INTERNAL_SERVER_ERROR))

    # Return file with download headers
    response = HttpResponse(data, content_type=content_type)
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)
