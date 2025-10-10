import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import ReceiptForm
from .models import Receipt


def _cors(response: HttpResponse) -> HttpResponse:
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def create_receipt(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    form = ReceiptForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    receipt = form.save()
    return _cors(JsonResponse({"id": receipt.pk, "receipt_number": receipt.receipt_number}, status=HTTPStatus.CREATED))


@csrf_exempt
def get_receipt(request: HttpRequest, pk: int) -> HttpResponse:
    try:
        receipt = Receipt.objects.get(pk=pk)
    except Receipt.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method == "GET":
        data = {
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
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
        form = ReceiptForm(data or None, instance=receipt)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        receipt = form.save()
        return _cors(JsonResponse({
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
        }))
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
