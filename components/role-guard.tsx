"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

export function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) { router.replace("/login"); return; }
    const verify = async () => {
      const { data } = await client.auth.getUser();
      if (!data.user) { router.replace("/login"); return; }
      const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!profile) { router.replace("/login"); return; }
      if (profile.role !== role) { router.replace(`/${profile.role}`); return; }
      setAllowed(true);
    };
    verify();
  }, [role, router]);

  return allowed ? <>{children}</> : <main className="checking">Loading your workspace…</main>;
}
