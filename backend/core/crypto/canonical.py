"""Canonical JSON serialization for signed reproducibility receipts.

A receipt's signature is only re-verifiable if the exact bytes that were
signed can be reproduced byte-for-byte by a third party. We therefore
serialize the receipt body with a frozen, deterministic discipline:

* keys sorted (``sort_keys=True``)
* compact, fixed separators (``","`` and ``":"``)
* ``ensure_ascii=True`` so the byte stream is encoding-stable
* ``allow_nan=False`` so NaN/Infinity (which are not valid JSON and whose
  textual form is platform-dependent) can never enter the signed bytes

Numeric *results* must be stringified by the caller before they reach
this function (mirroring ``StatisticalAudit``'s string-precision
convention), so platform float-formatting drift cannot silently change
the canonical bytes and break verification across versions.

This mirrors the ``json.dumps(sort_keys=True)`` discipline already used
in ``core/reproducibility/fingerprinting.py``.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_bytes(payload: Any) -> bytes:
    """Return the canonical UTF-8 byte serialization of a receipt payload.

    Deterministic for a given Python value: the same ``payload`` always
    produces the same bytes, which is what makes the detached signature
    re-verifiable.
    """
    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        allow_nan=False,
    ).encode("utf-8")


def canonical_hash(payload: Any) -> str:
    """SHA-256 hex digest of the canonical serialization of ``payload``."""
    return hashlib.sha256(canonical_bytes(payload)).hexdigest()
