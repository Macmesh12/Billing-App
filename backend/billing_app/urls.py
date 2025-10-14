from django.contrib import admin
# Import Django admin
from django.urls import include, path
# Import URL utilities
from django.views.generic import TemplateView
# Import generic template view
from billing_app import counter_api
# Import counter API views

urlpatterns = [
    # URL patterns for the application
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    # Home page route
    path("admin/", admin.site.urls),
    # Admin interface
    path("invoices/", include("invoices.urls")),
    # Include invoices app URLs
    path("receipts/", include("receipts.urls")),
    # Include receipts app URLs
    path("waybills/", include("waybills.urls")),
    # Include waybills app URLs
    # Counter API endpoints
    path("api/counter/invoice/next/", counter_api.get_next_invoice_number, name="next-invoice-number"),
    path("api/counter/receipt/next/", counter_api.get_next_receipt_number, name="next-receipt-number"),
    path("api/counter/waybill/next/", counter_api.get_next_waybill_number, name="next-waybill-number"),
    path("api/counter/counts/", counter_api.get_document_counts, name="document-counts"),
]
