from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

urlpatterns = [
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
    path("admin/", admin.site.urls),
    path("invoices/", include("invoices.urls")),
    path("receipts/", include("receipts.urls")),
    path("waybills/", include("waybills.urls")),
]
