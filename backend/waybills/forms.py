import json

from django import forms

from .models import Waybill


class WaybillForm(forms.ModelForm):
    items_payload = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Waybill
        fields = [
            "customer_name",
            "issue_date",
            "destination",
            "driver_name",
            "receiver_name",
        ]
        widgets = {
            "issue_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["items_payload"].initial = json.dumps(self.instance.items or [])

    def save(self, commit=True):
        instance: Waybill = super().save(commit=False)
        instance.items = self._parse_items(self.cleaned_data.get("items_payload") or "[]")
        if commit:
            instance.save()
        return instance

    def _parse_items(self, payload: str):
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            return []
        sanitized = []
        for item in parsed:
            quantity = float(item.get("quantity", 0) or 0)
            unit_price = float(item.get("unit_price", 0) or 0)
            sanitized.append(
                {
                    "description": str(item.get("description", "")),
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": round(quantity * unit_price, 2),
                }
            )
        return sanitized
