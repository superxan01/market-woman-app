"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) { setMessage("Supabase is not configured."); return; }
    setBusy(true); setMessage("");
    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      else router.push("/customer");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) setMessage(error?.message ?? "Could not sign in.");
      else {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        router.push(`/${(profile?.role ?? "customer") as UserRole}`);
      }
    }
    setBusy(false);
  };
  return <main className="welcome-shell"><section className="welcome-copy"><p className="eyebrow">MARKET WOMAN · LAGOS</p><h1>Good market days,<br /><em>made dependable.</em></h1><p className="lede">Order market essentials, respond to requests, and keep deliveries moving from one trusted workspace.</p></section><section className="role-panel"><p className="eyebrow">{mode === "sign-in" ? "WELCOME BACK" : "CREATE CUSTOMER ACCOUNT"}</p><h2>{mode === "sign-in" ? "Sign in to your workspace" : "Start shopping smarter"}</h2><p className="muted">Admin accounts are created by the marketplace owner.</p><form className={styles.form} onSubmit={submit}>{mode === "sign-up" && <><label className={styles.field}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label><label className={styles.field}>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label></>}<label className={styles.field}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className={styles.field}>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{message && <p className={styles.message}>{message}</p>}<button className={styles.submit} disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in →" : "Create customer account →"}</button></form><button className={styles.switch} onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "New here? Create a customer account" : "Already have an account? Sign in"}</button></section></main>;
}
