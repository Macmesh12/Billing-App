"""
Waybill Form Module

This module provides Django ModelForm for waybill creation and editing.
Handles JSON parsing of shipped items and validation of waybill data.
"""
import json

from django import forms

from .models import Waybill


class WaybillForm(forms.ModelForm):
    """
    Waybill Model Form
    
    Handles waybill data validation and processing.
    Includes special handling for:
    - Shipped items stored as JSON
    - Custom document numbering
    - Delivery information validation
    """
    # Hidden field for JSON-encoded shipped items
    items_payload = forms.CharField(widget=forms.HiddenInput(), required=False)
    
    # Hidden field for custom document number
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Waybill
        fields = [
            "customer_name",      # Customer/shipper name
            "issue_date",         # Date waybill was issued
            "destination",        # Delivery destination
            "driver_name",        # Name of driver
            "receiver_name",      # Name of person receiving goods
            "document_number",    # Custom waybill number
        ]
        widgets = {
            # Use HTML5 date input for better UX
            "issue_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize form and populate items_payload for existing instances.
        
        Args:
            *args: Positional arguments passed to parent
            **kwargs: Keyword arguments passed to parent
        """
        super().__init__(*args, **kwargs)
        
        # Pre-populate items and document number for editing existing waybills
        if self.instance and self.instance.pk:
            self.fields["items_payload"].initial = json.dumps(self.instance.items or [])
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the waybill instance with parsed shipped items.
        
        Args:
            commit: Whether to save to database immediately
            
        Returns:
            Waybill: The saved or unsaved waybill instance
        """
        # Get the instance without saving to database yet
        instance: Waybill = super().save(commit=False)
        
        # Parse and sanitize shipped items from JSON payload
        instance.items = self._parse_items(self.cleaned_data.get("items_payload") or "[]")
        
        # Set custom document number if provided
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
            
        # Save to database if requested
        if commit:
            instance.save()
            
        return instance

    def _parse_items(self, payload: str):
        """
        Parse and sanitize shipped items from JSON string.
        
        Each item should contain:
        - description: Text description of the item
        - quantity: Number of units
        - unit_price: Price per unit (optional for waybills)
        - total: Calculated as quantity * unit_price
        
        Args:
            payload: JSON string containing array of items
            
        Returns:
            list: Sanitized list of item dictionaries
        """
        # Try to parse JSON, return empty list on failure
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            return []
            
        # Sanitize and validate each item
        sanitized = []
        for item in parsed:
            # Convert to float, defaulting to 0
            quantity = float(item.get("quantity", 0) or 0)
            unit_price = float(item.get("unit_price", 0) or 0)
            
            # Build sanitized item with calculated total
            sanitized.append(
                {
                    "description": str(item.get("description", "")),
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": round(quantity * unit_price, 2),
                }
            )
        return sanitized
