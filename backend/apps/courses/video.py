from urllib.parse import parse_qs, urlparse

from rest_framework import serializers


DIRECT_VIDEO_EXTENSIONS = (".mp4", ".webm", ".ogg", ".m3u8")


def _looks_like_direct_video(path: str) -> bool:
    lower_path = (path or "").lower()
    return any(lower_path.endswith(extension) for extension in DIRECT_VIDEO_EXTENSIONS)


def build_embed_url(video_url: str) -> str:
    if not video_url:
        return ""

    parsed = urlparse(video_url)
    host = (parsed.netloc or "").lower()

    if "youtu.be" in host:
        video_id = parsed.path.strip("/")
        return f"https://www.youtube.com/embed/{video_id}" if video_id else ""

    if "youtube.com" in host:
        video_id = parse_qs(parsed.query).get("v", [""])[0]
        if not video_id and "/embed/" in parsed.path:
            video_id = parsed.path.split("/embed/")[-1].split("/")[0]
        return f"https://www.youtube.com/embed/{video_id}" if video_id else ""

    if "vimeo.com" in host:
        video_id = parsed.path.strip("/").split("/")[0]
        return f"https://player.vimeo.com/video/{video_id}" if video_id else ""

    if _looks_like_direct_video(parsed.path):
        return video_url

    return ""


def validate_video_url(video_url: str) -> str:
    if not video_url:
        return video_url
    if build_embed_url(video_url):
        return video_url
    raise serializers.ValidationError(
        "Use a valid YouTube, Vimeo, or direct video file URL so learners can view it inside the platform."
    )
