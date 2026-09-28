"""Playing a paid lesson without handing out a shareable link.

Until now a lesson stored a plain URL. It was hidden from people who had not
paid, but a student who had paid could copy it out of the page and send it to
anyone — which is the whole problem with selling video.

Mux playback is by signed token instead: the URL alone plays nothing. The
backend mints a short-lived token, and only after the same entitlement check
that decides whether the lesson is visible at all. A copied link stops working
when the token expires, which is the point.
"""

import base64
import time
from urllib.parse import urlparse

from django.conf import settings
from rest_framework import serializers

# How long a minted token lasts. Long enough to watch a lesson and pause for
# lunch; short enough that a link pasted into a group chat is dead before
# anybody clicks it.
TOKEN_TTL_SECONDS = 4 * 60 * 60

MUX_STREAM_HOST = "stream.mux.com"
MUX_IMAGE_HOST = "image.mux.com"


def is_configured():
    """Whether this deployment can sign anything at all."""
    return bool(
        getattr(settings, "MUX_SIGNING_KEY_ID", "")
        and getattr(settings, "MUX_SIGNING_KEY_PRIVATE", "")
    )


def playback_id_from(value):
    """Pull a playback id out of whatever was pasted.

    Teachers paste what they have in front of them: sometimes the bare id from
    the Mux dashboard, sometimes a stream URL, sometimes a player URL. All
    three mean the same thing, and refusing two of them teaches people that the
    field is fussy rather than that they made a mistake.
    """
    raw = (value or "").strip()
    if not raw:
        return ""

    if "://" not in raw:
        # A bare id: letters, digits and the occasional dash or underscore.
        return raw if _looks_like_playback_id(raw) else ""

    parsed = urlparse(raw)
    host = (parsed.netloc or "").lower()
    if MUX_STREAM_HOST not in host and MUX_IMAGE_HOST not in host:
        return ""

    first_segment = parsed.path.strip("/").split("/")[0]
    # stream.mux.com/<id>.m3u8 and image.mux.com/<id>/thumbnail.jpg
    candidate = first_segment.split(".")[0]
    return candidate if _looks_like_playback_id(candidate) else ""


def _looks_like_playback_id(value):
    return bool(value) and len(value) >= 12 and all(
        char.isalnum() or char in "-_" for char in value
    )


def looks_like_mux(value):
    return bool(playback_id_from(value))


def sign_playback(playback_id, *, audience="v", ttl=TOKEN_TTL_SECONDS):
    """A token that lets one person watch one thing for a while.

    `audience` is Mux's own short code for what the token unlocks: "v" for the
    video, "t" for a thumbnail, "s" for a storyboard. Each needs its own token,
    which is why this takes the argument rather than assuming video.

    Returns "" when the deployment has no signing key. That is deliberate: a
    local checkout without Mux credentials should fall back to the unsigned
    handling rather than crash a lesson page.
    """
    if not playback_id or not is_configured():
        return ""

    import jwt

    key = settings.MUX_SIGNING_KEY_PRIVATE
    # Mux hands the private key out base64-encoded. Accept it either way,
    # because whoever sets the variable will paste whichever they were shown.
    if "BEGIN" not in key:
        try:
            key = base64.b64decode(key).decode("utf-8")
        except (ValueError, UnicodeDecodeError) as exc:
            raise RuntimeError(
                "MUX_SIGNING_KEY_PRIVATE is neither a PEM key nor base64 of one."
            ) from exc

    now = int(time.time())
    return jwt.encode(
        {
            "sub": playback_id,
            "aud": audience,
            "exp": now + ttl,
            "kid": settings.MUX_SIGNING_KEY_ID,
        },
        key,
        algorithm="RS256",
        headers={"kid": settings.MUX_SIGNING_KEY_ID},
    )


def playback_payload(playback_id):
    """Everything the player needs for one lesson, or empty if it has no video.

    The stream URL is included already signed so the frontend never has to know
    how a Mux URL is assembled, and the token is never put anywhere but here.
    """
    if not playback_id:
        return None

    token = sign_playback(playback_id)
    thumbnail_token = sign_playback(playback_id, audience="t")
    stream = f"https://{MUX_STREAM_HOST}/{playback_id}.m3u8"
    thumbnail = f"https://{MUX_IMAGE_HOST}/{playback_id}/thumbnail.jpg"

    return {
        "playbackId": playback_id,
        "token": token,
        "streamUrl": f"{stream}?token={token}" if token else stream,
        "thumbnailUrl": f"{thumbnail}?token={thumbnail_token}" if thumbnail_token else thumbnail,
        "signed": bool(token),
        "expiresIn": TOKEN_TTL_SECONDS if token else 0,
    }


def validate_playback_id(value):
    """Serializer-side check, with a message that says what to paste."""
    if not value:
        return ""
    playback_id = playback_id_from(value)
    if not playback_id:
        raise serializers.ValidationError(
            "That does not look like a Mux playback ID. Copy it from the asset in your Mux "
            "dashboard, or paste the stream.mux.com link."
        )
    return playback_id
