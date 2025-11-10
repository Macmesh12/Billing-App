"""
Document Counter Model
Stores auto-incrementing counters for invoice, receipt, and waybill numbers.
"""
from django.db import models
from django.db import transaction


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
        app_label = 'invoices'  # Explicit app label required for models outside app directory
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
        return f"INV-{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_receipt_number(cls):
        """Get the next receipt number and increment counter."""
        instance = cls.get_instance()
        current = instance.receipt_counter
        instance.receipt_counter += 1
        instance.save()
        return f"REC-{current:03d}"
    
    @classmethod
    @transaction.atomic
    def get_next_waybill_number(cls):
        """Get the next waybill number and increment counter."""
        instance = cls.get_instance()
        current = instance.waybill_counter
        instance.waybill_counter += 1
        instance.save()
        return f"WAY-{current:03d}"
    
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
        return f"Counters: INV={self.invoice_counter}, REC={self.receipt_counter}, WAY={self.waybill_counter}"
