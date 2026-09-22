"""The health address, which an outside monitor watches every few minutes.

What matters: a stranger can call it, it fails when the database fails, and it
gives nothing away. A monitor that reports "up" during an outage is worse than
no monitor, because it buys false calm.
"""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


def test_a_stranger_gets_ok_while_the_database_answers(db, client):
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.data == {"status": "ok", "database": True}


def test_it_reports_down_when_the_database_cannot_be_reached(db, client):
    with patch("apps.platform.health.connection.cursor", side_effect=OSError("no route")):
        response = client.get("/api/health/")

    assert response.status_code == 503
    assert response.data["database"] is False


def test_it_gives_nothing_away(db, client):
    """Public and unauthenticated, so it must carry no detail worth having."""
    body = client.get("/api/health/").data

    assert set(body) == {"status", "database"}


def test_repeated_checks_are_never_throttled(db, client):
    """A monitor calls this on a timer; a 429 would read as an outage."""
    assert all(client.get("/api/health/").status_code == 200 for _ in range(30))
