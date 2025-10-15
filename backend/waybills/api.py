"""
Waybill API endpoints.

This module provides RESTful API endpoints for managing waybills (delivery notes).
It handles creating, retrieving, and updating waybill documents.

ENDPOINTS:
- POST /api/waybills/create/ - Create a new waybill
- GET /api/waybills/<id>/ - Retrieve a waybill
- PUT/PATCH /api/waybills/<id>/ - Update a waybill

All endpoints support CORS and are exempt from CSRF protection
for easier frontend integration.
"""
import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import WaybillForm
from .models import Waybill


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
def create_waybill(request: HttpRequest) -> HttpResponse:
    """
    Create a new waybill via API.
    
    Accepts JSON payload with waybill data and creates a new waybill record.
    The waybill number is auto-generated using the numbering service.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse with created waybill data (id, waybill_number)
        Status 201 CREATED on success
        Status 400 BAD REQUEST if validation fails
        Status 405 METHOD NOT ALLOWED if not POST
        
    Example request body:
        {
            "customer_name": "ABC Company",
            "issue_date": "2025-10-15",
            "destination": "Accra",
            "driver_name": "John Doe",
            "receiver_name": "Jane Smith",
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
    form = WaybillForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save waybill to database
    waybill = form.save()
    
    # Return created waybill data
    return _cors(JsonResponse({
        "id": waybill.pk,
        "waybill_number": waybill.waybill_number,
        "document_number": waybill.waybill_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_waybill(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Retrieve or update an existing waybill.
    
    Supports GET (retrieve), PUT/PATCH (update) methods.
    
    Args:
        request: Django HTTP request object
        pk: Primary key (ID) of the waybill to retrieve/update
        
    Returns:
        GET: JsonResponse with waybill data
        PUT/PATCH: JsonResponse with updated waybill data
        Status 404 NOT FOUND if waybill doesn't exist
        Status 400 BAD REQUEST if validation fails on update
        Status 405 METHOD NOT ALLOWED for unsupported methods
        
    Example GET response:
        {
            "id": 1,
            "waybill_number": "WAY-00001",
            "customer_name": "ABC Company",
            "issue_date": "2025-10-15",
            "destination": "Accra",
            "driver_name": "John Doe",
            "receiver_name": "Jane Smith",
            "items": [{"description": "Item 1", "quantity": 10, ...}]
        }
    """
    # Retrieve waybill from database
    try:
        waybill = Waybill.objects.get(pk=pk)
    except Waybill.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    
    # Handle preflight CORS request
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    # Handle GET request - retrieve waybill data
    if request.method == "GET":
        data = {
            "id": waybill.pk,
            "waybill_number": waybill.waybill_number,
            "document_number": waybill.waybill_number,
            "customer_name": waybill.customer_name,
            "issue_date": waybill.issue_date.isoformat() if getattr(waybill, "issue_date", None) else "",
            "destination": waybill.destination,
            "driver_name": waybill.driver_name,
            "receiver_name": waybill.receiver_name,
            "items": waybill.items or [],
        }
        return _cors(JsonResponse(data))
    
    # Handle PUT/PATCH request - update waybill
    if request.method in {"PUT", "PATCH"}:
        # Parse JSON request body
        data = json.loads(request.body or "{}")
        
        # Validate data using Django form with existing instance
        form = WaybillForm(data or None, instance=waybill)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        
        # Save updated waybill to database
        waybill = form.save()
        
        # Return updated waybill data
        return _cors(JsonResponse({
            "id": waybill.pk,
            "waybill_number": waybill.waybill_number,
            "document_number": waybill.waybill_number,
        }))
    
    # Unsupported HTTP method
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
