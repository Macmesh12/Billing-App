"""Receipt API endpoints.

This module provides REST API endpoints for receipt management including:
- Creating new receipts
- Retrieving receipt details
- Updating existing receipts

All endpoints support CORS for cross-origin requests.
"""
import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import ReceiptForm
from .models import Receipt


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
def create_receipt(request: HttpRequest) -> HttpResponse:
    """Create a new receipt via API.
    
    Accepts JSON payload with receipt data and returns the created receipt's
    ID and receipt number.
    
    Args:
        request: Django HttpRequest containing JSON body with receipt fields.
        
    Returns:
        JsonResponse with created receipt data on success (201 CREATED).
        JsonResponse with validation errors on failure (400 BAD_REQUEST).
        
    Expected JSON fields:
        - received_from: Name of the person/entity payment received from
        - issue_date: Date of receipt issuance (ISO format)
        - amount: Amount received (numeric)
        - payment_method: Method of payment (e.g., "Cash", "Check")
        - description: Description of payment
        - approved_by: Name of approver
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Validate and create receipt
    form = ReceiptForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save the receipt to database
    receipt = form.save()
    
    return _cors(JsonResponse({
        "id": receipt.pk,
        "receipt_number": receipt.receipt_number,
        "document_number": receipt.receipt_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_receipt(request: HttpRequest, pk: int) -> HttpResponse:
    """Retrieve or update a specific receipt.
    
    Supports GET to retrieve receipt details and PUT/PATCH to update.
    
    Args:
        request: Django HttpRequest object.
        pk: Primary key of the receipt to retrieve/update.
        
    Returns:
        GET: JsonResponse with receipt data (200 OK).
        PUT/PATCH: JsonResponse with updated receipt data (200 OK).
        Returns 404 NOT_FOUND if receipt doesn't exist.
        Returns 400 BAD_REQUEST if validation fails.
    """
    # Fetch the receipt from database
    try:
        receipt = Receipt.objects.get(pk=pk)
    except Receipt.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        # Serialize receipt data for response
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
        # Parse JSON request body
        data = json.loads(request.body or "{}")
        
        # Validate and update receipt
        form = ReceiptForm(data or None, instance=receipt)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        
        # Save updated receipt
        receipt = form.save()
        
        return _cors(JsonResponse({
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
            "document_number": receipt.receipt_number,
        }))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
