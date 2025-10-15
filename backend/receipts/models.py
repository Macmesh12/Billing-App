"""
Receipt models module.

This module defines the Receipt model for tracking payment receipts.
Receipts document payments received from customers and can be exported as PDFs.

All receipt numbers are automatically generated and tracked to ensure uniqueness.
"""
from django.db import models
from django.utils import timezone

from billing_app.services.counter_store import reserve_document_number

from .services import numbering


class Receipt(models.Model):
    """
    Receipt model representing a payment receipt document.
    
    This model stores receipt data including:
    - Payer information
    - Payment amount and method
    - Description of what the payment is for
    - Approval information
    - Unique document number
    
    The model automatically:
    - Generates unique receipt numbers on creation
    - Tracks creation and modification timestamps
    
    Fields:
        received_from: Name of the person/entity making the payment
        issue_date: Date the receipt was issued
        amount: Payment amount received (Decimal for precision)
        description: Optional description of the payment/transaction
        payment_method: Method of payment (cash, check, card, etc.)
        approved_by: Name of person who approved/received the payment
        document_number: Unique receipt number (e.g., "REC-001")
        created_at: Timestamp when receipt was created
        updated_at: Timestamp when receipt was last modified
    """
    received_from = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=128, blank=True)
    approved_by = models.CharField(max_length=255, blank=True)
    document_number = models.CharField(max_length=32, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]  # Show newest receipts first

    @property
    def receipt_number(self) -> str:
        """
        Get the receipt number for display.
        
        Returns:
            document_number if set, otherwise formatted number based on pk
        """
        if self.document_number:
            return self.document_number
        return numbering.format_receipt_number(self.pk)

    def save(self, *args, **kwargs):
        """
        Save the receipt with automatic number generation.
        
        Before saving:
        - Generates document_number if not already set
        
        This ensures receipts always have valid, unique numbers.
        """
        # Generate document number if not already set
        if not self.document_number:
            self.document_number = reserve_document_number("receipt")
        # Save to database
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - display helper
        """Return the receipt number as string representation."""
        return self.receipt_number
