"""
Receipt API endpoints.

This module provides RESTful API endpoints for managing receipts.
It handles creating, retrieving, and updating receipt documents.

ENDPOINTS:
- POST /api/receipts/create/ - Create a new receipt
- GET /api/receipts/<id>/ - Retrieve a receipt
- PUT/PATCH /api/receipts/<id>/ - Update a receipt

All endpoints support CORS and are exempt from CSRF protection
for easier frontend integration.
"""
import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import ReceiptForm
from .models import Receipt


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
def create_receipt(request: HttpRequest) -> HttpResponse:
    """
    Create a new receipt via API.
    
    Accepts JSON payload with receipt data and creates a new receipt record.
    The receipt number is auto-generated using the numbering service.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse with created receipt data (id, receipt_number)
        Status 201 CREATED on success
        Status 400 BAD REQUEST if validation fails
        Status 405 METHOD NOT ALLOWED if not POST
        
    Example request body:
        {
            "received_from": "John Doe",
            "customer_name": "ABC Company",
            "issue_date": "2025-10-15",
            "amount_paid": "1500.00",
            "payment_method": "Cash",
            "items_payload": "[{...}]"
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
    form = ReceiptForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save receipt to database
    receipt = form.save()
    
    # Return created receipt data
    return _cors(JsonResponse({
        "id": receipt.pk,
        "receipt_number": receipt.receipt_number,
        "document_number": receipt.receipt_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_receipt(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Retrieve or update an existing receipt.
    
    Supports GET (retrieve), PUT/PATCH (update) methods.
    
    Args:
        request: Django HTTP request object
        pk: Primary key (ID) of the receipt to retrieve/update
        
    Returns:
        GET: JsonResponse with receipt data
        PUT/PATCH: JsonResponse with updated receipt data
        Status 404 NOT FOUND if receipt doesn't exist
        Status 400 BAD REQUEST if validation fails on update
        Status 405 METHOD NOT ALLOWED for unsupported methods
        
    Example GET response:
        {
            "id": 1,
            "receipt_number": "REC-00001",
            "received_from": "John Doe",
            "issue_date": "2025-10-15",
            "amount": 1500.00,
            "payment_method": "Cash",
            "description": "Payment for services",
            "approved_by": "Jane Smith"
        }
    """
    # Retrieve receipt from database
    try:
        receipt = Receipt.objects.get(pk=pk)
    except Receipt.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    
    # Handle preflight CORS request
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    # Handle GET request - retrieve receipt data
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
    
    # Handle PUT/PATCH request - update receipt
    if request.method in {"PUT", "PATCH"}:
        # Parse JSON request body
        data = json.loads(request.body or "{}")
        
        # Validate data using Django form with existing instance
        form = ReceiptForm(data or None, instance=receipt)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        
        # Save updated receipt to database
        receipt = form.save()
        
        # Return updated receipt data
        return _cors(JsonResponse({
            "id": receipt.pk,
            "receipt_number": receipt.receipt_number,
            "document_number": receipt.receipt_number,
        }))
    
    # Unsupported HTTP method
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
