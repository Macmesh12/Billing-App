from django.db import models
# Import Django models
from django.utils import timezone
# Import timezone utilities

from .services import numbering
# Import numbering service


class Receipt(models.Model):
    # Receipt model
    received_from = models.CharField(max_length=255)
    # Who the receipt is from
    issue_date = models.DateField(default=timezone.now)
    # Date of issue
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    # Amount received
    description = models.TextField(blank=True)
    # Description of receipt
    payment_method = models.CharField(max_length=128, blank=True)
    # Payment method
    approved_by = models.CharField(max_length=255, blank=True)
    # Approved by
    created_at = models.DateTimeField(auto_now_add=True)
    # Creation timestamp
    updated_at = models.DateTimeField(auto_now=True)
    # Update timestamp

    class Meta:
        # Model metadata
        ordering = ["-created_at"]
        # Order by creation date descending

    @property
    def receipt_number(self) -> str:
        # Property for formatted receipt number
        return numbering.format_receipt_number(self.pk)

    def __str__(self) -> str:  # pragma: no cover - display helper
        # String representation
        return self.receipt_number
