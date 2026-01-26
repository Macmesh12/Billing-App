"""
Document Counter Model
Stores auto-incrementing counters for invoice, receipt, and waybill numbers.
"""
from django.db import models
from django.db import transaction
import secrets
import string


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
        # Generate SPQ + 2 uppercase letters + 4 digits
        letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(2))
        digits = ''.join(secrets.choice(string.digits) for _ in range(4))
        return f"SPQ{letters}{digits}"
    
    @classmethod
    @transaction.atomic
    def get_next_receipt_number(cls):
        """Get the next receipt number and increment counter."""
        instance = cls.get_instance()
        current = instance.receipt_counter
        instance.receipt_counter += 1
        instance.save()
        letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(2))
        digits = ''.join(secrets.choice(string.digits) for _ in range(4))
        return f"SPQ{letters}{digits}"
    
    @classmethod
    @transaction.atomic
    def get_next_waybill_number(cls):
        """Get the next waybill number and increment counter."""
        instance = cls.get_instance()
        current = instance.waybill_counter
        instance.waybill_counter += 1
        instance.save()
        letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(2))
        digits = ''.join(secrets.choice(string.digits) for _ in range(4))
        return f"SPQ{letters}{digits}"
    
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
        return f"Counters: invoice={self.invoice_counter}, receipt={self.receipt_counter}, waybill={self.waybill_counter}"
