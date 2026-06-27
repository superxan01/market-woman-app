"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import styles from "./auth.module.css";
import layout from "./layout.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setMessage("MarketApp is not configured yet. Please try again shortly."); return; }
    setBusy(true); setMessage("");
    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName, phone } } });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Check your inbox to confirm your account, then come back here to sign in.");
      else router.push("/customer");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) setMessage(error?.message ?? "We could not sign you in. Check your details and try again.");
      else {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        router.push(`/${(profile?.role ?? "customer") as UserRole}`);
      }
    }
    setBusy(false);
  };

  return <main className={`welcome-shell ${layout.shell}`}>
    <section className={`welcome-copy ${layout.hero}`}>
      <Image className={layout.logo} src="/marketapp-logo.png" alt="MarketApp" width={368} height={273} priority style={{ display: "block", width: "min(255px, 70%)", height: "auto", marginBottom: 44, filter: "drop-shadow(0 10px 18px #00000024)" }} />
      <p className="eyebrow">YOUR LOCAL MARKET, DELIVERED</p>
      <h1>Fresh market shopping,<br /><em>without the running around.</em></h1>
      <p className="lede">Tell us what you need. Our trusted vendors shop it, and a rider brings it to your door.</p>
    </section>
    <section className={`role-panel ${layout.panel}`}>
      <p className="eyebrow">{mode === "sign-in" ? "WELCOME BACK" : "YOUR MARKETAPP ACCOUNT"}</p>
      <h2>{mode === "sign-in" ? "Pick up where you left off" : "Create your customer account"}</h2>
      <p className="muted">Customer accounts are free. Marketplace team accounts are created by the account owner.</p>
      <form className={styles.form} onSubmit={submit}>
        {mode === "sign-up" && <>
          <label className={styles.field}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
          <label className={styles.field}>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </>}
        <label className={styles.field}>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className={styles.field}>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {message && <p className={styles.message}>{message}</p>}
        <button className={styles.submit} disabled={busy}>{busy ? "Please wait..." : mode === "sign-in" ? "Open my MarketApp" : "Create my account"}</button>
      </form>
      {mode === "sign-in" && <Link className={styles.switch} href="/forgot-password">Forgot your password?</Link>}
      <button className={styles.switch} onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "New to MarketApp? Create an account" : "Already have an account? Sign in"}</button>
    </section>
  </main>;
}
