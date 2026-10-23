"""PCA projects and everything stored under them are reachable only by their owner.

The record viewsets in pca_analysis/views.py were AllowAny. The project and result ones
filtered by request.user, so an anonymous visitor got 500 (AnonymousUser is not a user). The
nested ones (samples, genes, groups, visualizations) filtered by the project or result ID alone:
anyone holding the ID could read, edit and delete another user's records. Executed before the
fix: an anonymous GET listed a project's 15 samples, 100 genes and 3 groups, and an anonymous
DELETE removed a sample. They now need sign-in (401 otherwise) and see only the user's records.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from pca_analysis.models import Gene, PCAProject, PCAResult, PCAVisualization, Sample, SampleGroup
from pca_analysis.services.data_processor import DataProcessorService

BASE = "/api/v1/pca-analysis"


@override_settings(SECURE_SSL_REDIRECT=False)
class PCARecordsOwnerOnlyTest(TestCase):
    def setUp(self):
        users = get_user_model().objects
        self.alice = users.create_user(username="alice@example.org", email="alice@example.org", password="unused-here")
        self.bob = users.create_user(username="bob@example.org", email="bob@example.org", password="unused-here")
        self.project = PCAProject.objects.create(name="Alice's cohort", user=self.alice)
        DataProcessorService().create_demo_data(self.project)
        self.result = PCAResult.objects.create(project=self.project, user=self.alice)
        self.visualization = PCAVisualization.objects.create(pca_result=self.result, name="Scores", plot_type="2d_scatter")
        self.sample = Sample.objects.filter(project=self.project).first()
        self.gene = Gene.objects.filter(project=self.project).first()
        self.group = SampleGroup.objects.filter(project=self.project).first()
        p, r, v = self.project.id, self.result.id, self.visualization.id
        self.lists = [
            f"{BASE}/projects/",
            f"{BASE}/projects/{p}/samples/",
            f"{BASE}/projects/{p}/genes/",
            f"{BASE}/projects/{p}/groups/",
            f"{BASE}/results/",
            f"{BASE}/results/{r}/visualizations/",
        ]
        self.details = [
            f"{BASE}/projects/{p}/",
            f"{BASE}/projects/{p}/latest_result/",
            f"{BASE}/projects/{p}/samples/{self.sample.id}/",
            f"{BASE}/projects/{p}/genes/{self.gene.id}/",
            f"{BASE}/projects/{p}/groups/{self.group.id}/",
            f"{BASE}/results/{r}/",
            f"{BASE}/results/{r}/visualization_data/",
            f"{BASE}/results/{r}/gene_contributions/",
            f"{BASE}/results/{r}/visualizations/{v}/",
            f"{BASE}/results/{r}/visualizations/{v}/data/",
        ]
        self.writable = [
            f"{BASE}/projects/{p}/",
            f"{BASE}/projects/{p}/samples/{self.sample.id}/",
            f"{BASE}/projects/{p}/genes/{self.gene.id}/",
            f"{BASE}/projects/{p}/groups/{self.group.id}/",
            f"{BASE}/results/{r}/visualizations/{v}/",
        ]

    def client_for(self, user=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        return client

    def assert_nothing_changed(self):
        self.assertTrue(PCAProject.objects.filter(id=self.project.id, name="Alice's cohort").exists())
        self.assertEqual(Sample.objects.filter(project=self.project).count(), 15)
        self.assertEqual(Gene.objects.filter(project=self.project).count(), 100)
        self.assertEqual(SampleGroup.objects.filter(project=self.project).count(), 3)
        self.assertTrue(Sample.objects.filter(id=self.sample.id, name=self.sample.name).exists())
        self.assertTrue(PCAVisualization.objects.filter(id=self.visualization.id, name="Scores").exists())

    def test_anonymous_visitors_get_401_everywhere_and_change_nothing(self):
        anonymous = self.client_for()
        for path in self.lists + self.details:
            self.assertEqual(anonymous.get(path).status_code, 401, path)
        for path in self.writable:
            self.assertEqual(anonymous.patch(path, {"name": "changed"}, format="json").status_code, 401, path)
            self.assertEqual(anonymous.delete(path).status_code, 401, path)
        self.assertEqual(anonymous.post(f"{BASE}/projects/{self.project.id}/run_pca/", {"n_components": 2}, format="json").status_code, 401)
        # Creating one: the Survival and Factor Analysis pages still call these through the PCA uploader.
        for path, body in (
            (f"{BASE}/projects/", {"name": "anonymous"}),
            (f"{BASE}/projects/create_demo/", {"project_name": "anonymous", "scaling_method": "STANDARD"}),
            (f"{BASE}/projects/upload_data/", {"project_name": "anonymous"}),
        ):
            self.assertEqual(anonymous.post(path, body, format="json").status_code, 401, path)
        self.assertEqual(PCAProject.objects.count(), 1)
        self.assert_nothing_changed()

    def test_another_user_sees_none_of_it_and_changes_nothing(self):
        bob = self.client_for(self.bob)
        for path in self.lists:
            response = bob.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assertEqual(response.json()["count"], 0, path)
        for path in self.details:
            self.assertEqual(bob.get(path).status_code, 404, path)
        for path in self.writable:
            self.assertEqual(bob.patch(path, {"name": "changed"}, format="json").status_code, 404, path)
            self.assertEqual(bob.delete(path).status_code, 404, path)
        self.assert_nothing_changed()

    def test_no_one_can_write_into_another_users_records(self):
        # Executed before the fix: Bob moved his own project into Alice's account by PATCHing
        # user=<Alice's id>, and attached his sample to Alice's group, reading back its name.
        bob_project = PCAProject.objects.create(name="Bob's cohort", user=self.bob)
        DataProcessorService().create_demo_data(bob_project)
        bob_sample = Sample.objects.filter(project=bob_project).first()
        bob_group = bob_sample.group
        self.group.name = "Alice-only group"
        self.group.save()
        bob = self.client_for(self.bob)
        response = bob.patch(f"{BASE}/projects/{bob_project.id}/", {"user": self.alice.pk, "name": "Message from Bob"}, format="json")
        self.assertEqual(response.status_code, 200)
        bob_project.refresh_from_db()
        self.assertEqual(bob_project.user, self.bob)
        self.assertEqual(list(PCAProject.objects.filter(user=self.alice)), [self.project])
        response = bob.patch(f"{BASE}/projects/{bob_project.id}/samples/{bob_sample.id}/", {"group": str(self.group.id)}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Alice-only group", response.content.decode())
        bob_sample.refresh_from_db()
        self.assertEqual(bob_sample.group, bob_group)
        # Refused exactly like an ID that does not exist, so the reply does not reveal it exists.
        made_up = bob.patch(f"{BASE}/projects/{bob_project.id}/samples/{bob_sample.id}/", {"group": "00000000-0000-4000-8000-000000000000"}, format="json")
        self.assertEqual(response.json()["group"][0].replace(str(self.group.id), "<id>"),
                         made_up.json()["group"][0].replace("00000000-0000-4000-8000-000000000000", "<id>"))
        # Nor a group from another of Bob's own projects: a sample's group comes from its project.
        bob_other = PCAProject.objects.create(name="Bob's other cohort", user=self.bob)
        other_group = SampleGroup.objects.create(project=bob_other, name="Elsewhere")
        response = bob.patch(f"{BASE}/projects/{bob_project.id}/samples/{bob_sample.id}/", {"group": str(other_group.id)}, format="json")
        self.assertEqual(response.status_code, 400)
        # A group of the sample's own project is still accepted.
        own_group = SampleGroup.objects.filter(project=bob_project).exclude(id=bob_group.id).first()
        self.assertEqual(bob.patch(f"{BASE}/projects/{bob_project.id}/samples/{bob_sample.id}/", {"group": str(own_group.id)}, format="json").status_code, 200)
        self.assert_nothing_changed()

    def test_the_owner_still_sees_all_of_it(self):
        alice = self.client_for(self.alice)
        expected = {"samples": 15, "genes": 100, "groups": 3}
        for kind, count in expected.items():
            response = alice.get(f"{BASE}/projects/{self.project.id}/{kind}/")
            self.assertEqual(response.status_code, 200, kind)
            self.assertEqual(response.json()["count"], count, kind)
        self.assertEqual(alice.get(f"{BASE}/results/{self.result.id}/visualizations/").json()["count"], 1)
        self.assertEqual(alice.get(f"{BASE}/projects/").json()["count"], 1)
        # (Project detail answers 500 even to its owner: PCAProjectDetailSerializer passes a
        # redundant source="sample_groups", which DRF rejects; v1.2.0 has the same line. Not
        # changed here.)
        self.assertEqual(alice.get(f"{BASE}/projects/{self.project.id}/latest_result/").status_code, 200)
