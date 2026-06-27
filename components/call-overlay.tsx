"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { supabase } from "@/lib/supabase";
import { useMediaPermission } from "@/hooks/use-media-permission";
import styles from "./call-overlay.module.css";

const terminalCallStatuses = ["rejected", "missed", "ended", "failed"];

export function CallOverlay({ callSessionId, onEnd }: { callSessionId: string; onEnd: () => void }) {
  const [status, setStatus] = useState("Connecting");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const roomRef = useRef<Room | undefined>(undefined);
  const { request, stop } = useMediaPermission();

  useEffect(() => {
    const clock = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    let cancelled = false;
    let statusChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | undefined;

    const waitForActiveCall = async () => {
      const { data, error } = await supabase!
        .from("call_sessions")
        .select("status")
        .eq("id", callSessionId)
        .single();

      if (error) throw new Error("Could not read call status");
      if (data.status === "active") return;
      if (terminalCallStatuses.includes(data.status)) throw new Error(`Call ${data.status}`);

      setStatus("Ringing");

      await new Promise<void>((resolve, reject) => {
        statusChannel = supabase!
          .channel(`call-status:${callSessionId}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions", filter: `id=eq.${callSessionId}` }, (payload) => {
            const nextStatus = (payload.new as { status?: string }).status;
            if (nextStatus === "active") resolve();
            if (nextStatus && terminalCallStatuses.includes(nextStatus)) reject(new Error(`Call ${nextStatus}`));
          })
          .subscribe();
      });
    };

    void (async () => {
      try {
        await waitForActiveCall();
        if (cancelled) return;
        await request();
        const token = (await supabase?.auth.getSession())?.data.session?.access_token;
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token || ""}` },
          body: JSON.stringify({ callSessionId })
        });
        const payload = await response.json();

        if (!response.ok || !payload.token) throw new Error(payload.error);
        if (cancelled) return;

        const room = new Room();
        roomRef.current = room;
        room.on(RoomEvent.Reconnecting, () => setStatus("Reconnecting"));
        room.on(RoomEvent.Reconnected, () => setStatus("Connected"));
        room.on(RoomEvent.Disconnected, onEnd);
        await room.connect(payload.url, payload.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setStatus("Connected");
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Call failed");
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(clock);
      void statusChannel?.unsubscribe();
      roomRef.current?.disconnect();
      roomRef.current = undefined;
      stop();
    };
  }, [callSessionId, onEnd, request, stop]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(!nextMuted);
    } catch {
      setStatus("Could not update microphone");
    }
  }, [muted]);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.avatar}>M</div>
        <p className={styles.status}>{status}</p>
        <h1>MarketApp Support</h1>
        <p className={styles.timer}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
        <div className={styles.actions}>
          <button className={styles.action} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
          <button className={`${styles.action} ${styles.end}`} onClick={onEnd}>End</button>
        </div>
      </div>
    </div>
  );
}
