"""
PDF and JPEG rendering API endpoints.

This module provides endpoints for converting HTML documents to PDF or JPEG format.
It uses WeasyPrint for PDF generation and pdf2image (with poppler-utils) for JPEG conversion.

Dependencies:
    - weasyprint: Converts HTML/CSS to PDF
    - pdf2image: Converts PDF pages to images (requires poppler-utils system package)
    - Pillow (PIL): Image processing for JPEG optimization
    
System Requirements:
    - For JPEG export: poppler-utils must be installed
      Ubuntu/Debian: sudo apt-get install poppler-utils
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
    from pdf2image import convert_from_bytes
except ImportError:  # pragma: no cover - optional dependency
    Image = None
    convert_from_bytes = None

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
    requested_format = str(payload.get("format") or "pdf").strip().lower() or "pdf"

    if requested_format in {"jpg", "jpeg"}:
        output_format = "jpeg"
        extension = "jpg"
    elif requested_format == "pdf":
        output_format = "pdf"
        extension = "pdf"
    else:
        return _cors(JsonResponse({"error": "Unsupported format requested"}, status=HTTPStatus.BAD_REQUEST))

    filename = _safe_filename(payload.get("filename"), ext=extension)

    html_document = _wrap_html(fragment, document_type)
    base_url = request.build_absolute_uri("/")
    html = HTML(string=html_document, base_url=base_url)

    try:
        if output_format == "pdf":
            # Direct PDF rendering using WeasyPrint
            # This converts the HTML+CSS into a PDF document
            data = html.write_pdf()
            content_type = "application/pdf"
        else:
            # JPEG rendering: Multi-step process required
            # WeasyPrint v66+ removed write_png(), so we now:
            # 1. Render to PDF first
            # 2. Convert PDF to image using pdf2image (requires poppler-utils)
            # 3. Convert image to JPEG with optimization
            
            if Image is None or convert_from_bytes is None:
                return _cors(JsonResponse({"error": "JPEG rendering requires Pillow and pdf2image to be installed"}, status=HTTPStatus.SERVICE_UNAVAILABLE))
            
            # Step 1: Generate PDF from HTML
            pdf_bytes = html.write_pdf()
            
            # Step 2: Convert PDF pages to PIL Image objects
            # DPI=150 provides good quality while keeping file size reasonable
            images = convert_from_bytes(pdf_bytes, dpi=150)
            
            if not images:
                raise ValueError("No images generated from PDF")
            
            # Step 3: Convert first page to JPEG format
            # - Convert to RGB mode (JPEG doesn't support transparency)
            # - Quality 92 balances visual quality with file size
            # - Optimize flag enables additional compression
            jpeg_buffer = BytesIO()
            images[0].convert("RGB").save(jpeg_buffer, format="JPEG", quality=92, optimize=True)
            data = jpeg_buffer.getvalue()
            content_type = "image/jpeg"
    except Exception:  # pragma: no cover - bubble error as JSON
        LOGGER.exception("Failed to render document for type %s (format %s)", document_type, output_format)
        return _cors(JsonResponse({"error": "Failed to render document"}, status=HTTPStatus.INTERNAL_SERVER_ERROR))

    response = HttpResponse(data, content_type=content_type)
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)
