"""Django management command: rotate the reproducibility-receipt signing key.

Generates a NEW active signing key and folds the CURRENT active key into the
retired (verify-only) set, so receipts already issued under the old key keep
verifying and keep exporting a self-consistent bundle. Prints the three ``.env``
lines to paste; once the new key is deployed, the old PRIVATE key can be
destroyed (only its public half is retained, which is the safer posture).

Usage::

    python manage.py rotate_receipt_key
    python manage.py rotate_receipt_key --new-kid stickforstats-receipt-key-3

Requires an active key to already be configured (``RECEIPT_RSA_PRIVATE_KEY`` or
``RECEIPT_RSA_PRIVATE_KEY_B64``). For the very first key, use
``generate_receipt_keypair`` instead — there is nothing to rotate from.

The command verifies, in-process, that the three lines it prints actually load
into a keyring that (a) makes the new key active and (b) still verifies the old
kid — so a paste of its output cannot leave receipts unverifiable.
"""

from __future__ import annotations

import base64
import json
import os
import re

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.core.management.base import BaseCommand, CommandError

from core.crypto import receipt_signing


def _next_kid(current: str, taken: set) -> str:
    """Derive a fresh kid from ``current`` by bumping a trailing integer.

    ``stickforstats-receipt-key-1`` -> ``...-2``; ``prod-1`` -> ``prod-2``; a kid
    with no trailing digits gets a ``-2`` suffix. Keeps bumping until the result
    collides with neither ``current`` nor any ``taken`` (retired) kid.
    """
    m = re.search(r"^(.*?)(\d+)$", current)
    if m:
        prefix, num = m.group(1), int(m.group(2))
    else:
        prefix, num = f"{current}-", 1
    num += 1
    while f"{prefix}{num}" == current or f"{prefix}{num}" in taken:
        num += 1
    return f"{prefix}{num}"


class Command(BaseCommand):
    help = (
        "Rotate the reproducibility-receipt signing key: generate a new active "
        "key and retain the current key as verify-only, so old receipts stay "
        "verifiable. Prints the .env lines to paste."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--new-kid",
            type=str,
            default=None,
            help="Key ID for the new active key (default: bump the current kid's trailing number).",
        )
        parser.add_argument(
            "--key-size",
            type=int,
            default=2048,
            help="RSA key size in bits for the new key (default 2048; minimum 2048 enforced).",
        )

    def handle(self, *args, **options):
        key_size = options["key_size"]
        if key_size < 2048:
            raise CommandError("Refusing to generate an RSA key smaller than 2048 bits.")

        if not receipt_signing.key_is_configured():
            raise CommandError(
                "No active receipt signing key is configured "
                "(RECEIPT_RSA_PRIVATE_KEY or RECEIPT_RSA_PRIVATE_KEY_B64). There is "
                "nothing to rotate from. For the first key, run:\n"
                "    python manage.py generate_receipt_keypair --env"
            )

        # The current active key becomes the retired, verify-only key.
        receipt_signing.reset_cache()
        old_kid = receipt_signing.active_key_id()
        old_pub_pem = receipt_signing.public_pem()

        # Preserve any keys already retired, and gather every taken kid.
        existing_retired = self._existing_retired()
        taken = {entry["kid"] for entry in existing_retired}
        if old_kid in taken:
            raise CommandError(
                f"The current active kid '{old_kid}' is ALSO listed in "
                "RECEIPT_RSA_RETIRED_KEYS_B64. Clean that up before rotating "
                "(a kid must name exactly one key)."
            )

        new_kid = options["new_kid"] or _next_kid(old_kid, taken | {old_kid})
        if new_kid == old_kid or new_kid in taken:
            raise CommandError(
                f"--new-kid '{new_kid}' collides with the current or a retired kid. "
                "Pick a kid that is not already in use."
            )

        self.stdout.write(f"Rotating receipt key: '{old_kid}' -> new active '{new_kid}'")
        self.stdout.write(f"Generating {key_size}-bit RSA keypair for the new active key...")
        new_private = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
        new_priv_b64 = base64.b64encode(
            new_private.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        ).decode("ascii")

        new_retired = existing_retired + [{"kid": old_kid, "public_pem": old_pub_pem}]
        new_retired_b64 = base64.b64encode(
            json.dumps(new_retired).encode("utf-8")
        ).decode("ascii")

        env_lines = {
            "RECEIPT_RSA_PRIVATE_KEY_B64": new_priv_b64,
            "RECEIPT_RSA_KEY_ID": new_kid,
            "RECEIPT_RSA_RETIRED_KEYS_B64": new_retired_b64,
        }

        # Safety net: prove the printed lines load into a ring that makes the new
        # key active AND still verifies the old kid. Fail LOUD before the operator
        # pastes anything, rather than after receipts stop verifying.
        self._verify_loads(env_lines, new_kid, old_kid)

        self.stdout.write("")
        self.stdout.write("-" * 64)
        self.stdout.write("Replace these lines in your .env, then redeploy (keep them secret):")
        self.stdout.write("-" * 64)
        for var, val in env_lines.items():
            self.stdout.write(f"{var}={val}")
        self.stdout.write("-" * 64)
        self.stdout.write(
            "REPLACE the existing RECEIPT_RSA_* lines — do not append. Also remove any "
            "lingering plain RECEIPT_RSA_PRIVATE_KEY: the loader prefers it over the "
            "_B64 form above, which would leave the new key unused."
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Verified: the new key '{new_kid}' is active and the old key "
                f"'{old_kid}' remains verifiable ({len(new_retired)} retired key(s))."
            )
        )
        self.stdout.write(
            "After the new key is live, the OLD private key may be destroyed — only "
            "its public half is retained above, which is all that verification needs."
        )

    def _existing_retired(self):
        """Return the current retired-key list, exactly as stored, or []."""
        blob = os.environ.get(receipt_signing.RETIRED_KEYS_ENV_VAR, "").strip()
        if not blob:
            return []
        try:
            entries = json.loads(base64.b64decode(blob).decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - re-raised as a command error
            raise CommandError(
                f"{receipt_signing.RETIRED_KEYS_ENV_VAR} is set but is not "
                f"base64-encoded JSON: {exc}"
            ) from exc
        if not isinstance(entries, list):
            raise CommandError(
                f"{receipt_signing.RETIRED_KEYS_ENV_VAR} must be a JSON array."
            )
        return entries

    def _verify_loads(self, env_lines, new_kid, old_kid):
        """Load ``env_lines`` in-process and assert the resulting ring is correct."""
        saved = {var: os.environ.get(var) for var in env_lines}
        # The new key is supplied as _B64; a lingering plain PEM would shadow it.
        saved["RECEIPT_RSA_PRIVATE_KEY"] = os.environ.get("RECEIPT_RSA_PRIVATE_KEY")
        try:
            os.environ.pop("RECEIPT_RSA_PRIVATE_KEY", None)
            for var, val in env_lines.items():
                os.environ[var] = val
            receipt_signing.reset_cache()
            active = receipt_signing.active_key_id()
            known = receipt_signing.known_key_ids()
            if active != new_kid:
                raise CommandError(
                    f"Self-check failed: expected new active kid '{new_kid}', got '{active}'."
                )
            if old_kid not in known:
                raise CommandError(
                    f"Self-check failed: old kid '{old_kid}' is not in the rotated "
                    f"ring {known}. Refusing to print lines that would strand old receipts."
                )
        finally:
            for var, val in saved.items():
                if val is None:
                    os.environ.pop(var, None)
                else:
                    os.environ[var] = val
            receipt_signing.reset_cache()
