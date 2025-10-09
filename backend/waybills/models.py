from django.db import models
from django.utils import timezone

from .services import numbering


class Waybill(models.Model):
    customer_name = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    destination = models.CharField(max_length=255)
    driver_name = models.CharField(max_length=255, blank=True)
    receiver_name = models.CharField(max_length=255, blank=True)
    items = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def waybill_number(self) -> str:
        return numbering.format_waybill_number(self.pk)

    def __str__(self) -> str:  # pragma: no cover - display helper
        return self.waybill_number
