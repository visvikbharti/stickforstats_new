"""Build the downloadable, offline-verifiable receipt artifacts.

* ``build_artifact`` — the self-contained signed-receipt dict (body +
  detached signature + public key PEM + instructions). Used for the
  ``format=json`` download and as the centrepiece of the zip.
* ``build_zip`` — a zip bundling the artifact JSON, the public key PEM, a
  stdlib+``cryptography`` ``verify_receipt.py`` script, and a README, so a
  third party can verify the receipt fully offline with no StickForStats
  server and no account.
"""

from __future__ import annotations

import io
import json
import zipfile

from core.crypto import receipt_signing

# A standalone offline verifier shipped inside every receipt zip. It depends
# only on the Python stdlib plus ``cryptography`` (pip install cryptography),
# and reproduces the exact canonical serialization used at signing time.
VERIFY_SCRIPT = r'''#!/usr/bin/env python3
# Offline verifier for a StickForStats reproducibility receipt.
#
#   python verify_receipt.py receipt-<id>.json [public_key.pem]
#
# Requires: cryptography   (pip install cryptography)
#
# Verifies, with NO network and NO trust in StickForStats:
#   1) the receipt body still hashes to the recorded canonical_payload_hash
#   2) the detached RS256 signature is valid for that body under the public key
import base64
import hashlib
import json
import sys


def canonical_bytes(obj):
    # Must match the server's signing canonicalization exactly.
    return json.dumps(
        obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False
    ).encode("utf-8")


def main():
    if len(sys.argv) < 2:
        print("usage: python verify_receipt.py receipt-<id>.json [public_key.pem]")
        return 2
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        artifact = json.load(fh)

    body = artifact["receipt"]
    signature_b64 = artifact["signature"]["value"]
    expected_hash = artifact.get("canonical_payload_hash")

    if len(sys.argv) >= 3:
        with open(sys.argv[2], "rb") as fh:
            pem = fh.read()
    else:
        pem = artifact.get("public_key_pem", "").encode("utf-8")

    cb = canonical_bytes(body)
    got_hash = hashlib.sha256(cb).hexdigest()
    hash_ok = (got_hash == expected_hash)

    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        public_key = serialization.load_pem_public_key(pem)
        public_key.verify(base64.b64decode(signature_b64), cb, padding.PKCS1v15(), hashes.SHA256())
        sig_ok = True
    except ImportError:
        print("ERROR: install the 'cryptography' package:  pip install cryptography")
        return 2
    except Exception:
        sig_ok = False

    print("receipt_id :", body.get("receipt_id"))
    print("issued_at  :", body.get("issued_at"))
    fp = (body.get("subject") or {}).get("data_fingerprint") or {}
    print("subject hash:", fp.get("hash"))
    print("contents    :", "OK" if hash_ok else "FAIL (recomputed %s vs recorded %s)" % (
        got_hash[:16], (expected_hash or "")[:16]))
    print("signature   :", "OK (RS256)" if sig_ok else "FAIL")
    ok = bool(hash_ok and sig_ok)
    print("")
    print("RESULT:", "VERIFIED" if ok else "NOT VERIFIED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
'''

README = """StickForStats Reproducibility Receipt
=====================================

This zip is a self-contained, independently-verifiable record that a
specific manuscript was checked by StickForStats and what the verdict was.

Files
-----
  receipt-<id>.json   the signed receipt (body + detached RS256 signature +
                      the public key)
  public_key.pem      the RSA public key the signature was made with
  verify_receipt.py   a standalone offline verifier (stdlib + cryptography)

Verify it yourself (no account, no network, no trust in StickForStats)
----------------------------------------------------------------------
  pip install cryptography
  python verify_receipt.py receipt-<id>.json

A "VERIFIED" result means the receipt is authentic and its contents
(the data fingerprint + the verdict) have not been altered since issue.
You can also cross-check the public key against the live JWKS endpoint at
/api/v1/receipt/jwks/.
"""


def build_artifact(receipt) -> dict:
    """Return the self-contained signed-receipt artifact dict."""
    rid = str(receipt.receipt_id)
    return {
        "stickforstats_reproducibility_receipt": receipt.schema_version,
        "receipt": receipt.receipt_json,
        "canonical_payload_hash": receipt.canonical_payload_hash,
        "signature": {
            "alg": receipt.sig_alg,
            "key_id": receipt.key_id,
            "value": receipt.signature,
        },
        "public_key_pem": receipt_signing.public_pem(),
        "jwks_url": "/api/v1/receipt/jwks/",
        "verify_url": f"/api/v1/receipt/verify/{rid}/",
        "verify_instructions": (
            "Offline: pip install cryptography, then "
            "`python verify_receipt.py receipt-<id>.json`. Online: GET the verify_url."
        ),
    }


def build_zip(receipt) -> bytes:
    """Return zip bytes bundling the artifact, public key, verifier, and README."""
    rid = str(receipt.receipt_id)
    artifact = build_artifact(receipt)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"receipt-{rid}.json", json.dumps(artifact, indent=2, ensure_ascii=True))
        zf.writestr("public_key.pem", artifact["public_key_pem"])
        zf.writestr("verify_receipt.py", VERIFY_SCRIPT)
        zf.writestr("README.txt", README)
    return buf.getvalue()
