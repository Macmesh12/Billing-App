"""
Invoice form module for handling invoice data validation and persistence.

This module provides the InvoiceForm class which handles:
- Validation of invoice data from user input or API
- Parsing of line items from JSON payload
- Sanitization and formatting of item data
- Saving invoices to the database
"""
import json

from django import forms

from .models import Invoice


class InvoiceForm(forms.ModelForm):
    """
    Form for creating and updating Invoice instances.
    
    This form extends Django's ModelForm to handle invoice-specific logic:
    - Line items stored as JSON in a hidden field
    - Document number handling for existing invoices
    - Item parsing and sanitization
    
    Fields:
        items_payload: Hidden field containing JSON string of line items
        document_number: Hidden field for invoice number (auto-generated if not provided)
    """
    # Hidden field to store JSON array of line items
    items_payload = forms.CharField(widget=forms.HiddenInput(), required=False)
    # Hidden field for document number
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Invoice
        fields = ["customer_name", "issue_date", "classification", "document_number"]
        widgets = {
            # Use HTML5 date input for better UX
            "issue_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize form and populate items_payload for existing invoices.
        
        When editing an existing invoice, this populates the hidden items_payload
        field with the current items as JSON.
        """
        super().__init__(*args, **kwargs)
        # If editing an existing invoice, populate items_payload
        if self.instance and self.instance.pk:
            self.fields["items_payload"].initial = json.dumps(self.instance.items or [])
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the invoice after parsing and sanitizing line items.
        
        This method:
        1. Creates the Invoice instance without saving to DB
        2. Parses items from the JSON payload
        3. Assigns document number if provided
        4. Saves to database if commit=True
        
        Args:
            commit: If True, save the instance to database immediately
            
        Returns:
            The Invoice instance (saved or unsaved based on commit parameter)
        """
        # Create instance without saving yet
        instance: Invoice = super().save(commit=False)
        # Parse and sanitize line items from JSON payload
        items = self.cleaned_data.get("items_payload") or "[]"
        instance.items = self._parse_items(items)
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
        Parse and sanitize line items from JSON string.
        
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
