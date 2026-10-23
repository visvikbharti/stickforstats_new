from django.urls import path
from ..views import DOEExamplesView

# Only the static examples are routed. The experiment-design, model-analysis and
# optimization-analysis viewsets (api/views.py), and the generate-design, analyze-experiment,
# optimize-response, generate-report and screening-analysis views (../views.py), stored DOE
# records or read them back by ID with no sign-in and no owner, so anyone could list, read,
# edit or delete every design. No screen used them. Route them again only behind sign-in,
# scoped to the owner.
urlpatterns = [
    path("examples/", DOEExamplesView.as_view(), name="doe-examples"),
]
