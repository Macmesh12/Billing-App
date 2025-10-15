"""Invoice API endpoints.

This module provides REST API endpoints for invoice management including:
- Calculating invoice totals with taxes and levies
- Creating new invoices
- Retrieving invoice details
- Updating existing invoices
- Getting tax configuration

All endpoints support CORS for cross-origin requests.
"""
import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .forms import InvoiceForm
from .models import Invoice
from .services.calculator import calculate_totals


def _cors(response: HttpResponse) -> HttpResponse:
    """Attach CORS headers to the response.
    
    Args:
        response: Django HttpResponse object to modify.
        
    Returns:
        The response object with CORS headers added.
    """
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def calculate_preview(request: HttpRequest) -> HttpResponse:
    """Calculate invoice totals including taxes and levies.
    
    This endpoint is used for real-time preview calculations in the UI
    before saving an invoice. It applies the same calculation logic as
    a saved invoice.
    
    Args:
        request: Django HttpRequest containing JSON body with invoice data.
        
    Returns:
        JsonResponse with calculated subtotal, levies breakdown, and grand_total.
        
    Expected JSON fields:
        - items_payload: JSON string or array of line items
        - Each item should have: description, quantity, unit_price
        
    Response format:
        {
            "subtotal": float,
            "levies": {"NHIL": float, "GETFund Levy": float, ...},
            "grand_total": float
        }
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Create form instance to leverage parsing logic
    form = InvoiceForm(data or None)
    # Run validation to trigger parsing (errors are not critical here)
    form.is_valid()
    
    # Extract and parse line items
    items_payload = data.get("items_payload", "[]")
    items = form._parse_items(items_payload)
    
    # Calculate totals with taxes and levies
    totals = calculate_totals(items)
    
    return _cors(JsonResponse({
        "subtotal": float(totals.subtotal),
        "levies": {name: float(amount) for name, amount in totals.levies.items()},
        "grand_total": float(totals.grand_total),
    }))


@csrf_exempt
def create_invoice(request: HttpRequest) -> HttpResponse:
    """Create a new invoice via API.
    
    Accepts JSON payload with invoice data and returns the created invoice's
    ID and invoice number.
    
    Args:
        request: Django HttpRequest containing JSON body with invoice fields.
        
    Returns:
        JsonResponse with created invoice data on success (201 CREATED).
        JsonResponse with validation errors on failure (400 BAD_REQUEST).
        
    Expected JSON fields:
        - customer_name: Name of the customer/client
        - classification: Invoice classification/category
        - issue_date: Date of invoice issuance (ISO format)
        - items_payload: JSON string or array of line items
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Validate and create invoice
    form = InvoiceForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save the invoice to database
    invoice = form.save()
    
    return _cors(JsonResponse({
        "id": invoice.pk,
        "invoice_number": invoice.invoice_number,
        "document_number": invoice.invoice_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_invoice(request: HttpRequest, pk: int) -> HttpResponse:
    """Retrieve or update a specific invoice.
    
    Supports GET to retrieve invoice details and PUT/PATCH to update.
    
    Args:
        request: Django HttpRequest object.
        pk: Primary key of the invoice to retrieve/update.
        
    Returns:
        GET: JsonResponse with invoice data including calculated totals (200 OK).
        PUT/PATCH: JsonResponse with updated invoice data (200 OK).
        Returns 404 NOT_FOUND if invoice doesn't exist.
        Returns 400 BAD_REQUEST if validation fails.
    """
    # Fetch the invoice from database
    try:
        invoice = Invoice.objects.get(pk=pk)
    except Invoice.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        # Serialize invoice data for response including calculated fields
        data = {
            "id": invoice.pk,
            "invoice_number": invoice.invoice_number,
            "document_number": invoice.invoice_number,
            "customer_name": invoice.customer_name,
            "classification": invoice.classification,
            "issue_date": invoice.issue_date.isoformat() if getattr(invoice, "issue_date", None) else "",
            "items": invoice.items or [],
            "subtotal": float(getattr(invoice, "subtotal", 0)),
            "levies": {k: float(v) for k, v in (invoice.levies or {}).items()},
            "grand_total": float(getattr(invoice, "grand_total", 0)),
        }
        return _cors(JsonResponse(data))
    
    if request.method in {"PUT", "PATCH"}:
        # Parse JSON request body
        data = json.loads(request.body or "{}")
        
        # Validate and update invoice
        form = InvoiceForm(data or None, instance=invoice)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        
        # Save updated invoice
        invoice = form.save()
        
        return _cors(JsonResponse({
            "id": invoice.pk,
            "invoice_number": invoice.invoice_number,
            "document_number": invoice.invoice_number,
        }))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


def get_config(request: HttpRequest) -> HttpResponse:
    """Get application configuration settings.
    
    Returns tax settings and other configuration values needed by the frontend
    for invoice calculations.
    
    Args:
        request: Django HttpRequest object.
        
    Returns:
        JsonResponse with configuration data including TAX_SETTINGS.
        
    Response format:
        {
            "tax_settings": {
                "NHIL": 0.025,
                "GETFund Levy": 0.025,
                "COVID": 0.01,
                "VAT": 0.15
            }
        }
    """
    data = {
        "tax_settings": settings.TAX_SETTINGS,
    }
    return _cors(JsonResponse(data))
