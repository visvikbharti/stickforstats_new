"""A consent record can exist without a grant time.

`granted_at` did not accept NULL and defaulted to the time the row was created, so a "no" that was
recorded before any "yes" would have carried a time at which consent was given. The column now
accepts NULL and has no default: a record created by a refusal holds no grant time.

Backwards: the earlier column cannot hold "never granted". Django would fill it with the time of
the reversal, which is a grant time nobody gave. The reversal therefore stops while such records
exist and says how many; it writes nothing.
"""

from django.db import migrations, models


def refuse_to_invent_grant_times(apps, schema_editor):
    ConsentRecord = apps.get_model("core", "ConsentRecord")
    never_granted = ConsentRecord.objects.using(schema_editor.connection.alias).filter(granted_at__isnull=True).count()
    if never_granted:
        raise RuntimeError(
            f"{never_granted} consent record(s) hold a refusal and no grant time. The earlier schema requires a "
            "grant time for every record, and none exists for these. Keep this migration applied (the earlier "
            "code runs on this schema), or delete those records first: without a record a consent counts as "
            "not given."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_purge_imported_tables_from_sessions"),
    ]

    operations = [
        migrations.AlterField(
            model_name="consentrecord",
            name="granted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Forwards nothing to do. Backwards this runs first, before the column is made NOT NULL again.
        migrations.RunPython(migrations.RunPython.noop, refuse_to_invent_grant_times),
    ]
