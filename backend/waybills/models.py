"""
Waybill models module.

This module defines the Waybill model for tracking shipment documents.
Waybills document goods being transported and include shipment details,
driver information, and item lists.

All waybill numbers are automatically generated and tracked to ensure uniqueness.
"""
from django.db import models
from django.utils import timezone

from billing_app.services.counter_store import reserve_document_number

from .services import numbering


class Waybill(models.Model):
    """
    Waybill model representing a shipment document.
    
    This model stores waybill data including:
    - Customer and destination information
    - Driver and receiver details
    - List of items being shipped
    - Unique document number
    
    The model automatically:
    - Generates unique waybill numbers on creation
    - Tracks creation and modification timestamps
    
    Fields:
        customer_name: Name of the customer/sender
        issue_date: Date the waybill was issued
        destination: Destination address for the shipment
        driver_name: Name of the driver transporting the goods
        receiver_name: Name of the person receiving the shipment
        items: JSON array of shipped items with descriptions and quantities
        document_number: Unique waybill number (e.g., "WAY-001")
        created_at: Timestamp when waybill was created
        updated_at: Timestamp when waybill was last modified
    """
    customer_name = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    destination = models.CharField(max_length=255)
    driver_name = models.CharField(max_length=255, blank=True)
    receiver_name = models.CharField(max_length=255, blank=True)
    items = models.JSONField(default=list, blank=True)
    document_number = models.CharField(max_length=32, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]  # Show newest waybills first

    @property
    def waybill_number(self) -> str:
        """
        Get the waybill number for display.
        
        Returns:
            document_number if set, otherwise formatted number based on pk
        """
        if self.document_number:
            return self.document_number
        return numbering.format_waybill_number(self.pk)

    def save(self, *args, **kwargs):
        """
        Save the waybill with automatic number generation.
        
        Before saving:
        - Generates document_number if not already set
        
        This ensures waybills always have valid, unique numbers.
        """
        # Generate document number if not already set
        if not self.document_number:
            self.document_number = reserve_document_number("waybill")
        # Save to database
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - display helper
        """Return the waybill number as string representation."""
        return self.waybill_number
