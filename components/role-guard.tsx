"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

export function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter(); const [allowed, setAllowed] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("market-woman-role"); if (saved !== role) router.replace("/login"); else setAllowed(true); }, [role, router]);
  return allowed ? <>{children}</> : <main className="checking">Checking your workspace…</main>;
}
