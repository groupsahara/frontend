"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CloseIcon } from "@/src/components/icons";

interface TutorCameraProps {
  onCancel: () => void;
  /** Fires with one JPEG data URL of the captured frame; the stream is already stopped. */
  onCaptured: (dataUrl: string) => void;
}

/**
 * "Mirror me" scanner — a user-initiated webcam preview with a scan-line
 * effect. One frame is captured on click, downscaled to ~512px JPEG, and the
 * camera is released immediately. Nothing records in the background.
 */
export function TutorCamera({ onCancel, onCaptured }: TutorCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      })
      .catch(() => {
        toast.error("Camera not available — allow camera access and try again");
        onCancel();
      });
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [onCancel, stopStream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = 512 / video.videoWidth;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    onCaptured(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/50 p-4 backdrop-blur-sm">
      <div className="w-[min(26rem,94vw)] overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-2xl shadow-indigo-500/30 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-600">Mirror me</p>
            <p className="text-sm text-indigo-950">Let Aanya see you once, then she transforms</p>
          </div>
          <button type="button" onClick={onCancel} className="text-indigo-300 transition-colors hover:text-indigo-700">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-indigo-950">
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          {/* scan line + corner frame */}
          {ready && (
            <>
              <div className="tutor-scanline pointer-events-none absolute inset-x-6 h-0.5 rounded bg-amber-300/90 shadow-[0_0_14px_2px_rgba(251,211,110,0.8)]" />
              <div className="pointer-events-none absolute inset-5 rounded-xl border-2 border-dashed border-white/40" />
            </>
          )}
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-indigo-200">
              Opening camera…
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[11px] leading-snug text-indigo-900/60">
            One photo, analyzed for style only — never stored.
          </p>
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-400 disabled:opacity-40"
          >
            Scan me
          </button>
        </div>
      </div>

      <style>{`
        .tutor-scanline { animation: tutorScan 2.4s ease-in-out infinite alternate; }
        @keyframes tutorScan { from { top: 12%; } to { top: 86%; } }
      `}</style>
    </div>
  );
}
