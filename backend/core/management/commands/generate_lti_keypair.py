"""
Django management command: generate a 2048-bit RSA keypair for LTI tool signing.

Writes a PEM file an operator can paste into the ``LTI_RSA_PRIVATE_KEY``
environment variable, plus an info dump showing the public key in JWKS
form (so it can be cross-checked against ``GET /api/v1/lti/jwks/``).

Usage::

    python manage.py generate_lti_keypair --output lti_private.pem
    # then:
    export LTI_RSA_PRIVATE_KEY="$(cat lti_private.pem)"
    export LTI_RSA_KEY_ID="stickforstats-lti-key-1"
"""

from __future__ import annotations

import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.core.management.base import BaseCommand, CommandError

from core.services.lti_keys import _int_to_b64url


class Command(BaseCommand):
    help = (
        "Generate a 2048-bit RSA keypair for LTI 1.3 tool signing. "
        "Writes the private key PEM to a file (or stdout) and prints "
        "the matching public JWKS for verification."
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
            default="stickforstats-lti-key-1",
            help="Key ID (kid) to embed in the JWKS document.",
        )
        parser.add_argument(
            "--key-size",
            type=int,
            default=2048,
            help="RSA key size in bits (default 2048; minimum 2048 enforced).",
        )

    def handle(self, *args, **options):
        key_size = options["key_size"]
        if key_size < 2048:
            raise CommandError("Refusing to generate an RSA key smaller than 2048 bits.")

        kid = options["kid"]
        output = options["output"]

        self.stdout.write(f"Generating {key_size}-bit RSA keypair...")
        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=key_size
        )
        public_key = private_key.public_key()

        pem_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        if output == "-":
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
                # Tighten permissions so the key isn't world-readable.
                path.chmod(0o600)
            except Exception:
                pass
            self.stdout.write(self.style.SUCCESS(f"Private key written to {path}"))
            self.stdout.write(
                "Set the env var:\n"
                f'  export LTI_RSA_PRIVATE_KEY="$(cat {path})"\n'
                f'  export LTI_RSA_KEY_ID="{kid}"\n'
            )
        else:
            # Print to stdout with a banner so it's clearly delimited.
            self.stdout.write("-" * 60)
            self.stdout.write("PRIVATE KEY (PEM, PKCS8):")
            self.stdout.write("-" * 60)
            self.stdout.write(pem_bytes.decode("ascii"))

        # Always print the matching public JWKS for verification.
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
        self.stdout.write("PUBLIC JWKS (matches /api/v1/lti/jwks/ once env var is set):")
        self.stdout.write("-" * 60)
        self.stdout.write(json.dumps(jwks, indent=2))
        return None
