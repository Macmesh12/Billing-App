"""
Invoice models module.

This module defines database models for:
- DocumentCounter: Singleton model for tracking document numbers across all types
- Invoice: Main invoice model with line items, totals, and automatic numbering

All monetary values use Decimal for precision.
Document numbers are automatically generated and tracked.
"""
from decimal import Decimal

from django.db import models
from django.db import transaction
from django.utils import timezone

from billing_app.services.counter_store import reserve_document_number

from .services import calculator, numbering


class DocumentCounter(models.Model):
    """
    Singleton model to track document number counters.
    Only one instance should exist in the database.
    """
    invoice_counter = models.IntegerField(default=1)
    receipt_counter = models.IntegerField(default=1)
    waybill_counter = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Document Counter"
        verbose_name_plural = "Document Counters"
    
    @classmethod
    def get_instance(cls):
        """Get or create the singleton counter instance."""
        instance, created = cls.objects.get_or_create(pk=1)
        return instance
    
    @classmethod
    @transaction.atomic
    def get_next_invoice_number(cls):
        """Get the next invoice number and increment counter."""
        instance = cls.get_instance()
        current = instance.invoice_counter
        instance.invoice_counter += 1
        instance.save()
        return f"INV{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_receipt_number(cls):
        """Get the next receipt number and increment counter."""
        instance = cls.get_instance()
        current = instance.receipt_counter
        instance.receipt_counter += 1
        instance.save()
        return f"REC{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_waybill_number(cls):
        """Get the next waybill number and increment counter."""
        instance = cls.get_instance()
        current = instance.waybill_counter
        instance.waybill_counter += 1
        instance.save()
        return f"WAY{current:03d}"
    
    @classmethod
    def get_current_counts(cls):
        """Get current counts for all document types."""
        instance = cls.get_instance()
        return {
            'invoices': instance.invoice_counter - 1,  # Current count is last used
            'receipts': instance.receipt_counter - 1,
            'waybills': instance.waybill_counter - 1,
        }
    
    def __str__(self):
        return f"Counters: INV={self.invoice_counter}, REC={self.receipt_counter}, WB={self.waybill_counter}"


class Invoice(models.Model):
    """
    Invoice model representing a billing document.
    
    This model stores invoice data including:
    - Customer information
    - Line items (stored as JSON array)
    - Calculated totals (subtotal, levies, grand total)
    - Document number (auto-generated if not provided)
    
    The model automatically:
    - Generates unique document numbers on creation
    - Recalculates totals before saving
    - Applies configured tax/levy rates
    
    Fields:
        customer_name: Name of the customer being billed
        issue_date: Date the invoice was issued
        classification: Optional classification/category
        items: JSON array of line items with quantity, unit_price, etc.
        subtotal: Sum of all line item totals
        levies: JSON object mapping levy names to amounts
        grand_total: Final total including subtotal and all levies
        document_number: Unique invoice number (e.g., "INV001")
        created_at: Timestamp when invoice was created
        updated_at: Timestamp when invoice was last modified
    """
    customer_name = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    classification = models.CharField(max_length=255, blank=True)
    items = models.JSONField(default=list, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    levies = models.JSONField(default=dict, blank=True)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    document_number = models.CharField(max_length=32, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]  # Show newest invoices first

    @property
    def invoice_number(self) -> str:
        """
        Get the invoice number for display.
        
        Returns:
            document_number if set, otherwise formatted number based on pk
        """
        if self.document_number:
            return self.document_number
        return numbering.format_invoice_number(self.pk)

    def recalculate(self) -> None:
        """
        Recalculate and update invoice totals based on line items.
        
        This method:
        1. Calculates subtotal from items
        2. Applies configured tax/levy rates
        3. Updates subtotal, levies, and grand_total fields
        
        Note:
            Does not save the instance - call save() separately
        """
        totals = calculator.calculate_totals(self.items)
        self.subtotal = totals.subtotal
        self.levies = totals.levies
        self.grand_total = totals.grand_total

    def save(self, *args, **kwargs):
        """
        Save the invoice with automatic number generation and total calculation.
        
        Before saving:
        - Generates document_number if not already set
        - Recalculates all totals based on current items
        
        This ensures invoices always have valid numbers and correct totals.
        """
        # Generate document number if not already set
        if not self.document_number:
            self.document_number = reserve_document_number("invoice")
        # Recalculate totals before saving
        self.recalculate()
        # Save to database
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - simple representation
        """Return the invoice number as string representation."""
        return self.invoice_number
