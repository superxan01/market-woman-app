"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "../login/auth.module.css";
import layout from "../login/layout.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your reset link...");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage("MarketApp is not configured yet. Please try again shortly.");
      return;
    }

    const authClient = supabase;
    let mounted = true;

    const checkSession = async () => {
      const { data } = await authClient.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        setReady(true);
        setMessage("");
      } else {
        setReady(false);
        setMessage("This reset link is invalid or has expired. Please request a new one.");
      }
    };

    const { data: listener } = authClient.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setMessage("");
      }
    });

    void checkSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !ready) return;

    if (password.length < 6) {
      setMessage("Use at least 6 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setMessage("Your password has been updated. Redirecting you to sign in...");
      await supabase.auth.signOut();
      window.setTimeout(() => router.push("/login"), 1800);
    } catch {
      setMessage("We could not update your password. The link may have expired, or the password may be too weak.");
    } finally {
      setBusy(false);
    }
  };

  return <main className={`welcome-shell ${layout.shell}`}>
    <section className={`welcome-copy ${layout.hero}`}>
      <Image className={layout.logo} src="/marketapp-logo.png" alt="MarketApp" width={368} height={273} priority style={{ display: "block", width: "min(255px, 70%)", height: "auto", marginBottom: 44, filter: "drop-shadow(0 10px 18px #00000024)" }} />
      <p className="eyebrow">SECURE RESET</p>
      <h1>Choose a fresh<br /><em>MarketApp password.</em></h1>
      <p className="lede">Keep your account protected with a password only you know.</p>
    </section>
    <section className={`role-panel ${layout.panel}`}>
      <p className="eyebrow">NEW PASSWORD</p>
      <h2>{success ? "Password updated" : "Set your new password"}</h2>
      <p className="muted">Use at least 6 characters. Avoid passwords you use elsewhere.</p>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>New password<input type="password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!ready || busy || success} required /></label>
        <label className={styles.field}>Confirm password<input type="password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={!ready || busy || success} required /></label>
        {message && <p className={styles.message} role="status">{message}</p>}
        <button className={styles.submit} disabled={!ready || busy || success}>{busy ? "Updating password..." : "Update password"}</button>
      </form>
      <Link className={styles.switch} href="/forgot-password">Request a new reset link</Link>
      <Link className={styles.switch} href="/login">Back to sign in</Link>
    </section>
  </main>;
}
