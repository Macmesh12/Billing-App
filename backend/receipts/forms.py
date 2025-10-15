"""
Receipt form handling for validation and data processing.

This module provides form classes for creating and updating receipt documents,
including validation and automatic receipt number assignment.
"""
from django import forms

from .models import Receipt


class ReceiptForm(forms.ModelForm):
    """
    Django ModelForm for Receipt creation and updates.
    
    Handles validation of receipt data including monetary amounts and dates.
    Automatically manages document number assignment for new receipts.
    
    Fields:
        document_number: Hidden field for pre-assigned receipt number
    """
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
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            "amount": forms.NumberInput(attrs={"step": "0.01"}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialize the form and populate document number when editing existing receipt.
        
        If the form is bound to an existing receipt instance, automatically
        populate the document_number field with the current value.
        """
        super().__init__(*args, **kwargs)
        # Pre-populate document number when editing an existing receipt
        if self.instance and self.instance.pk:
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        """
        Save the receipt instance with assigned document number.
        
        Args:
            commit: If True, save the instance to the database immediately.
                   If False, return unsaved instance for further processing.
        
        Returns:
            Receipt: The saved or unsaved Receipt instance
        """
        # Create receipt instance without committing to database yet
        instance: Receipt = super().save(commit=False)
        
        # Set document number if provided
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
            
        # Save to database if requested
        if commit:
            instance.save()
        return instance
