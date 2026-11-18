"""Who the manuscript tools say they are when they ask a public archive for a file.

NCBI and other public archives ask automated clients to name themselves and to give a contact
address, so that the archive can reach whoever runs a client that misbehaves. The address is the
operator's to give: it is read from the environment variable STICKFORSTATS_CONTACT_EMAIL. It is
empty by default, and then no address is sent. No address is written into the code; one was, and
every installation sent it with every request.
"""

import os
import re

CONTACT_SETTING = "STICKFORSTATS_CONTACT_EMAIL"
# One address, nothing else: a value with a space, a line break or a bracket is not sent.
_ADDRESS = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$")


def contact_address() -> str:
    """The operator's contact address, or "" when none is set or the value is not one address."""
    value = os.environ.get(CONTACT_SETTING, "").strip()
    return value if _ADDRESS.match(value) else ""


def user_agent(client: str) -> dict:
    """The User-Agent header for `client` (its name and version), read at the time of the request."""
    address = contact_address()
    return {"User-Agent": f"{client} (research; mailto:{address})" if address else f"{client} (research)"}
