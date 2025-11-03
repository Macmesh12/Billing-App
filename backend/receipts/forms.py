"""
Receipt Form Module

This module provides Django ModelForm for receipt creation and editing.
Handles validation of receipt data including amounts and payment information.
"""
from django import forms

from .models import Receipt


class ReceiptForm(forms.ModelForm):
    """
    Receipt Model Form
    
    Handles receipt data validation and processing.
    Includes special handling for:
    - Custom document numbering
    - Monetary amounts with decimal precision
    - Date validation
    """
    # Hidden field for custom document number
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Receipt
        fields = [
            "received_from",      # Payer name/entity
            "issue_date",         # Date receipt was issued
            "amount",             # Amount paid
            "description",        # Payment description
            "payment_method",     # Method of payment (cash, check, etc.)
            "approved_by",        # Person who approved the receipt
            "document_number",    # Custom receipt number
        ]
        widgets = {
            # Use HTML5 date input for better UX
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            # Allow decimal amounts (e.g., 123.45)
            "amount": forms.NumberInput(attrs={"step": "0.01"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize form and populate document_number for existing instances.
        
        Args:
            *args: Positional arguments passed to parent
            **kwargs: Keyword arguments passed to parent
        """
        super().__init__(*args, **kwargs)
        
        # Pre-populate document number for editing existing receipts
        if self.instance and self.instance.pk:
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the receipt instance with custom document number.
        
        Args:
            commit: Whether to save to database immediately
            
        Returns:
            Receipt: The saved or unsaved receipt instance
        """
        # Get the instance without saving to database yet
        instance: Receipt = super().save(commit=False)
        
        # Set custom document number if provided
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
            
        # Save to database if requested
        if commit:
            instance.save()
            
        return instance
