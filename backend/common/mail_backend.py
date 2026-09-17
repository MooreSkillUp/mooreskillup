"""Which email backend to use, decided from configuration alone.

Kept free of Django imports so `config.settings` can call it while it is still
being built, and so the rule can be tested directly rather than by reloading a
settings module and hoping the environment came back clean.
"""

CONSOLE = "django.core.mail.backends.console.EmailBackend"
BREVO = "anymail.backends.brevo.EmailBackend"

# Backends that accept a message and do nothing a recipient would ever see.
_SILENT_SUFFIXES = ("console.EmailBackend", "locmem.EmailBackend", "dummy.EmailBackend")


def choose_email_backend(explicit_backend: str, brevo_api_key: str) -> str:
    """Pick the backend from the API key, not from a second variable.

    Production ran on the console backend for its whole life because
    `EMAIL_BACKEND` was never set in the Terraform while `BREVO_API_KEY` was
    the only thing anyone remembered to configure. Two variables that have to
    agree is one more than the problem needs: having a key *is* the intent to
    send. An explicit backend still wins, for naming a different provider or
    for deliberately silencing mail.
    """
    if explicit_backend:
        return explicit_backend
    if brevo_api_key:
        return BREVO
    return CONSOLE


def sender_address(configured: str, fallback: str) -> str:
    """The From address, treating an empty setting as unset.

    The deploy passes every variable explicitly, so an unset one arrives as an
    empty string rather than being absent — and an empty environment variable
    beats a `getenv` default. Production therefore ran with DEFAULT_FROM_EMAIL
    set to "", which is invisible until the day a Brevo key is added and every
    message is refused for having no sender.
    """
    return configured.strip() or fallback


def backend_delivers(backend: str) -> bool:
    """Whether mail sent through this backend reaches a person.

    Surfaced to admins, because the failure is otherwise invisible: a teacher
    invite carries a generated password, `send()` reports success, and the
    message goes to a container log.
    """
    return not backend.endswith(_SILENT_SUFFIXES)
