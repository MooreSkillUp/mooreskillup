export type VideoRenderMode = "iframe" | "native" | "none";

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".m3u8"];

function looksLikeDirectVideoPath(pathname: string) {
  const lowerPath = pathname.toLowerCase();
  return DIRECT_VIDEO_EXTENSIONS.some((extension) => lowerPath.endsWith(extension));
}

export function getVideoRenderMode(videoUrl: string): VideoRenderMode {
  if (!videoUrl) return "none";

  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be") || host.includes("youtube.com") || host.includes("vimeo.com")) {
      return "iframe";
    }

    if (looksLikeDirectVideoPath(parsed.pathname)) {
      return "native";
    }
  } catch {
    return "none";
  }

  return "none";
}

export function getEmbeddedVideoUrl(videoUrl: string) {
  if (!videoUrl) return "";

  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const videoId = parsed.pathname.replace(/^\/+/, "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? "";
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (host.includes("vimeo.com")) {
      const videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }

    if (looksLikeDirectVideoPath(parsed.pathname)) {
      return videoUrl;
    }
  } catch {
    return "";
  }

  return "";
}

export function isSupportedEmbeddedVideoUrl(videoUrl: string) {
  return getVideoRenderMode(videoUrl) !== "none";
}
