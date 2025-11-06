from django.contrib import admin
# Import Django admin
from django.urls import include, path
# Import URL utilities
from django.views.generic import TemplateView
# Import generic template view
from django.views.decorators.csrf import csrf_exempt

# Lazy import to avoid premature model loading
def get_counter_view(view_name):
    @csrf_exempt
    def lazy_view(request):
        from billing_app import counter_api
        return getattr(counter_api, view_name)(request)
    return lazy_view

urlpatterns = [
    # URL patterns for the application
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    # Home page route
    path("admin/", admin.site.urls),
    # Admin interface
    path("invoices/", include("billing_app.invoices.urls")),
    # Include invoices app URLs
    path("receipts/", include("receipts.urls")),
    # Include receipts app URLs
    path("waybills/", include("waybills.urls")),
    # Include waybills app URLs
    # Counter API endpoints (lazy-loaded to avoid model import at URL config time)
    path("api/counter/invoice/next/", get_counter_view("get_next_invoice_number"), name="next-invoice-number"),
    path("api/counter/receipt/next/", get_counter_view("get_next_receipt_number"), name="next-receipt-number"),
    path("api/counter/waybill/next/", get_counter_view("get_next_waybill_number"), name="next-waybill-number"),
    path("api/counter/counts/", get_counter_view("get_document_counts"), name="document-counts"),
]
