import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import WaybillForm
from .models import Waybill


def _cors(response: HttpResponse) -> HttpResponse:
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def create_waybill(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    data = json.loads(request.body or "{}")
    form = WaybillForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    waybill = form.save()
    return _cors(JsonResponse({"id": waybill.pk, "waybill_number": waybill.waybill_number}, status=HTTPStatus.CREATED))


@csrf_exempt
def get_waybill(request: HttpRequest, pk: int) -> HttpResponse:
    try:
        waybill = Waybill.objects.get(pk=pk)
    except Waybill.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method == "GET":
        data = {
            "id": waybill.pk,
            "waybill_number": waybill.waybill_number,
            "customer_name": waybill.customer_name,
            "issue_date": waybill.issue_date.isoformat() if getattr(waybill, "issue_date", None) else "",
            "destination": waybill.destination,
            "driver_name": waybill.driver_name,
            "receiver_name": waybill.receiver_name,
            "items": waybill.items or [],
        }
        return _cors(JsonResponse(data))
    if request.method in {"PUT", "PATCH"}:
        data = json.loads(request.body or "{}")
        form = WaybillForm(data or None, instance=waybill)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        waybill = form.save()
        return _cors(JsonResponse({
            "id": waybill.pk,
            "waybill_number": waybill.waybill_number,
        }))
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
