import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .forms import InvoiceForm
from .models import Invoice
from .services.calculator import calculate_totals


def _cors(response: HttpResponse) -> HttpResponse:
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def calculate_preview(request: HttpRequest) -> HttpResponse:
    """POST JSON -> calculates totals using existing invoice logic.

    Expects JSON body with keys matching InvoiceForm + items_payload (JSON string/list).
    Returns subtotal, levies, grand_total as JSON.
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    form = InvoiceForm(data or None)
    # ensure form parsing logic runs
    form.is_valid()
    items_payload = data.get("items_payload", "[]")
    items = form._parse_items(items_payload)
    totals = calculate_totals(items)
    return _cors(JsonResponse(
        {
            "subtotal": float(totals.subtotal),
            "levies": {name: float(amount) for name, amount in totals.levies.items()},
            "grand_total": float(totals.grand_total),
        }
    ))


@csrf_exempt
def create_invoice(request: HttpRequest) -> HttpResponse:
    """Create an invoice via API. Accepts form data as JSON."""
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    form = InvoiceForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    invoice = form.save()
    return _cors(JsonResponse({"id": invoice.pk, "invoice_number": invoice.invoice_number}, status=HTTPStatus.CREATED))


@csrf_exempt
def get_invoice(request: HttpRequest, pk: int) -> HttpResponse:
    try:
        invoice = Invoice.objects.get(pk=pk)
    except Invoice.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method == "GET":
        data = {
            "id": invoice.pk,
            "invoice_number": invoice.invoice_number,
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
        form = InvoiceForm(data or None, instance=invoice)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        invoice = form.save()
        return _cors(JsonResponse({
            "id": invoice.pk,
            "invoice_number": invoice.invoice_number,
        }))
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


def get_config(request: HttpRequest) -> HttpResponse:
    data = {
        "tax_settings": settings.TAX_SETTINGS,
    }
    return _cors(JsonResponse(data))
