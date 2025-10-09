from django.contrib import admin

from .models import Waybill


@admin.register(Waybill)
class WaybillAdmin(admin.ModelAdmin):
    list_display = ("waybill_number", "customer_name", "issue_date", "destination")
    readonly_fields = ("waybill_number",)
    search_fields = ("customer_name", "destination")
    ordering = ("-issue_date",)
