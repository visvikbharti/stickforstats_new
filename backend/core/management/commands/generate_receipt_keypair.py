"""
Django management command: generate a 2048-bit RSA keypair for signing
reproducibility receipts.

Writes a PEM file an operator can paste into the ``RECEIPT_RSA_PRIVATE_KEY``
environment variable, plus the matching public JWKS (so it can be
cross-checked against ``GET /api/v1/receipt/jwks/``).

Usage::

    python manage.py generate_receipt_keypair --output receipt_private.pem
    # then:
    export RECEIPT_RSA_PRIVATE_KEY="$(cat receipt_private.pem)"
    export RECEIPT_RSA_KEY_ID="stickforstats-receipt-key-1"

A stable key is required in production so receipts stay verifiable across
process restarts. Without it, an ephemeral key is generated on each restart
and receipts signed earlier will no longer verify.
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.core.management.base import BaseCommand, CommandError

from core.crypto.receipt_signing import _int_to_b64url


class Command(BaseCommand):
    help = (
        "Generate a 2048-bit RSA keypair for reproducibility-receipt signing. "
        "Writes the private key PEM to a file (or stdout) and prints the "
        "matching public JWKS for verification."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            "-o",
            type=str,
            default=None,
            help="Path to write the PEM-encoded private key. Use '-' for stdout.",
        )
        parser.add_argument(
            "--kid",
            type=str,
            default="stickforstats-receipt-key-1",
            help="Key ID (kid) to embed in the JWKS document.",
        )
        parser.add_argument(
            "--key-size",
            type=int,
            default=2048,
            help="RSA key size in bits (default 2048; minimum 2048 enforced).",
        )
        parser.add_argument(
            "--env",
            action="store_true",
            help=(
                "Print the ready-to-paste .env lines (RECEIPT_RSA_PRIVATE_KEY_B64 and "
                "RECEIPT_RSA_KEY_ID) instead of the raw PEM. This is the form a "
                "docker-compose .env file can hold, since it is a single line."
            ),
        )

    def handle(self, *args, **options):
        key_size = options["key_size"]
        if key_size < 2048:
            raise CommandError("Refusing to generate an RSA key smaller than 2048 bits.")

        kid = options["kid"]
        output = options["output"]

        if options["env"] and output:
            raise CommandError("--env and --output are mutually exclusive.")

        self.stdout.write(f"Generating {key_size}-bit RSA keypair...")
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
        public_key = private_key.public_key()

        pem_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        if options["env"]:
            b64 = base64.b64encode(pem_bytes).decode("ascii")
            self.stdout.write("")
            self.stdout.write("-" * 60)
            self.stdout.write("Add these two lines to your .env (keep them secret):")
            self.stdout.write("-" * 60)
            self.stdout.write(f"RECEIPT_RSA_PRIVATE_KEY_B64={b64}")
            self.stdout.write(f"RECEIPT_RSA_KEY_ID={kid}")
        elif output == "-":
            self.stdout.write(pem_bytes.decode("ascii"))
        elif output:
            path = Path(output)
            if path.exists():
                raise CommandError(
                    f"Refusing to overwrite existing file: {path}. "
                    "Delete it first or pick a different --output path."
                )
            path.write_bytes(pem_bytes)
            try:
                path.chmod(0o600)
            except Exception:
                pass
            self.stdout.write(self.style.SUCCESS(f"Private key written to {path}"))
            self.stdout.write(
                "Set the env var:\n"
                f'  export RECEIPT_RSA_PRIVATE_KEY="$(cat {path})"\n'
                f'  export RECEIPT_RSA_KEY_ID="{kid}"\n'
            )
        else:
            self.stdout.write("-" * 60)
            self.stdout.write("PRIVATE KEY (PEM, PKCS8):")
            self.stdout.write("-" * 60)
            self.stdout.write(pem_bytes.decode("ascii"))

        public_numbers = public_key.public_numbers()
        jwks = {
            "keys": [
                {
                    "kty": "RSA",
                    "alg": "RS256",
                    "use": "sig",
                    "kid": kid,
                    "n": _int_to_b64url(public_numbers.n),
                    "e": _int_to_b64url(public_numbers.e),
                }
            ]
        }
        self.stdout.write("")
        self.stdout.write("-" * 60)
        self.stdout.write("PUBLIC JWKS (cross-check against GET /api/v1/receipt/jwks/):")
        self.stdout.write("-" * 60)
        self.stdout.write(json.dumps(jwks, indent=2))
