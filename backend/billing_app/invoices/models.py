"""
Invoice models for managing invoice data and document numbering.

This module defines the database models for invoices and a singleton counter
for tracking document numbers across all document types (invoices, receipts, waybills).
"""
from decimal import Decimal

from django.db import models
from django.db import transaction
from django.utils import timezone

from billing_app.services.counter_store import reserve_document_number

from .services import calculator, numbering


class DocumentCounter(models.Model):
    """
    Singleton model to track document number counters across the system.
    
    This model maintains sequential counters for invoices, receipts, and waybills.
    Only one instance (pk=1) should exist in the database at any time, ensuring
    consistent and unique document numbering across the application.
    
    Attributes:
        invoice_counter: Next available invoice number
        receipt_counter: Next available receipt number
        waybill_counter: Next available waybill number
        created_at: Timestamp when counter was initialized
        updated_at: Timestamp of last counter update
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
        """
        Get or create the singleton counter instance.
        
        Returns:
            DocumentCounter: The singleton instance with pk=1
        """
        instance, created = cls.objects.get_or_create(pk=1)
        return instance
    
    @classmethod
    @transaction.atomic
    def get_next_invoice_number(cls):
        """
        Atomically get next invoice number and increment counter.
        
        Uses database transaction to ensure thread-safe counter increments
        and prevent duplicate numbers.
        
        Returns:
            str: Formatted invoice number (e.g., "INV001", "INV002")
        """
        instance = cls.get_instance()
        current = instance.invoice_counter
        instance.invoice_counter += 1
        instance.save()
        return f"INV{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_receipt_number(cls):
        """
        Atomically get next receipt number and increment counter.
        
        Uses database transaction to ensure thread-safe counter increments
        and prevent duplicate numbers.
        
        Returns:
            str: Formatted receipt number (e.g., "REC001", "REC002")
        """
        instance = cls.get_instance()
        current = instance.receipt_counter
        instance.receipt_counter += 1
        instance.save()
        return f"REC{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_waybill_number(cls):
        """
        Atomically get next waybill number and increment counter.
        
        Uses database transaction to ensure thread-safe counter increments
        and prevent duplicate numbers.
        
        Returns:
            str: Formatted waybill number (e.g., "WAY001", "WAY002")
        """
        instance = cls.get_instance()
        current = instance.waybill_counter
        instance.waybill_counter += 1
        instance.save()
        return f"WAY{current:03d}"
    
    @classmethod
    def get_current_counts(cls):
        """
        Get current document counts for all document types.
        
        Returns the count of documents already created (not the next number).
        
        Returns:
            dict: Dictionary with keys 'invoices', 'receipts', 'waybills'
                  containing the count of documents created for each type
        """
        instance = cls.get_instance()
        return {
            'invoices': instance.invoice_counter - 1,  # Current count is last used
            'receipts': instance.receipt_counter - 1,
            'waybills': instance.waybill_counter - 1,
        }
    
    def __str__(self):
        """String representation showing all counter values."""
        return f"Counters: INV={self.invoice_counter}, REC={self.receipt_counter}, WB={self.waybill_counter}"


class Invoice(models.Model):
    """
    Model representing an invoice document with line items and calculations.
    
    Invoices automatically calculate subtotals, taxes/levies, and grand totals
    based on line items. Each invoice has a unique document number that is
    automatically assigned on first save.
    
    Attributes:
        customer_name: Name of the customer receiving the invoice
        issue_date: Date the invoice was issued (defaults to today)
        classification: Optional category or classification for the invoice
        items: JSON field containing list of line items with quantities and prices
        subtotal: Calculated sum of all line items before taxes/levies
        levies: JSON field containing calculated tax/levy amounts by name
        grand_total: Final total including subtotal and all levies
        document_number: Unique invoice number (auto-assigned if not provided)
        created_at: Timestamp when invoice was created
        updated_at: Timestamp of last update
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
        ordering = ["-created_at"]

    @property
    def invoice_number(self) -> str:
        """
        Get the display-friendly invoice number.
        
        Returns document_number if set, otherwise generates a number from the pk.
        
        Returns:
            str: The invoice number for display purposes
        """
        if self.document_number:
            return self.document_number
        return numbering.format_invoice_number(self.pk)

    def recalculate(self) -> None:
        """
        Recalculate all monetary totals based on current line items.
        
        Updates subtotal, levies (taxes), and grand_total fields using
        the calculator service. Uses Decimal for precise monetary calculations.
        """
        totals = calculator.calculate_totals(self.items)
        self.subtotal = totals.subtotal
        self.levies = totals.levies
        self.grand_total = totals.grand_total

    def save(self, *args, **kwargs):
        """
        Save the invoice, auto-assigning document number and recalculating totals.
        
        On first save (when document_number is not set), automatically reserves
        and assigns a unique document number. Always recalculates monetary totals
        before saving to ensure data consistency.
        """
        # Auto-assign document number on first save
        if not self.document_number:
            self.document_number = reserve_document_number("invoice")
            
        # Recalculate totals from line items
        self.recalculate()
        
        # Call parent save method
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - simple representation
        """String representation showing invoice number."""
        return self.invoice_number
