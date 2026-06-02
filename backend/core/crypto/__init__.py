"""Cryptographic helpers shared across StickForStats.

* ``canonical`` — deterministic JSON serialization used as the byte-stable
  basis for signing reproducibility receipts.
* ``receipt_signing`` — RS256 (asymmetric) signing + verification so a
  third party can verify a receipt offline against the published public
  key, without trusting the StickForStats server.
"""
