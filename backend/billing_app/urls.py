from django.contrib import admin
# Import Django admin
from django.urls import include, path
# Import URL utilities
from django.conf import settings
from django.conf.urls.static import static
from billing_app import counter_api, pdf_api
# Import counter API views

urlpatterns = [
    # URL patterns for the application
    # React frontend handles all page routing, Django serves APIs only
    path("admin/", admin.site.urls),
    # Admin interface
    path("invoices/", include("billing_app.invoices.urls")),
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
    path("api/pdf/render/", pdf_api.render_pdf, name="render-pdf"),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    # Serve assets directory
    urlpatterns += static("/assets/", document_root=settings.BASE_DIR.parent / "assets")
