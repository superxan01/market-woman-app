"use client";
import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { supabase } from "@/lib/supabase";
import { useMediaPermission } from "@/hooks/use-media-permission";
export function CallOverlay({ callSessionId, onEnd }: { callSessionId:string; onEnd:()=>void }) {
  const [status,setStatus]=useState("Connecting..."); const {request,stop}=useMediaPermission();
  useEffect(()=>{ let room:Room|undefined; void (async()=>{try { await request(); const accessToken=(await supabase?.auth.getSession())?.data.session?.access_token; const response=await fetch("/api/livekit/token",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${accessToken||""}`},body:JSON.stringify({callSessionId})}); const payload=await response.json(); if(!payload.token) throw new Error(payload.error||"Call unavailable"); room=new Room(); room.on(RoomEvent.Reconnecting,()=>setStatus("Reconnecting...")); room.on(RoomEvent.Reconnected,()=>setStatus("Connected")); room.on(RoomEvent.Disconnected,onEnd); await room.connect(payload.url,payload.token); await room.localParticipant.setMicrophoneEnabled(true); setStatus("Connected"); } catch(error){setStatus(error instanceof Error?error.message:"Could not connect call");}})(); return()=>{room?.disconnect();stop();};},[callSessionId,onEnd,request,stop]);
  return <div className="toast"><strong>Voice call</strong><br/>{status}<button onClick={onEnd}>End call</button></div>;
}
