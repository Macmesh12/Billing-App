from django.contrib import admin

from .models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "received_from", "issue_date", "amount")
    readonly_fields = ("receipt_number",)
    search_fields = ("received_from", "description")
    ordering = ("-issue_date",)
