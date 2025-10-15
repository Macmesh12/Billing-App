"""
Waybill form handling for validation and data processing.

This module provides form classes for creating and updating waybill documents,
including validation, JSON parsing of shipped items, and automatic number assignment.
"""
import json

from django import forms

from .models import Waybill


class WaybillForm(forms.ModelForm):
    """
    Django ModelForm for Waybill creation and updates.
    
    Handles validation of waybill data and parsing of shipped items from JSON payload.
    The form automatically processes the items_payload field to store structured
    item data in the database.
    
    Fields:
        items_payload: Hidden field containing JSON string of shipped items
        document_number: Hidden field for pre-assigned waybill number
    """
    items_payload = forms.CharField(widget=forms.HiddenInput(), required=False)
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Waybill
        fields = [
            "customer_name",
            "issue_date",
            "destination",
            "driver_name",
            "receiver_name",
            "document_number",
        ]
        widgets = {
            "issue_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize the form and populate hidden fields when editing existing waybill.
        
        If the form is bound to an existing waybill instance, automatically
        populate the items_payload field with serialized item data.
        """
        super().__init__(*args, **kwargs)
        # Pre-populate items payload when editing an existing waybill
        if self.instance and self.instance.pk:
            self.fields["items_payload"].initial = json.dumps(self.instance.items or [])
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the waybill instance with parsed and validated shipped items.
        
        Args:
            commit: If True, save the instance to the database immediately.
                   If False, return unsaved instance for further processing.
        
        Returns:
            Waybill: The saved or unsaved Waybill instance
        """
        # Create waybill instance without committing to database yet
        instance: Waybill = super().save(commit=False)
        
        # Parse and attach shipped items from JSON payload
        instance.items = self._parse_items(self.cleaned_data.get("items_payload") or "[]")
        
        # Set document number if provided
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
            
        # Save to database if requested
        if commit:
            instance.save()
        return instance

    def _parse_items(self, payload: str):
        """
        Parse and sanitize JSON shipped items payload.
        
        Converts JSON string of items into a structured list of dictionaries.
        Each item contains description, quantity, unit_price, and calculated total.
        Invalid JSON or malformed items are gracefully handled.
        
        Args:
            payload: JSON string containing array of item objects
        
        Returns:
            list: List of sanitized item dictionaries with keys:
                  - description (str): Item description
                  - quantity (float): Item quantity
                  - unit_price (float): Price per unit
                  - total (float): Calculated total (quantity * unit_price)
        """
        # Attempt to parse JSON payload
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            # Return empty list if JSON is invalid
            return []
            
        # Sanitize each item to ensure consistent structure
        sanitized = []
        for item in parsed:
            # Extract and convert numeric values, defaulting to 0
            quantity = float(item.get("quantity", 0) or 0)
            unit_price = float(item.get("unit_price", 0) or 0)
            
            # Build sanitized item dictionary
            sanitized.append(
                {
                    "description": str(item.get("description", "")),
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": round(quantity * unit_price, 2),
                }
            )
        return sanitized
