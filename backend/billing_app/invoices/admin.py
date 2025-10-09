from django.contrib import admin

from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "customer_name", "issue_date", "grand_total")
    readonly_fields = ("invoice_number", "subtotal", "levies", "grand_total")
    search_fields = ("customer_name", "classification")
    ordering = ("-issue_date",)
