from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.generic import FormView, TemplateView

from .forms import WaybillForm
from .models import Waybill
from .services import numbering


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
    from billing_app.pdf_generator import generate_waybill_pdf
    
    waybill = Waybill.objects.get(pk=pk)
    
    # Generate PDF using ReportLab
    pdf_buffer = generate_waybill_pdf(waybill)
    
    response = HttpResponse(pdf_buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={numbering.format_waybill_number(waybill.pk)}.pdf"
    return response
