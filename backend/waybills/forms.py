"""
Waybill form module for handling waybill data validation and persistence.

This module provides the WaybillForm class which handles:
- Validation of waybill data from user input or API
- Parsing of item lists from JSON payload
- Sanitization and formatting of item data
- Saving waybills to the database
"""
import json

from django import forms

from .models import Waybill


class WaybillForm(forms.ModelForm):
    """
    Form for creating and updating Waybill instances.
    
    This form extends Django's ModelForm to handle waybill-specific logic:
    - Item list stored as JSON in a hidden field
    - Document number handling for existing waybills
    - Item parsing and sanitization
    
    Fields:
        items_payload: Hidden field containing JSON string of shipped items
        document_number: Hidden field for waybill number (auto-generated if not provided)
    """
    # Hidden field to store JSON array of items
    items_payload = forms.CharField(widget=forms.HiddenInput(), required=False)
    # Hidden field for document number
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
            # Use HTML5 date input for better UX
            "issue_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize form and populate items_payload for existing waybills.
        
        When editing an existing waybill, this populates the hidden items_payload
        field with the current items as JSON.
        """
        super().__init__(*args, **kwargs)
        # If editing an existing waybill, populate items_payload
        if self.instance and self.instance.pk:
            self.fields["items_payload"].initial = json.dumps(self.instance.items or [])
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the waybill after parsing and sanitizing items.
        
        This method:
        1. Creates the Waybill instance without saving to DB
        2. Parses items from the JSON payload
        3. Assigns document number if provided
        4. Saves to database if commit=True
        
        Args:
            commit: If True, save the instance to database immediately
            
        Returns:
            The Waybill instance (saved or unsaved based on commit parameter)
        """
        # Create instance without saving yet
        instance: Waybill = super().save(commit=False)
        # Parse and sanitize items from JSON payload
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
        Parse and sanitize item list from JSON string.
        
        This method:
        1. Parses the JSON string
        2. Validates and converts quantity/price to float
        3. Calculates item total
        4. Returns sanitized list of item dictionaries
        
        Args:
            payload: JSON string containing array of item objects
            
        Returns:
            List of sanitized item dictionaries with keys:
            - description: Item description (string)
            - quantity: Item quantity (float)
            - unit_price: Price per unit (float)
            - total: Calculated total (quantity * unit_price, rounded to 2 decimals)
            
        Note:
            Returns empty list if JSON parsing fails
        """
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            # Return empty list if JSON is invalid
            return []
        
        # Sanitize and validate each item
        sanitized = []
        for item in parsed:
            # Convert to float, defaulting to 0 if missing or invalid
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
