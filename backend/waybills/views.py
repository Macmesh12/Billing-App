"""
Waybill views module.

This module provides Django views for waybill operations:
- WaybillView: Form view for creating/editing waybills
- WaybillDetailView: Display view for viewing waybill details
- waybill_pdf: Generate and download waybill as PDF

All views integrate with the template system to render waybill documents.
"""
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.generic import FormView, TemplateView

from .forms import WaybillForm
from .models import Waybill
from .services import numbering

try:
    from weasyprint import HTML
except ImportError:  # pragma: no cover
    HTML = None


class WaybillView(FormView):
    template_name = "waybill.html"
    form_class = WaybillForm

    def form_valid(self, form: WaybillForm):
        waybill = form.save()
        self.waybill = waybill
        return redirect(self.get_success_url())

    def get_success_url(self):
        return reverse("waybill-detail", kwargs={"pk": self.waybill.pk})


class WaybillDetailView(TemplateView):
    template_name = "waybill.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        waybill = Waybill.objects.get(pk=self.kwargs["pk"])
        context["waybill"] = waybill
        context["preview"] = True
        context["form"] = WaybillForm(instance=waybill)
        return context


def waybill_pdf(request: HttpRequest, pk: int) -> HttpResponse:
    waybill = Waybill.objects.get(pk=pk)
    html_string = render(
        request,
        "waybill.html",
        {"waybill": waybill, "preview": True, "form": WaybillForm(instance=waybill)},
    ).content.decode("utf-8")

    if HTML is None:
        response = HttpResponse(html_string, content_type="text/html")
        response["X-WeasyPrint-Disabled"] = "1"
        return response

    pdf_file = HTML(string=html_string).write_pdf()
    response = HttpResponse(pdf_file, content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={numbering.format_waybill_number(waybill.pk)}.pdf"
    return response
