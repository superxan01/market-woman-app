"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "../login/auth.module.css";
import layout from "../login/layout.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const recoveryMessage = "If that email is registered with MarketApp, a password reset link will arrive shortly.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (!supabase) {
      setMessage("MarketApp is not configured yet. Please try again shortly.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setEmail("");
      setMessage(recoveryMessage);
    } catch {
      setMessage("We could not send the reset link right now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return <main className={`welcome-shell ${layout.shell}`}>
    <section className={`welcome-copy ${layout.hero}`}>
      <Image className={layout.logo} src="/marketapp-logo.png" alt="MarketApp" width={368} height={273} priority style={{ display: "block", width: "min(255px, 70%)", height: "auto", marginBottom: 44, filter: "drop-shadow(0 10px 18px #00000024)" }} />
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Get back to your<br /><em>market desk.</em></h1>
      <p className="lede">Enter your email and we will send a secure link to reset your password.</p>
    </section>
    <section className={`role-panel ${layout.panel}`}>
      <p className="eyebrow">PASSWORD HELP</p>
      <h2>Reset your password</h2>
      <p className="muted">For your security, we show the same confirmation whether or not an email exists.</p>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {message && <p className={styles.message} role="status">{message}</p>}
        <button className={styles.submit} disabled={busy}>{busy ? "Sending reset link..." : "Send reset link"}</button>
      </form>
      <Link className={styles.switch} href="/login">Back to sign in</Link>
    </section>
  </main>;
}
