import json
# Import JSON module for parsing/serializing
from http import HTTPStatus
# Import HTTP status codes

from django.http import JsonResponse, HttpRequest, HttpResponse
# Import Django HTTP response classes
from django.views.decorators.csrf import csrf_exempt
# Import CSRF exempt decorator
from django.conf import settings
# Import Django settings

from .forms import InvoiceForm
# Import InvoiceForm
from .models import Invoice
# Import Invoice model
from .services.calculator import calculate_totals
# Import calculate_totals function


def _cors(response: HttpResponse) -> HttpResponse:
    # Add CORS headers to response
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def calculate_preview(request: HttpRequest) -> HttpResponse:
    # API endpoint to calculate preview totals
    """POST JSON -> calculates totals using existing invoice logic.

    Expects JSON body with keys matching InvoiceForm + items_payload (JSON string/list).
    Returns subtotal, levies, grand_total as JSON.
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    # Parse JSON body
    form = InvoiceForm(data or None)
    # Create form instance
    # ensure form parsing logic runs
    form.is_valid()
    items_payload = data.get("items_payload", "[]")
    # Get items payload
    items = form._parse_items(items_payload)
    # Parse items
    totals = calculate_totals(items)
    # Calculate totals
    return _cors(JsonResponse(
        {
            "subtotal": float(totals.subtotal),
            "levies": {name: float(amount) for name, amount in totals.levies.items()},
            "grand_total": float(totals.grand_total),
        }
    ))


@csrf_exempt
def create_invoice(request: HttpRequest) -> HttpResponse:
    # API endpoint to create invoice
    """Create an invoice via API. Accepts form data as JSON."""
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    # Parse JSON body
    form = InvoiceForm(data or None)
    # Create form instance
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    invoice = form.save()
    # Save invoice
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
