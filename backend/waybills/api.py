"""Waybill API endpoints.

This module provides REST API endpoints for waybill management including:
- Creating new waybills
- Retrieving waybill details
- Updating existing waybills

All endpoints support CORS for cross-origin requests.
"""
import json
from http import HTTPStatus

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .forms import WaybillForm
from .models import Waybill


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
def create_waybill(request: HttpRequest) -> HttpResponse:
    """Create a new waybill via API.
    
    Accepts JSON payload with waybill data and returns the created waybill's
    ID and waybill number.
    
    Args:
        request: Django HttpRequest containing JSON body with waybill fields.
        
    Returns:
        JsonResponse with created waybill data on success (201 CREATED).
        JsonResponse with validation errors on failure (400 BAD_REQUEST).
        
    Expected JSON fields:
        - customer_name: Name of the customer/recipient
        - issue_date: Date of waybill issuance (ISO format)
        - destination: Delivery destination address
        - driver_name: Name of the driver
        - receiver_name: Name of the receiver
        - items: JSON array of items being shipped
    """
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    if request.method != "POST":
        return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
    
    # Parse JSON request body
    data = json.loads(request.body or "{}")
    
    # Validate and create waybill
    form = WaybillForm(data or None)
    if not form.is_valid():
        return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
    
    # Save the waybill to database
    waybill = form.save()
    
    return _cors(JsonResponse({
        "id": waybill.pk,
        "waybill_number": waybill.waybill_number,
        "document_number": waybill.waybill_number,
    }, status=HTTPStatus.CREATED))


@csrf_exempt
def get_waybill(request: HttpRequest, pk: int) -> HttpResponse:
    """Retrieve or update a specific waybill.
    
    Supports GET to retrieve waybill details and PUT/PATCH to update.
    
    Args:
        request: Django HttpRequest object.
        pk: Primary key of the waybill to retrieve/update.
        
    Returns:
        GET: JsonResponse with waybill data (200 OK).
        PUT/PATCH: JsonResponse with updated waybill data (200 OK).
        Returns 404 NOT_FOUND if waybill doesn't exist.
        Returns 400 BAD_REQUEST if validation fails.
    """
    # Fetch the waybill from database
    try:
        waybill = Waybill.objects.get(pk=pk)
    except Waybill.DoesNotExist:
        return _cors(HttpResponse(status=HTTPStatus.NOT_FOUND))
    
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))
    
    if request.method == "GET":
        # Serialize waybill data for response
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
    
    if request.method in {"PUT", "PATCH"}:
        # Parse JSON request body
        data = json.loads(request.body or "{}")
        
        # Validate and update waybill
        form = WaybillForm(data or None, instance=waybill)
        if not form.is_valid():
            return _cors(JsonResponse({"errors": form.errors}, status=HTTPStatus.BAD_REQUEST))
        
        # Save updated waybill
        waybill = form.save()
        
        return _cors(JsonResponse({
            "id": waybill.pk,
            "waybill_number": waybill.waybill_number,
            "document_number": waybill.waybill_number,
        }))
    
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))
