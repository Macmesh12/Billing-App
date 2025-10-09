from decimal import Decimal
from django.db import models
from django.utils import timezone

from .services import calculator, numbering


class Invoice(models.Model):
    customer_name = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    classification = models.CharField(max_length=255, blank=True)
    items = models.JSONField(default=list, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    levies = models.JSONField(default=dict, blank=True)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def invoice_number(self) -> str:
        return numbering.format_invoice_number(self.pk)

    def recalculate(self) -> None:
        totals = calculator.calculate_totals(self.items)
        self.subtotal = totals.subtotal
        self.levies = totals.levies
        self.grand_total = totals.grand_total

    def save(self, *args, **kwargs):
        self.recalculate()
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - simple representation
        return self.invoice_number
