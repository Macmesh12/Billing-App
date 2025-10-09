from django.db import models
from django.utils import timezone

from .services import numbering


class Receipt(models.Model):
    received_from = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=128, blank=True)
    approved_by = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def receipt_number(self) -> str:
        return numbering.format_receipt_number(self.pk)

    def __str__(self) -> str:  # pragma: no cover - display helper
        return self.receipt_number
