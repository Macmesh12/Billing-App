from django.contrib import admin
# Import Django admin
from django.urls import include, path
# Import URL utilities
from django.views.generic import TemplateView
# Import generic template view

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
]
