import json
from http import HTTPStatus

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.generic import FormView, TemplateView

from .forms import InvoiceForm
from .models import Invoice


def _build_tax_rows(invoice: Invoice | None) -> list[dict[str, object]]:
    levies = {}
    if invoice is not None:
        levies = invoice.levies or {}
    rows: list[dict[str, object]] = []
    for name, rate in settings.TAX_SETTINGS.items():
        amount = levies.get(name)
        if amount is not None:
            amount = f"{float(amount):.2f}"
        rows.append({
            "name": name,
            "rate": rate,
            "rate_percent": round(rate * 100, 2),
            "amount": amount,
        })
    return rows


class InvoiceView(FormView):
    template_name = "invoice.html"
    form_class = InvoiceForm

    def get_success_url(self):
        return reverse("invoice-detail", kwargs={"pk": self.object.pk})

    def form_valid(self, form: InvoiceForm):
        self.object = form.save()
        request: HttpRequest = self.request
        if request.headers.get("HX-Request"):
            return JsonResponse(
                {
                    "invoice_id": self.object.pk,
                    "invoice_number": self.object.invoice_number,
                    "redirect": reverse("invoice-detail", kwargs={"pk": self.object.pk}),
                }
            )
        return redirect(self.get_success_url())

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["tax_rates"] = settings.TAX_SETTINGS
        invoice_obj = None
        form = context.get("form")
        if form is not None:
            invoice_obj = getattr(form, "instance", None)
        context["tax_rows"] = _build_tax_rows(invoice_obj if getattr(invoice_obj, "pk", None) else None)
        return context


class InvoiceDetailView(TemplateView):
    template_name = "invoice.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        invoice = Invoice.objects.get(pk=self.kwargs["pk"])
        context["invoice"] = invoice
        context["tax_rates"] = settings.TAX_SETTINGS
        context["tax_rows"] = _build_tax_rows(invoice)
        context["form"] = InvoiceForm(instance=invoice)
        context["preview"] = True
        return context


def invoice_pdf(request: HttpRequest, pk: int) -> HttpResponse:
    invoice = Invoice.objects.get(pk=pk)
    html_string = render(
        request,
        "invoice.html",
        {
            "invoice": invoice,
            "preview": True,
            "tax_rates": settings.TAX_SETTINGS,
            "tax_rows": _build_tax_rows(invoice),
            "form": InvoiceForm(instance=invoice),
        },
    ).content.decode("utf-8")

    # Lazy import to avoid loading GTK libraries at module import time
    try:
        from weasyprint import HTML
    except (ImportError, OSError):  # OSError for missing GTK libraries
        response = HttpResponse(html_string, content_type="text/html")
        response["X-WeasyPrint-Disabled"] = "1"
        return response

    pdf_file = HTML(string=html_string).write_pdf()
    response = HttpResponse(pdf_file, content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={invoice.invoice_number}.pdf"
    return response


def invoice_calculate_preview(request: HttpRequest) -> HttpResponse:
    if request.method != "POST":
        return HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED)
    data = json.loads(request.body or "{}")
    form = InvoiceForm(data or None)
    form.is_valid()
    items_payload = data.get("items_payload", "[]")
    items = form._parse_items(items_payload)
    temp_invoice = Invoice(customer_name=form.cleaned_data.get("customer_name", ""))
    temp_invoice.items = items
    temp_invoice.recalculate()
    return JsonResponse(
        {
            "subtotal": float(temp_invoice.subtotal),
            "levies": {name: float(amount) for name, amount in temp_invoice.levies.items()},
            "grand_total": float(temp_invoice.grand_total),
        }
    )
