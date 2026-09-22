"""Error reports must never carry the student they happened to.

Sentry attaches the signed-in user, cookies and the request body by default.
On a platform holding names, emails and payment records, that turns a crash
report into a data leak, and the privacy policy promises otherwise.
"""

from config.monitoring import init_sentry, scrub, sentry_options


def test_no_personal_data_is_attached_by_default():
    assert sentry_options("https://key@example.ingest.sentry.io/1", "production")["send_default_pii"] is False


def test_tracing_is_off():
    """Error reporting only: tracing would spend the free allowance elsewhere."""
    assert sentry_options("https://key@example.ingest.sentry.io/1", "production")["traces_sample_rate"] == 0.0


def test_the_signed_in_person_is_stripped_from_a_report():
    event = {"user": {"email": "ada@example.com", "id": "42"}, "exception": {}}

    assert "user" not in scrub(event, None)


def test_cookies_the_body_and_the_query_string_are_stripped():
    """Cookies carry the session; the body carries passwords; the query string
    carries certificate and referral codes."""
    event = {
        "request": {
            "url": "https://app.example.com/api/auth/login/",
            "cookies": {"sessionid": "abc"},
            "data": {"email": "ada@example.com", "password": "hunter2"},
            "query_string": "code=MSU-88397A19",
        }
    }

    request = scrub(event, None)["request"]

    assert "cookies" not in request
    assert "data" not in request
    assert "query_string" not in request
    # The path stays: it is what makes a report useful.
    assert request["url"].endswith("/api/auth/login/")


def test_authorisation_headers_are_stripped_but_useful_ones_stay():
    event = {
        "request": {
            "headers": {
                "Authorization": "Bearer abc.def",
                "Cookie": "sessionid=abc",
                "X-Api-Key": "secret",
                "User-Agent": "Chrome on Android",
            }
        }
    }

    headers = scrub(event, None)["request"]["headers"]

    assert set(headers) == {"User-Agent"}


def test_nothing_is_reported_when_no_dsn_is_configured(monkeypatch):
    """A laptop and the test suite must report nowhere."""
    monkeypatch.delenv("SENTRY_DSN", raising=False)

    assert init_sentry("development") is False
