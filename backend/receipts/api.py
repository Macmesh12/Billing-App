import json
# Import JSON module
from http import HTTPStatus
# Import HTTP status codes

from django.http import JsonResponse, HttpRequest, HttpResponse
# Import Django HTTP classes
from django.views.decorators.csrf import csrf_exempt
# Import CSRF exempt decorator

from .forms import ReceiptForm
# Import ReceiptForm
from .models import Receipt
# Import Receipt model


def _cors(response: HttpResponse) -> HttpResponse:
    # Add CORS headers
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def create_receipt(request: HttpRequest) -> HttpResponse:
    # API to create receipt
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    # Parse JSON body
    form = ReceiptForm(data or None)
    # Create form
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    receipt = form.save()
    # Save receipt
    return _cors(JsonResponse({
        "id": receipt.pk,
        "receipt_number": receipt.receipt_number,
        "document_number": receipt.receipt_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_receipt(request: HttpRequest, pk: int) -> HttpResponse:
    # API to get/update receipt
    try:
        receipt = Receipt.objects.get(pk=pk)
        # Get receipt
    except Receipt.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method == "GET":
        data = {
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
            "document_number": receipt.receipt_number,
            "received_from": receipt.received_from,
            "issue_date": receipt.issue_date.isoformat() if getattr(receipt, "issue_date", None) else "",
            "amount": float(getattr(receipt, "amount", 0)),
            "payment_method": receipt.payment_method,
            "description": receipt.description,
            "approved_by": receipt.approved_by,
        }
        return _cors(JsonResponse(data))
    if request.method in {"PUT", "PATCH"}:
        data = json.loads(request.body or "{}")
        # Parse JSON body
        form = ReceiptForm(data or None, instance=receipt)
        # Create form with instance
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        receipt = form.save()
        # Save receipt
        return _cors(JsonResponse({
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
            "document_number": receipt.receipt_number,
        }))
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
