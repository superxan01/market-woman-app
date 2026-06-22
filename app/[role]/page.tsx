"use client";

import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { Dashboard } from "@/components/dashboard";
import { isUserRole } from "@/lib/types";

export default function RoleDashboard() {
  const { role } = useParams<{ role: string }>();
  if (!isUserRole(role)) return null;
  return <RoleGuard role={role}><Dashboard role={role} /></RoleGuard>;
}
