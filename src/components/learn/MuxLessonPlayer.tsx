"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

export interface MuxPlayback {
  playbackId: string;
  token: string;
  streamUrl: string;
  thumbnailUrl: string;
  signed: boolean;
  expiresIn: number;
}

// Loaded in the browser only. Mux Player is a web component, and it is around
// a hundred kilobytes that nobody reading a text lesson should have to
// download.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

interface Props {
  playback: MuxPlayback;
  title: string;
  /** Where the student had got to, in seconds. */
  startAt?: number;
  onPause?: (positionSeconds: number) => void;
  onEnded?: (positionSeconds: number) => void;
  /** So the page can read the current position when marking a lesson complete. */
  positionRef?: React.MutableRefObject<number>;
}

/**
 * A paid lesson's video, played from a signed URL.
 *
 * The token is minted per request by the backend, after the same entitlement
 * check that decides whether the lesson is visible at all — so a link copied
 * out of this page stops working when the token expires. Nothing here stores
 * it, and there is no download control.
 */
export function MuxLessonPlayer({
  playback,
  title,
  startAt = 0,
  onPause,
  onEnded,
  positionRef,
}: Props) {
  const seeded = useRef(false);

  // A new lesson is a new video, so the resume position applies again.
  useEffect(() => {
    seeded.current = false;
  }, [playback.playbackId]);

  const report = (event: Event, handler?: (seconds: number) => void) => {
    const media = event.currentTarget as unknown as { currentTime?: number };
    const seconds = Math.floor(media?.currentTime ?? 0);
    if (positionRef) positionRef.current = seconds;
    handler?.(seconds);
  };

  return (
    <MuxPlayer
      playbackId={playback.playbackId}
      tokens={playback.token ? { playback: playback.token } : undefined}
      metadata={{ video_title: title }}
      streamType="on-demand"
      accentColor="#FC6203"
      title={title}
      startTime={startAt > 0 ? startAt : undefined}
      className="h-full w-full"
      style={{ aspectRatio: "16 / 9" }}
      onTimeUpdate={(event: Event) => {
        if (!positionRef) return;
        const media = event.currentTarget as unknown as { currentTime?: number };
        positionRef.current = Math.floor(media?.currentTime ?? 0);
      }}
      onPause={(event: Event) => report(event, onPause)}
      onEnded={(event: Event) => report(event, onEnded)}
    />
  );
}
