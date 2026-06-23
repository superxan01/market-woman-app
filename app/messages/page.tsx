"use client";
import { useEffect,useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { ChatPanel } from "@/components/chat-panel";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
export default function MessagesPage(){const [role,setRole]=useState<UserRole>();useEffect(()=>{void (async()=>{const {data:{user}}=await supabase!.auth.getUser();if(!user)return;const {data}=await supabase!.from("profiles").select("role").eq("id",user.id).single();setRole(data?.role as UserRole);})();},[]);return role?<RoleGuard role={role}><main className="content"><ChatPanel /></main></RoleGuard>:<main className="checking">Loading messages...</main>}
