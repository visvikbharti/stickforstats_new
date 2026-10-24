"""Only members of an organization can install, uninstall, configure or run its plugins, or see them.

The organization comes from the X-Organization (or X-API-Key) header, through the tenant
middleware, which resolves it only while STICKFORSTATS_TIER_ENFORCEMENT is on and never checked
membership. With enforcement on, any signed-in user could install or uninstall a plugin for any
organization, change its configuration and run it, and anyone could list its installed plugins
with their configuration. The views now check membership themselves (member_organization in
api/v1/marketplace_views.py), so the rule holds whatever the setting. With it off no
organization is resolved, so nobody can install for one (400), as before.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import Organization, OrganizationMembership, Plugin, PluginInstallation

BASE = "/api/v1/marketplace"


def plugin(slug):
    return Plugin.objects.create(
        name=slug, slug=slug, plugin_type=Plugin._meta.get_field("plugin_type").choices[0][0],
        description="A plugin", author_name="Test",
    )


@override_settings(SECURE_SSL_REDIRECT=False)
class PluginActionsNeedMembershipTest(TestCase):
    def setUp(self):
        users = get_user_model().objects
        self.member = users.create_user(username="member@example.org", email="member@example.org", password="unused")
        self.outsider = users.create_user(username="outsider@example.org", email="outsider@example.org", password="unused")
        self.org = Organization.objects.create(name="Lab", slug="lab")
        OrganizationMembership.objects.create(organization=self.org, user=self.member, role="member")
        self.installed = plugin("installed-one")
        self.not_installed = plugin("not-installed")
        self.installation = PluginInstallation.objects.create(
            plugin=self.installed, organization=self.org, installed_by=self.member, config={"api_key": "org-secret"}
        )

    def client_for(self, user):
        client = APIClient(HTTP_X_ORGANIZATION=self.org.slug)
        if user is not None:
            client.force_authenticate(user)
        return client

    def assert_nothing_changed(self):
        self.installation.refresh_from_db()
        self.assertTrue(self.installation.is_active)
        self.assertEqual(self.installation.config, {"api_key": "org-secret"})
        self.assertFalse(PluginInstallation.objects.filter(plugin=self.not_installed).exists())

    @override_settings(STICKFORSTATS_TIER_ENFORCEMENT=True)
    def test_with_enforcement_on_an_outsider_can_do_nothing_for_the_organization(self):
        outsider = self.client_for(self.outsider)
        with patch("core.services.plugin_runtime.PluginRuntime.execute") as execute:
            for method, path, body in (
                ("post", f"{BASE}/plugins/not-installed/install/", {"config": {"x": 1}}),
                ("delete", f"{BASE}/plugins/installed-one/install/", None),
                ("patch", f"{BASE}/plugins/installed-one/config/", {"config": {"api_key": "mine"}}),
                ("post", f"{BASE}/plugins/installed-one/execute/", {"data": {}}),
                ("get", f"{BASE}/installed/", None),
            ):
                response = getattr(outsider, method)(path, body, format="json")
                self.assertEqual(response.status_code, 403, f"{method.upper()} {path}")
                self.assertNotIn("org-secret", response.content.decode())
            execute.assert_not_called()
        self.assertEqual(self.client_for(None).get(f"{BASE}/installed/").status_code, 403)
        self.assert_nothing_changed()

    @override_settings(STICKFORSTATS_TIER_ENFORCEMENT=True)
    def test_with_enforcement_on_a_former_member_is_an_outsider(self):
        OrganizationMembership.objects.create(organization=self.org, user=self.outsider, role="admin", is_active=False)
        outsider = self.client_for(self.outsider)
        self.assertEqual(outsider.post(f"{BASE}/plugins/not-installed/install/", {}, format="json").status_code, 403)
        self.assertEqual(outsider.get(f"{BASE}/installed/").status_code, 403)
        self.assert_nothing_changed()

    @override_settings(STICKFORSTATS_TIER_ENFORCEMENT=True)
    def test_with_enforcement_on_an_outsider_cannot_see_what_is_installed(self):
        outsider = self.client_for(self.outsider)
        listing = outsider.get(f"{BASE}/plugins/").json()["plugins"]
        self.assertEqual([p["is_installed"] for p in listing if p["slug"] == "installed-one"], [False])
        self.assertFalse(outsider.get(f"{BASE}/plugins/installed-one/").json()["is_installed"])

    @override_settings(STICKFORSTATS_TIER_ENFORCEMENT=True)
    def test_with_enforcement_on_a_member_can_still_do_all_of_it(self):
        member = self.client_for(self.member)
        self.assertTrue(member.get(f"{BASE}/plugins/installed-one/").json()["is_installed"])
        self.assertEqual(member.get(f"{BASE}/installed/").json()["total"], 1)
        self.assertEqual(member.post(f"{BASE}/plugins/not-installed/install/", {}, format="json").status_code, 201)
        self.assertEqual(member.patch(f"{BASE}/plugins/installed-one/config/", {"config": {"x": 1}}, format="json").status_code, 200)
        self.assertEqual(member.delete(f"{BASE}/plugins/installed-one/install/").status_code, 200)

    @override_settings(STICKFORSTATS_TIER_ENFORCEMENT=False)
    def test_with_enforcement_off_no_one_can_install_for_an_organization(self):
        for user in (self.outsider, self.member):
            response = self.client_for(user).post(f"{BASE}/plugins/not-installed/install/", {}, format="json")
            self.assertEqual(response.status_code, 400)  # no organization is resolved
        self.assert_nothing_changed()
