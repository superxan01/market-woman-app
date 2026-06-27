import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

type CallSessionRow = {
  room_name: string;
  status: string;
  caller_id: string;
  accepted_by: string | null;
};

export async function POST(request: Request) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { callSessionId } = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!bearer || !callSessionId || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !livekitApiKey || !livekitApiSecret || !livekitUrl) {
      return Response.json({ error: "Calling is not configured." }, { status: 503 });
    }

    const auth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await auth.auth.getUser(bearer);

    if (error || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: call, error: callError } = await admin
      .from("call_sessions")
      .select("room_name,status,caller_id,accepted_by")
      .eq("id", callSessionId)
      .single<CallSessionRow>();

    const isAcceptedParticipant = call?.caller_id === user.id || call?.accepted_by === user.id;

    if (callError || !call || call.status !== "active" || !isAcceptedParticipant) {
      return Response.json({ error: "Call access denied" }, { status: 403 });
    }

    const token = new AccessToken(livekitApiKey, livekitApiSecret, { identity: user.id, ttl: "10m" });
    token.addGrant({ roomJoin: true, room: call.room_name, canPublish: true, canSubscribe: true });

    return Response.json({ token: await token.toJwt(), url: livekitUrl });
  } catch {
    return Response.json({ error: "Could not create call token." }, { status: 400 });
  }
}
