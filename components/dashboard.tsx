"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { orderRepository } from "@/lib/repositories";
import { customerTrackingStages, statusLabel, trackingStageIndex } from "@/lib/order-state";
import { supabase } from "@/lib/supabase";
import type { DeliveryProof, Order, OrderAttachment, OrderFeedbackSummary, Quote, Rider, TeamMember, UserRole } from "@/lib/types";

type OperationsTab = "orders" | "vendors" | "riders" | "team";
const roleLabel = (role: UserRole) => role.replaceAll("_", " ");
const orderReference = (id: string) => id.startsWith("MW-") ? id : `MW-${id.slice(0, 8).toUpperCase()}`;

export function Dashboard({ role }: { role: UserRole }) {
  const isOperations = role === "super_admin" || role === "support_rep";
  const [activeTab, setActiveTab] = useState<OperationsTab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [vendors, setVendors] = useState<Rider[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [proofs, setProofs] = useState<DeliveryProof[]>([]);
  const [feedback, setFeedback] = useState<OrderFeedbackSummary[]>([]);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [items, setItems] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [quoteValues, setQuoteValues] = useState<Record<string, { amount: string; note: string }>>({});
  const [feedbackValues, setFeedbackValues] = useState<Record<string, { rating: string; comment: string }>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loadedOrders, loadedRiders, loadedVendors, loadedQuotes, loadedAttachments, loadedProofs, loadedFeedback] = await Promise.all([
        orderRepository.listOrders(),
        isOperations ? orderRepository.listRiders() : Promise.resolve([]),
        isOperations ? orderRepository.listVendors() : Promise.resolve([]),
        role === "customer" ? Promise.resolve([]) : orderRepository.listQuotes(),
        orderRepository.listOrderAttachments(),
        orderRepository.listDeliveryProofs(),
        orderRepository.listOrderFeedback()
      ]);
      setOrders(loadedOrders);
      setRiders(loadedRiders);
      setVendors(loadedVendors);
      setQuotes(loadedQuotes);
      setAttachments(loadedAttachments);
      setProofs(loadedProofs);
      setFeedback(loadedFeedback);
      if (isOperations && activeTab === "team") setTeam(await orderRepository.listTeamMembers());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the marketplace data.");
    }
  }, [activeTab, isOperations, role]);

  useEffect(() => { void load(); }, [load]);

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await work(); setMessage(success); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "That update could not be saved."); }
    finally { setBusy(false); }
  };

  const createOrder = async (event: FormEvent) => {
    event.preventDefault();
    const lines = items.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!lines.length || !area.trim()) { setMessage("Add at least one item and your delivery area."); return; }
    await run(async () => {
      const order = await orderRepository.createOrder({ customerName: "", customerPhone: "", items: lines, area, note });
      if (attachment) await orderRepository.uploadOrderAttachment(order.id, attachment);
      setItems(""); setArea(""); setNote(""); setAttachment(null);
    }, attachment ? "Your market request and image attachment have been sent." : "Your market request has been sent.");
  };

  const submitQuote = async (event: FormEvent, orderId: string) => {
    event.preventDefault();
    const quote = quoteValues[orderId];
    const amount = Number(quote?.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a valid quote amount."); return; }
    await run(async () => {
      await orderRepository.createQuote({ orderId, amount, note: quote?.note });
      setQuoteValues((current) => ({ ...current, [orderId]: { amount: "", note: "" } }));
    }, "Quote submitted for review.");
  };

  const signOut = async () => { await supabase?.auth.signOut(); location.href = "/login"; };
  const nav = (tab: OperationsTab, label: string) => <button className={`nav-link ${activeTab === tab ? "selected" : ""}`} onClick={() => setActiveTab(tab)}>{label}</button>;
  const hasRoleEditor = role === "super_admin";

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href={`/${role}`}><span>m</span> market<br />woman</a>
      <p className="sidebar-label">{roleLabel(role).toUpperCase()} WORKSPACE</p>
      {isOperations && <>{nav("orders", "Order queue")}{nav("vendors", "Vendors")}{nav("riders", "Riders")}{nav("team", "Support team")}</>}
      <div className="profile"><span>{role[0].toUpperCase()}</span><div><strong>{roleLabel(role)}</strong><small>authenticated</small></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">LIVE DATABASE</p><h1>{isOperations ? activeTab === "orders" ? "Marketplace control" : activeTab === "vendors" ? "Vendor network" : activeTab === "riders" ? "Rider network" : "Operations team" : role === "customer" ? "Your market list" : role === "vendor" ? "Vendor requests" : "Delivery run"}</h1><p>{isOperations ? "Assign marketplace work and keep every delivery moving." : role === "customer" ? "Create an order and track it from request to delivery." : role === "vendor" ? "Review assigned requests and send a quote." : "Update the delivery once you pick up and complete an order."}</p></div><button className="outline" onClick={signOut}>Sign out</button></header>
      {message && <div className="toast">{message}<button onClick={() => setMessage("")}>×</button></div>}

      {role === "customer" && <section className="order-form-card"><div><p className="eyebrow">NEW ORDER</p><h2>What should we get?</h2><p>One item per line works best. A market woman will review your request before shopping.</p></div><form onSubmit={createOrder} className="order-form"><label>Shopping list<textarea value={items} onChange={(e) => setItems(e.target.value)} placeholder={"Tomatoes × 2 baskets\nRice 5kg\nFresh pepper"} required /></label><label>Delivery area<input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Yaba" required /></label><label>Notes (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preferred substitutions or delivery note" /></label><label>Shopping-list image (optional)<input type="file" accept="image/*" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} /><small>{attachment ? attachment.name : "Attach a clear photo of a handwritten list or reference item."}</small></label><button className="primary" disabled={busy}>Send market request →</button></form></section>}

      {isOperations && activeTab === "vendors" && <Roster title="Vendors" description="Assign new customer requests to a vendor so they can quote." people={vendors} empty="No vendors are registered yet. Promote an existing account from Support team." />}
      {isOperations && activeTab === "riders" && <Roster title="Riders" description="Riders become available for assignment once their account is promoted." people={riders} empty="No riders are registered yet. Promote an existing account from Support team." />}
      {isOperations && activeTab === "team" && <TeamPanel team={team} canEdit={hasRoleEditor} busy={busy} onRoleChange={(id, nextRole) => run(async () => { await orderRepository.updateProfileRole(id, nextRole); }, "Role updated successfully.")} />}

      {(!isOperations || activeTab === "orders") && <section className="orders-section"><div className="section-heading"><div><p className="eyebrow">{isOperations ? "INCOMING ORDERS" : role === "vendor" ? "ASSIGNED REQUESTS" : role === "rider" ? "ACTIVE DELIVERIES" : "ORDER HISTORY"}</p><h2>{isOperations ? "Orders needing attention" : role === "vendor" ? "Requests to quote" : role === "rider" ? "Deliveries in your care" : "Your requests"}</h2></div><span className="count">{orders.length} items</span></div><div className="order-grid">{orders.map((order) => <OrderCard key={order.id} order={order} role={role} riders={riders} vendors={vendors} quotes={quotes.filter((quote) => quote.orderId === order.id)} attachments={attachments.filter((attachment) => attachment.orderId === order.id)} proofs={proofs.filter((proof) => proof.orderId === order.id)} deliveredFeedback={feedback.find((item) => item.orderId === order.id)} proofFile={proofFiles[order.id] ?? null} onProofFile={(file) => setProofFiles((current) => ({ ...current, [order.id]: file }))} onProofUpload={() => run(async () => { const file = proofFiles[order.id]; if (!file) throw new Error("Choose a delivery proof image first."); await orderRepository.uploadDeliveryProof(order.id, file); setProofFiles((current) => ({ ...current, [order.id]: null })); }, "Delivery proof uploaded.")} busy={busy} quote={quoteValues[order.id] ?? { amount: "", note: "" }} feedback={feedbackValues[order.id] ?? { rating: "", comment: "" }} onFeedbackChange={(value) => setFeedbackValues((current) => ({ ...current, [order.id]: { ...current[order.id], ...value } }))} onFeedback={() => run(async () => { const value = feedbackValues[order.id]; const rating = Number(value?.rating); if (!rating) throw new Error("Choose a rating first."); await orderRepository.submitOrderFeedback({ orderId: order.id, rating, comment: value?.comment }); }, "Thank you for rating your delivery.")} onQuoteChange={(value) => setQuoteValues((current) => ({ ...current, [order.id]: { ...current[order.id], ...value } }))} onQuote={(event) => submitQuote(event, order.id)} onAcceptQuote={(quoteId) => run(async () => { await orderRepository.acceptQuote(quoteId); }, "Quote accepted. The order is ready for rider assignment.")} onCancel={() => run(async () => { await orderRepository.cancelOrder(order.id); }, "Order cancelled.")} onVendor={(vendorId) => run(async () => { await orderRepository.assignVendor(order.id, vendorId); }, "Vendor assigned successfully.")} onRider={(riderId) => run(async () => { await orderRepository.assignRider(order.id, riderId); }, "Rider assigned successfully.")} onStatus={(status) => run(async () => { await orderRepository.updateStatus(order.id, status); }, `Order marked ${statusLabel(status).toLowerCase()}.`)} />)}</div>{!orders.length && <div className="empty">No live orders yet. {role === "customer" ? "Create your first market request above." : role === "vendor" ? "Orders assigned to you will appear here." : role === "rider" ? "Assigned deliveries will appear here." : "Orders will appear here as customers submit them."}</div>}</section>}
    </section>
  </main>;
}

function OrderCard({ order, role, riders, vendors, quotes, attachments, proofs, deliveredFeedback, proofFile, onProofFile, onProofUpload, busy, quote, feedback, onFeedbackChange, onFeedback, onQuoteChange, onQuote, onAcceptQuote, onCancel, onVendor, onRider, onStatus }: { order: Order; role: UserRole; riders: Rider[]; vendors: Rider[]; quotes: Quote[]; attachments: OrderAttachment[]; proofs: DeliveryProof[]; deliveredFeedback?: OrderFeedbackSummary; proofFile: File | null; onProofFile: (file: File | null) => void; onProofUpload: () => void; busy: boolean; quote: { amount: string; note: string }; feedback: { rating: string; comment: string }; onFeedbackChange: (value: Partial<{ rating: string; comment: string }>) => void; onFeedback: () => void; onQuoteChange: (value: Partial<{ amount: string; note: string }>) => void; onQuote: (event: FormEvent) => void; onAcceptQuote: (id: string) => void; onCancel: () => void; onVendor: (id: string) => void; onRider: (id: string) => void; onStatus: (status: "picked_up" | "delivered") => void }) {
  const isOperations = role === "super_admin" || role === "support_rep";
  return <article className="order-card"><div className="card-top"><span className={`status ${order.status}`}>{statusLabel(order.status)}</span><small>{orderReference(order.id)}</small></div><h3>{isOperations ? order.customerName : order.area}</h3><p className="area">⌖ {order.area} · {order.createdAt}</p><ul>{order.items.map((item) => <li key={item}>{item}</li>)}</ul>{order.total !== undefined && <p className="order-total">Total approved: <strong>₦{order.total.toLocaleString("en-NG")}</strong></p>}{order.vendor && <p className="assignment">Vendor: <strong>{order.vendor}</strong></p>}{order.rider && <p className="assignment">Rider: <strong>{order.rider}</strong></p>}{order.note && <p className="note">“{order.note}”</p>}
    {role === "customer" && <div className="tracking"><p className="eyebrow">DELIVERY TRACKING</p><div className="tracking-stages">{customerTrackingStages.map((stage, index) => <span className={index <= trackingStageIndex(order.status) ? "done" : ""} key={stage}>{statusLabel(stage)}</span>)}</div></div>}
    {!!attachments.length && <div className="attachments"><p className="eyebrow">ORDER IMAGES</p>{attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">View {attachment.fileName}</a>)}</div>}
    {!!proofs.length && <div className="attachments"><p className="eyebrow">DELIVERY PROOF</p>{proofs.map((proof) => <a key={proof.id} href={proof.url} target="_blank" rel="noreferrer">View {proof.fileName}</a>)}</div>}
    {isOperations && deliveredFeedback && <p className="note">Customer rating: {deliveredFeedback.rating}/5{deliveredFeedback.comment ? ` — ${deliveredFeedback.comment}` : ""}</p>}
    {!!quotes.length && <div className="quote-list"><p className="eyebrow">VENDOR QUOTES</p>{quotes.map((item) => <div className="quote-row" key={item.id}><div><strong>₦{item.amount.toLocaleString("en-NG")}</strong><span>{item.vendor} · {item.status}</span>{item.note && <small>{item.note}</small>}</div>{isOperations && item.status === "pending" && <button className="outline mini" disabled={busy} onClick={() => onAcceptQuote(item.id)}>Accept quote</button>}</div>)}</div>}
    {isOperations && order.status === "requested" && <label className="assign">Assign vendor<select value={order.vendorId ?? ""} onChange={(e) => onVendor(e.target.value)} disabled={busy}><option value="" disabled>Select vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.fullName}</option>)}</select></label>}
    {isOperations && order.status === "confirmed" && <label className="assign">Assign rider<select defaultValue="" onChange={(e) => onRider(e.target.value)} disabled={busy}><option value="" disabled>Select rider</option>{riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.fullName}</option>)}</select></label>}
    {role === "vendor" && order.status === "requested" && <form className="quote-form" onSubmit={onQuote}><label>Quote (₦)<input type="number" min="1" value={quote.amount} onChange={(e) => onQuoteChange({ amount: e.target.value })} required /></label><label>Note<input value={quote.note} onChange={(e) => onQuoteChange({ note: e.target.value })} placeholder="Availability or substitutions" /></label><button className="primary" disabled={busy}>Submit quote</button></form>}
    {role === "rider" && order.status === "assigned" && <button className="primary mini" disabled={busy} onClick={() => onStatus("picked_up")}>Mark picked up</button>}
    {role === "rider" && order.status === "picked_up" && <button className="primary mini" disabled={busy} onClick={() => onStatus("delivered")}>Mark delivered</button>}
    {role === "rider" && order.status === "picked_up" && <div className="quote-form"><label>Delivery proof image<input type="file" accept="image/*" onChange={(e) => onProofFile(e.target.files?.[0] ?? null)} /></label><button className="outline mini" disabled={busy || !proofFile} onClick={onProofUpload}>Upload proof</button></div>}
    {(isOperations || role === "customer") && order.status !== "delivered" && order.status !== "cancelled" && <button className="outline mini" disabled={busy} onClick={onCancel}>Cancel order</button>}
    {role === "customer" && order.status === "delivered" && <div className="quote-form"><label>Rate this delivery<select value={feedback.rating} onChange={(e) => onFeedbackChange({ rating: e.target.value })}><option value="">Choose rating</option><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option></select></label><label>Comment (optional)<input value={feedback.comment} onChange={(e) => onFeedbackChange({ comment: e.target.value })} /></label><button className="primary mini" disabled={busy} onClick={onFeedback}>Send rating</button></div>}
  </article>;
}

function Roster({ title, description, people, empty }: { title: string; description: string; people: Rider[]; empty: string }) {
  return <section className="roster"><p className="eyebrow">NETWORK</p><h2>{title}</h2><p>{description}</p><div className="roster-grid">{people.map((person) => <article key={person.id}><span>{person.fullName[0]}</span><strong>{person.fullName}</strong><small>Available for assignment</small></article>)}</div>{!people.length && <div className="empty">{empty}</div>}</section>;
}

function TeamPanel({ team, canEdit, busy, onRoleChange }: { team: TeamMember[]; canEdit: boolean; busy: boolean; onRoleChange: (id: string, role: UserRole) => void }) {
  return <section className="team-panel"><p className="eyebrow">ACCESS MANAGEMENT</p><h2>People and permissions</h2><p>{canEdit ? "Accounts begin as customers after sign-up. Promote an existing account to vendor, rider, or support rep here." : "Support reps can view the operational roster but cannot change user permissions."}</p><div className="team-table">{team.map((member) => <article key={member.id}><div><strong>{member.fullName}</strong><small>{member.phone ?? "No phone recorded"} · Joined {member.createdAt}</small></div>{canEdit ? <select value={member.role} disabled={busy} onChange={(e) => onRoleChange(member.id, e.target.value as UserRole)}><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="rider">Rider</option><option value="support_rep">Support rep</option><option value="super_admin">Super admin</option></select> : <span className="role-pill">{roleLabel(member.role)}</span>}</article>)}</div>{!team.length && <div className="empty">No user profiles are available yet.</div>}</section>;
}
