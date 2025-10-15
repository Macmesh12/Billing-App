"""
Receipt form module for handling receipt data validation and persistence.

This module provides the ReceiptForm class which handles:
- Validation of receipt data from user input or API
- Formatting of monetary amounts
- Document number handling for existing receipts
- Saving receipts to the database
"""
from django import forms

from .models import Receipt


class ReceiptForm(forms.ModelForm):
    """
    Form for creating and updating Receipt instances.
    
    This form extends Django's ModelForm to handle receipt-specific logic:
    - Document number handling for existing receipts
    - Proper date and number input widgets
    - Amount validation with decimal precision
    
    Fields:
        document_number: Hidden field for receipt number (auto-generated if not provided)
    """
    # Hidden field for document number
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Receipt
        fields = [
            "received_from",
            "issue_date",
            "amount",
            "description",
            "payment_method",
            "approved_by",
            "document_number",
        ]
        widgets = {
            # Use HTML5 date input for better UX
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            # Allow decimal amounts with 2 decimal places
            "amount": forms.NumberInput(attrs={"step": "0.01"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize form and populate document_number for existing receipts.
        
        When editing an existing receipt, this populates the hidden document_number
        field with the current number.
        """
        super().__init__(*args, **kwargs)
        # If editing an existing receipt, populate document_number
        if self.instance and self.instance.pk:
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the receipt after validation.
        
        This method:
        1. Creates the Receipt instance without saving to DB
        2. Assigns document number if provided
        3. Saves to database if commit=True
        
        Args:
            commit: If True, save the instance to database immediately
            
        Returns:
            The Receipt instance (saved or unsaved based on commit parameter)
        """
        # Create instance without saving yet
        instance: Receipt = super().save(commit=False)
        # Set document number if provided
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
        # Save to database if requested
        if commit:
            instance.save()
        return instance
