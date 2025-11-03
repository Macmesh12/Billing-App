"""
Invoice API endpoints.

This module provides RESTful API endpoints for managing invoices.
It handles creating, retrieving, updating invoices, and calculating preview totals.

ENDPOINTS:
- POST /api/invoices/calculate/ - Calculate invoice totals for preview
- POST /api/invoices/create/ - Create a new invoice
- GET /api/invoices/<id>/ - Retrieve an invoice
- PUT/PATCH /api/invoices/<id>/ - Update an invoice

All endpoints support CORS and are exempt from CSRF protection
for easier frontend integration.
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
    """
    Add CORS headers to HTTP response.
    
    Allows cross-origin requests from any domain with GET, POST, and OPTIONS methods.
    This is necessary for the Electron frontend to communicate with the Django backend.
    
    Args:
        response: Django HTTP response object
        
    Returns:
        Modified response with CORS headers
    """
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def calculate_preview(request: HttpRequest) -> HttpResponse:
    """
    Calculate invoice totals for preview without saving.
    
    This endpoint accepts invoice line items and calculates subtotal, levies (taxes),
    and grand total using the same logic as the main invoice form. Used by the
    frontend to show real-time calculations as the user enters data.
    
    Tax configuration is read from settings.TAX_SETTINGS which defines:
    - NHIL: National Health Insurance Levy
    - GETFUND: Ghana Education Trust Fund levy
    - COVID: COVID-19 levy
    - VAT: Value Added Tax
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse with calculated totals:
        {
            "subtotal": float,
            "levies": {"NHIL": float, "GETFUND": float, ...},
            "grand_total": float
        }
        Status 200 OK on success
        Status 405 METHOD NOT ALLOWED if not POST
        
    Example request body:
        {
            "items_payload": "[{\"description\": \"Item 1\", \"quantity\": 2, \"unit_price\": 100}]"
        }
    """
    # Handle preflight CORS request
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    # Only accept POST requests
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Create form instance to use its parsing logic
    form = InvoiceForm(data or None)
    # Run validation to ensure form parsing logic executes
    form.is_valid()
    
    # Extract and parse line items
    items_payload = data.get("items_payload", "[]")
    items = form._parse_items(items_payload)
    
    # Calculate totals using calculator service
    totals = calculate_totals(items)
    
    # Return calculated values as JSON
    return _cors(JsonResponse(
        {
            "subtotal": float(totals.subtotal),
            "levies": {name: float(amount) for name, amount in totals.levies.items()},
            "grand_total": float(totals.grand_total),
        }
    ))


@csrf_exempt
def create_invoice(request: HttpRequest) -> HttpResponse:
    """
    Create a new invoice via API.
    
    Accepts JSON payload with invoice data and creates a new invoice record.
    The invoice number is auto-generated using the numbering service.
    Line items are parsed from items_payload and totals are calculated automatically.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse with created invoice data (id, invoice_number)
        Status 201 CREATED on success
        Status 400 BAD REQUEST if validation fails
        Status 405 METHOD NOT ALLOWED if not POST
        
    Example request body:
        {
            "customer_name": "ABC Company",
            "issue_date": "2025-10-15",
            "items_payload": "[{\"description\": \"Item 1\", \"quantity\": 2, \"unit_price\": 100}]",
            "notes": "Payment terms: Net 30"
        }
    """
    # Handle preflight CORS request
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    # Only accept POST requests
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Validate data using Django form
    form = InvoiceForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save invoice to database
    invoice = form.save()
    
    # Return created invoice data
    return _cors(JsonResponse({
        "id": invoice.pk,
        "invoice_number": invoice.invoice_number,
        "document_number": invoice.invoice_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_invoice(request: HttpRequest, pk: int) -> HttpResponse:
    # API endpoint to get/update invoice
    try:
        invoice = Invoice.objects.get(pk=pk)
        # Get invoice by pk
    except Invoice.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method == "GET":
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
        data = json.loads(request.body or "{}")
        # Parse JSON body
        form = InvoiceForm(data or None, instance=invoice)
        # Create form instance with instance
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        invoice = form.save()
        # Save invoice
        return _cors(JsonResponse({
            "id": invoice.pk,
            "invoice_number": invoice.invoice_number,
            "document_number": invoice.invoice_number,
        }))
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


def get_config(request: HttpRequest) -> HttpResponse:
    # API endpoint to get config
    data = {
        "tax_settings": settings.TAX_SETTINGS,
    }
    return _cors(JsonResponse(data))
