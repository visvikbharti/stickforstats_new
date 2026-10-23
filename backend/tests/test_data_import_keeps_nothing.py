"""The data-import endpoint keeps nothing, and the tables it kept are deleted.

/api/v1/data/import/ used to save the whole uploaded table ("imported_data") and a summary with
a 10-row preview ("data_summary") in the visitor's database-backed session. Nothing read them
back, and nothing deleted expired sessions, so every imported table stayed in django_session.
Now the import ends with its response; migration core 0016 deletes the copies already stored;
and the daily clean-up task deletes expired sessions.
"""

import importlib
from datetime import timedelta

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.core import signing
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from core.tasks import cleanup_expired_sessions

purge_imported_tables = importlib.import_module(
    "core.migrations.0016_purge_imported_tables_from_sessions"
).purge_imported_tables

CSV = b"patient,age,score\nP-001,34,7.5\nP-002,51,6.1\nP-003,47,8.2\n"


def upload(client):
    return client.post(
        "/api/v1/data/import/",
        {"file": SimpleUploadedFile("cohort.csv", CSV, content_type="text/csv")},
        format="multipart",
    )


def make_session(data, expired=False, signing_key=None):
    store = SessionStore()
    store.update(data)
    store.create()
    if expired:
        Session.objects.filter(session_key=store.session_key).update(expire_date=timezone.now() - timedelta(days=1))
    if signing_key:  # as if written by a process with another secret key
        other = signing.dumps(data, key=signing_key, salt=store.key_salt, serializer=store.serializer, compress=True)
        Session.objects.filter(session_key=store.session_key).update(session_data=other)
    return store.session_key


TABLE = {"imported_data": '{"patient":{"0":"P-001","1":"P-002"}}', "data_summary": {"rows": 2}}


def stored(session_key):
    return Session.objects.get(session_key=session_key).get_decoded()


@override_settings(SECURE_SSL_REDIRECT=False)
class TheImportKeepsNothingTest(TestCase):
    def test_it_answers_with_the_summary_and_creates_no_session(self):
        response = upload(APIClient())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["summary"]["rows"], 3)
        self.assertEqual(Session.objects.count(), 0)
        self.assertNotIn(settings.SESSION_COOKIE_NAME, response.cookies)

    def test_an_existing_session_gains_nothing(self):
        key = make_session({"theme": "dark"})
        client = APIClient()
        client.cookies[settings.SESSION_COOKIE_NAME] = key
        self.assertEqual(upload(client).status_code, 200)
        self.assertEqual(stored(key), {"theme": "dark"})


class TheMigrationDeletesTheStoredTablesTest(TestCase):
    def assertGone(self, *keys):
        self.assertFalse(Session.objects.filter(session_key__in=keys).exists())

    def test_every_session_holding_a_table_is_deleted(self):
        only_table = make_session(TABLE)
        only_summary = make_session({"data_summary": {"rows": 2}})
        with_login = make_session({**TABLE, "_auth_user_id": "7"})
        large = make_session({**TABLE, "imported_data": '{"x":' + "[1.5," * 20000 + "1.5]}"})
        self.assertTrue(Session.objects.get(session_key=large).session_data.startswith("."), "compressed")
        purge_imported_tables(django_apps, None)
        self.assertGone(only_table, only_summary, with_login, large)

    def test_other_sessions_are_left_exactly_as_they_were(self):
        keys = [make_session({"_auth_user_id": "7", "theme": "dark"}), make_session({"theme": "dark"}, signing_key="k2")]
        before = {k: Session.objects.get(session_key=k).session_data for k in keys}
        purge_imported_tables(django_apps, None)
        self.assertEqual({k: Session.objects.get(session_key=k).session_data for k in keys}, before)

    def test_a_table_signed_with_another_key_is_deleted_too(self):
        key = make_session(TABLE, signing_key="the-key-before-a-rotation")
        purge_imported_tables(django_apps, None)
        self.assertGone(key)

    def test_the_result_does_not_depend_on_the_secret_key(self):
        # A process without DJANGO_SECRET_KEY gets a random one (stickforstats/settings.py).
        table, other = make_session(TABLE), make_session({"_auth_user_id": "7"})
        with override_settings(SECRET_KEY="a-random-per-process-key"):
            purge_imported_tables(django_apps, None)
        self.assertGone(table)
        self.assertEqual(stored(other), {"_auth_user_id": "7"})

    def test_expired_sessions_are_deleted(self):
        key = make_session({"theme": "dark"}, expired=True)
        purge_imported_tables(django_apps, None)
        self.assertGone(key)


class TheDailyCleanupDeletesExpiredSessionsTest(TestCase):
    def test_expired_sessions_go_and_live_ones_stay(self):
        expired = make_session({"theme": "dark"}, expired=True)
        live = make_session({"theme": "light"})
        result = cleanup_expired_sessions()
        self.assertEqual(result["expired_sessions_deleted"], 1)
        self.assertFalse(Session.objects.filter(session_key=expired).exists())
        self.assertTrue(Session.objects.filter(session_key=live).exists())
