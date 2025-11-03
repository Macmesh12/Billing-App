"""
API endpoints for document counter management
"""
from http import HTTPStatus
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from billing_app.services.counter_store import (
    get_document_counts,
    peek_document_number,
    reserve_document_number,
)


def _cors(response: HttpResponse) -> HttpResponse:
    """Add CORS headers to response"""
    response.setdefault("Access-Control-Allow-Origin", "*")
    response.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.setdefault("Access-Control-Allow-Headers", "Content-Type")
    return response


@csrf_exempt
def get_next_invoice_number(request: HttpRequest) -> HttpResponse:
    """
    GET: Returns the next invoice number without incrementing
    POST: Returns the next invoice number and increments the counter
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        next_number = peek_document_number("invoice")
        return _cors(JsonResponse({"next_number": next_number}))
    
    elif request.method == "POST":
        next_number = reserve_document_number("invoice")
        return _cors(JsonResponse({"next_number": next_number}))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


@csrf_exempt
def get_next_receipt_number(request: HttpRequest) -> HttpResponse:
    """
    GET: Returns the next receipt number without incrementing
    POST: Returns the next receipt number and increments the counter
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        next_number = peek_document_number("receipt")
        return _cors(JsonResponse({"next_number": next_number}))
    
    elif request.method == "POST":
        next_number = reserve_document_number("receipt")
        return _cors(JsonResponse({"next_number": next_number}))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


@csrf_exempt
def get_next_waybill_number(request: HttpRequest) -> HttpResponse:
    """
    GET: Returns the next waybill number without incrementing
    POST: Returns the next waybill number and increments the counter
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        next_number = peek_document_number("waybill")
        return _cors(JsonResponse({"next_number": next_number}))
    
    elif request.method == "POST":
        next_number = reserve_document_number("waybill")
        return _cors(JsonResponse({"next_number": next_number}))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


@csrf_exempt
def get_document_counts(request: HttpRequest) -> HttpResponse:
    """
    GET: Returns current counts for all document types
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        counts = get_document_counts()
        return _cors(JsonResponse(counts))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
