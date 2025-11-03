from django.db import models
from django.utils import timezone

from billing_app.services.counter_store import reserve_document_number

from .services import numbering


class Waybill(models.Model):
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
        ordering = ["-created_at"]

    @property
    def waybill_number(self) -> str:
        if self.document_number:
            return self.document_number
        return numbering.format_waybill_number(self.pk)

    def save(self, *args, **kwargs):
        if not self.document_number:
            self.document_number = reserve_document_number("waybill")
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover - display helper
        return self.waybill_number
