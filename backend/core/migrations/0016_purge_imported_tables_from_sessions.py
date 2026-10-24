"""Delete the uploaded tables that /api/v1/data/import/ saved in visitors' sessions.

Until 2026-10-24 the import view saved the whole uploaded table ("imported_data") and its
summary ("data_summary") in the visitor's database-backed session. Nothing read them back, and
nothing deleted expired sessions, so every table ever imported stayed in django_session. The view
no longer saves them; this migration deletes the copies already stored:

- every expired session is deleted (Django never uses one again);
- every session that holds either key is deleted outright, not edited, so no part of a table
  survives. A visitor who was also signed in through that session is signed out.

Every other row is left exactly as it is.

Session data is signed, not encrypted, so the contents are read without checking the signature.
That way the result does not depend on the secret key: Django's settings give a process without
DJANGO_SECRET_KEY a random one, and a check that deleted every session it could not verify would
then delete them all. Nothing is re-signed. Reversing the migration restores nothing.
"""

import json
import zlib

from django.core import signing
from django.db import migrations
from django.utils import timezone

IMPORT_KEYS = ("imported_data", "data_summary")


def _contents(session_data):
    """A session's stored dict, read without checking its signature; None if unreadable.

    Format (django.core.signing): "[.]<base64 of the JSON>:<timestamp>:<signature>", where a
    leading "." means the JSON was zlib-compressed.
    """
    try:
        value = session_data.rsplit(":", 2)[0]
        compressed = value.startswith(".")
        raw = signing.b64_decode(value[1:].encode() if compressed else value.encode())
        if compressed:
            raw = zlib.decompress(raw)
        return json.loads(raw.decode("latin-1"))
    except Exception:
        return None


def purge_imported_tables(apps, schema_editor):
    Session = apps.get_model("sessions", "Session")
    Session.objects.filter(expire_date__lt=timezone.now()).delete()
    # One row at a time: a row can hold a whole table.
    for session_key in list(Session.objects.values_list("session_key", flat=True)):
        session = Session.objects.filter(session_key=session_key).first()
        if session is None:
            continue
        contents = _contents(session.session_data)
        if isinstance(contents, dict) and any(key in contents for key in IMPORT_KEYS):
            session.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_claimdatasetlink_claimverdictrecord_cited_references_and_more"),
        ("sessions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(purge_imported_tables, migrations.RunPython.noop),
    ]
