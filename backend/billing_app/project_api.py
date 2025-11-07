from __future__ import annotations

from io import BytesIO
from http import HTTPStatus

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from billing_app.counter_api import _cors
from billing_app.services.project_io import (
    ProjectImportError,
    export_project_archive,
    import_project_archive,
)


def _method_not_allowed() -> HttpResponse:
    return _cors(HttpResponse(status=HTTPStatus.METHOD_NOT_ALLOWED))


@csrf_exempt
def export_project(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))

    if request.method != "POST":
        return _method_not_allowed()

    archive = export_project_archive()
    timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
    filename = f"BillingApp-{timestamp}.billproj"

    response = HttpResponse(archive, content_type="application/x-billing-project")
    response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
    return _cors(response)


@csrf_exempt
def import_project(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _cors(HttpResponse(status=HTTPStatus.NO_CONTENT))

    if request.method != "POST":
        return _method_not_allowed()

    archive_bytes: bytes | None = None

    if request.FILES:
        uploaded = next(iter(request.FILES.values()))
        archive_bytes = uploaded.read()
    elif request.body:
        archive_bytes = request.body

    if not archive_bytes:
        return _cors(JsonResponse({"error": "No project archive provided."}, status=HTTPStatus.BAD_REQUEST))

    try:
        summary = import_project_archive(BytesIO(archive_bytes))
    except ProjectImportError as exc:
        return _cors(JsonResponse({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST))

    response_payload = {
        "status": "ok",
        "summary": summary.as_dict(),
        "imported_at": timezone.now().isoformat(),
    }
    return _cors(JsonResponse(response_payload, status=HTTPStatus.CREATED))
