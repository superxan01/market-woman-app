"use client";

import { useRouter } from "next/navigation";
import { roles, type UserRole } from "@/lib/types";

const roleCopy: Record<UserRole, string> = {
  admin: "Manage the marketplace and keep every order moving.",
  vendor: "Respond to shopping requests and submit your best quote.",
  rider: "Pick up assigned deliveries and keep customers updated.",
  customer: "Send your market list and follow every order with ease."
};

export default function LoginPage() {
  const router = useRouter();
  const choose = (role: UserRole) => {
    localStorage.setItem("market-woman-role", role);
    router.push(`/${role}`);
  };
  return <main className="welcome-shell">
    <section className="welcome-copy">
      <p className="eyebrow">MARKET WOMAN · LAGOS</p>
      <h1>Good market days,<br /><em>made dependable.</em></h1>
      <p className="lede">A calm command centre for the people who make local trade work: customers, market vendors, riders, and the team connecting them.</p>
      <div className="promise"><span>●</span> Built for quick decisions, not busywork.</div>
    </section>
    <section className="role-panel">
      <p className="eyebrow">DEMO ACCESS</p><h2>Where are you working today?</h2>
      <p className="muted">Choose a role to explore the MVP workflow.</p>
      <div className="role-grid">{roles.map((role) => <button className="role-card" key={role} onClick={() => choose(role)}>
        <span className="role-icon">{({ admin: "◎", vendor: "◈", rider: "↗", customer: "♡" } as Record<UserRole,string>)[role]}</span>
        <span><strong>{role[0].toUpperCase() + role.slice(1)}</strong><small>{roleCopy[role]}</small></span><b>→</b>
      </button>)}</div>
      <p className="demo-note">Mock data only — Supabase authentication comes in the production-ready phase.</p>
    </section>
  </main>;
}
