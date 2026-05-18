import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => "RM " + Number(n).toFixed(2);
const fmtNum = (n) => Number(n).toFixed(2);

const MEMBER_COLORS = [
  "#FF6B6B","#FFD166","#06D6A0","#118AB2",
  "#7B2FBE","#F4845F","#2EC4B6","#E84393",
];

// ── useAnimatedMount ──────────────────────────────────────────────────────────
function useAnimatedMount(active) {
  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [active]);

  return { mounted, visible };
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} ${t.visible ? "toast-in" : "toast-out"}`}>
          <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 32 }) {
  return (
    <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.42, minWidth: size }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  const steps = ["Setup", "Items", "Charges", "Results"];
  return (
    <div className="progress-bar-wrap">
      {steps.map((s, i) => (
        <div key={s} className="progress-step-wrap">
          <div className={`progress-dot ${i < step ? "done" : i === step ? "active" : ""}`}>
            {i < step ? "✓" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`progress-line ${i < step ? "done" : ""}`} />
          )}
        </div>
      ))}
      <div className="progress-labels">
        {steps.map((s, i) => (
          <span key={s} className={`progress-label ${i === step ? "active" : ""}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── EmailModal ────────────────────────────────────────────────────────────────
function EmailModal({ onClose, members, items, charges, billName, owes, transfers, grandTotal }) {
  const [emailData, setEmailData] = useState(() =>
    members.reduce((acc, m) => ({ ...acc, [m.id]: "" }), {})
  );
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});

  const buildMailtoBody = (member) => {
    const memberItems = items
      .filter(it => it.assignedTo.includes(member.id))
      .map(it => {
        const share = it.splitMode === "custom"
          ? (it.customAmounts[member.id] || 0)
          : it.price / it.assignedTo.length;
        return `  • ${it.name}: RM ${fmtNum(share)}`;
      }).join("\n");

    const myTransfers = transfers.filter(t => t.from.id === member.id || t.to.id === member.id);
    const settleLines = myTransfers.length
      ? myTransfers.map(t =>
          t.from.id === member.id
            ? `  → You pay ${t.to.name}: RM ${fmtNum(t.amt)}`
            : `  → ${t.from.name} pays you: RM ${fmtNum(t.amt)}`
        ).join("\n")
      : "  ✓ You're all square!";

    return encodeURIComponent(
`Hey ${member.name}! 🦅

Here's your bill summary for "${billName || "our session"}":

YOUR ITEMS:
${memberItems || "  (none assigned)"}

YOUR TOTAL: RM ${fmtNum(owes[member.id] || 0)}

SETTLE UP:
${settleLines}

GRAND TOTAL: RM ${fmtNum(grandTotal)}

Sent via BillKaw 🦅 — Split Bills, Not Friendships`
    );
  };

  const openMailto = (member) => {
    const email = emailData[member.id]?.trim();
    if (!email || !email.includes("@")) return;
    setSending(p => ({ ...p, [member.id]: true }));
    const subject = encodeURIComponent(`💸 Your share for "${billName || "our bill"}" — BillKaw`);
    const body = buildMailtoBody(member);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    setTimeout(() => {
      setSending(p => ({ ...p, [member.id]: false }));
      setSent(p => ({ ...p, [member.id]: true }));
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📧 Email Bills</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="modal-sub">Enter each person's email to send their personalised bill breakdown.</p>
        <div className="modal-list">
          {members.map(m => (
            <div className="email-row" key={m.id}>
              <Avatar name={m.name} color={m.color} size={36} />
              <div className="email-row-info">
                <div className="email-row-name">{m.name}</div>
                <div className="email-row-amount">{fmt(owes[m.id] || 0)}</div>
              </div>
              <input
                className="field email-field"
                type="email"
                placeholder="email@example.com"
                value={emailData[m.id]}
                onChange={e => setEmailData(p => ({ ...p, [m.id]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && openMailto(m)}
              />
              <button
                className={`btn ${sent[m.id] ? "btn-sent" : "btn-kaw"}`}
                onClick={() => openMailto(m)}
                disabled={sending[m.id]}
              >
                {sending[m.id] ? "⏳" : sent[m.id] ? "✓ Sent!" : "Send"}
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── SplitBar (visual percentage bar) ─────────────────────────────────────────
function SplitBar({ members, owes, grandTotal }) {
  if (!grandTotal) return null;
  return (
    <div className="split-bar-wrap">
      <div className="split-bar">
        {members.map((m, i) => (
          <div
            key={m.id}
            className="split-bar-seg"
            style={{
              width: `${((owes[m.id] || 0) / grandTotal) * 100}%`,
              background: m.color,
              borderRadius: i === 0 ? "6px 0 0 6px" : i === members.length - 1 ? "0 6px 6px 0" : 0,
            }}
            title={`${m.name}: ${fmt(owes[m.id] || 0)}`}
          />
        ))}
      </div>
      <div className="split-bar-legend">
        {members.map(m => (
          <div key={m.id} className="split-legend-item">
            <span className="split-legend-dot" style={{ background: m.color }} />
            <span>{m.name}</span>
            <span className="split-legend-pct">
              {grandTotal ? Math.round(((owes[m.id] || 0) / grandTotal) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TabSetup ──────────────────────────────────────────────────────────────────
function TabSetup({ billName, setBillName, members, setMembers, addToast }) {
  const [input, setInput] = useState("");
  const [inputEmail, setInputEmail] = useState("");

  const addMember = () => {
    const name = input.trim();
    if (!name) return;
    if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      addToast("That name's already in the list!", "error"); return;
    }
    setMembers([...members, {
      id: uid(), name, color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
      email: inputEmail.trim(),
    }]);
    setInput(""); setInputEmail("");
    addToast(`${name} added!`, "success");
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-label">Bill details</div>
        <label className="field-label">Occasion / bill name</label>
        <input
          className="field"
          placeholder="e.g. Dinner at Nando's 🍗"
          value={billName}
          onChange={e => setBillName(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="section-label">Add people</div>
        <div className="add-member-grid">
          <div>
            <label className="field-label">Name</label>
            <input
              className="field"
              placeholder="Enter name"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMember()}
            />
          </div>
          <div>
            <label className="field-label">Email (optional)</label>
            <input
              className="field"
              type="email"
              placeholder="for bill delivery"
              value={inputEmail}
              onChange={e => setInputEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMember()}
            />
          </div>
        </div>
        <button className="btn btn-kaw btn-full" style={{ marginTop: 12 }} onClick={addMember}>
          + Add Person
        </button>

        {members.length > 0 && (
          <div className="member-list-cards">
            {members.map((m, i) => (
              <div className="member-card" key={m.id} style={{ animationDelay: `${i * 50}ms` }}>
                <Avatar name={m.name} color={m.color} size={38} />
                <div style={{ flex: 1 }}>
                  <div className="member-card-name">{m.name}</div>
                  {m.email && <div className="member-card-email">{m.email}</div>}
                </div>
                <button
                  className="btn-icon-del"
                  onClick={() => {
                    setMembers(members.filter(x => x.id !== m.id));
                    addToast(`${m.name} removed`, "info");
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {members.length < 2 && (
        <div className="hint-card">
          🦅 Add at least 2 people, then head to <strong>Items</strong>.
        </div>
      )}
    </div>
  );
}

// ── TabItems ──────────────────────────────────────────────────────────────────
function TabItems({ members, items, setItems, addToast }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [splitMode, setSplitMode] = useState("everyone");
  const [selectedMembers, setSelectedMembers] = useState({});
  const [customAmounts, setCustomAmounts] = useState({});
  const [paidBy, setPaidBy] = useState(members[0]?.id || "");

  useEffect(() => {
    if (!paidBy && members.length) setPaidBy(members[0].id);
  }, [members]);

  const toggleMember = id => setSelectedMembers(p => ({ ...p, [id]: !p[id] }));

  const addItem = () => {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p <= 0) { addToast("Enter a valid name and price.", "error"); return; }
    if (members.length < 2) { addToast("Add at least 2 people first.", "error"); return; }

    let assignedTo = [];
    let custAmt = {};

    if (splitMode === "everyone") {
      assignedTo = members.map(m => m.id);
    } else if (splitMode === "select") {
      assignedTo = members.filter(m => selectedMembers[m.id]).map(m => m.id);
      if (!assignedTo.length) { addToast("Select at least one person.", "error"); return; }
    } else {
      let total = 0;
      members.forEach(m => {
        const v = parseFloat(customAmounts[m.id] || 0) || 0;
        custAmt[m.id] = v; total += v;
      });
      if (Math.abs(total - p) > 0.01) { addToast(`Amounts (RM${total.toFixed(2)}) must sum to RM${p.toFixed(2)}.`, "error"); return; }
      assignedTo = members.filter(m => custAmt[m.id] > 0).map(m => m.id);
    }

    setItems([...items, { id: uid(), name, price: p, splitMode, assignedTo, customAmounts: { ...custAmt }, paidBy }]);
    setName(""); setPrice(""); setSelectedMembers({}); setCustomAmounts({}); setSplitMode("everyone");
    addToast(`"${name}" added!`, "success");
  };

  const subtotal = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-label">Add item</div>
        <div className="two-col">
          <div>
            <label className="field-label">Item name</label>
            <input className="field" placeholder="e.g. Ayam penyet" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Price (RM)</label>
            <input className="field" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>

        <label className="field-label" style={{ marginTop: 12 }}>Paid by</label>
        <div className="paid-by-row">
          {members.map(m => (
            <button
              key={m.id}
              className={`paid-by-chip ${paidBy === m.id ? "active" : ""}`}
              onClick={() => setPaidBy(m.id)}
              style={{ "--chip-color": m.color }}
            >
              <span className="paid-by-dot" style={{ background: m.color }} />
              {m.name}
            </button>
          ))}
        </div>

        <label className="field-label" style={{ marginTop: 12 }}>Split mode</label>
        <div className="toggle-group">
          {["everyone", "select", "custom"].map(m => (
            <button key={m} className={`toggle-btn ${splitMode === m ? "active" : ""}`} onClick={() => setSplitMode(m)}>
              {m === "everyone" ? "Everyone" : m === "select" ? "Pick people" : "Custom RM"}
            </button>
          ))}
        </div>

        {splitMode === "select" && (
          <div className="member-pick">
            {members.map(m => (
              <div key={m.id} className={`m-check ${selectedMembers[m.id] ? "sel" : ""}`} onClick={() => toggleMember(m.id)}>
                <span className="dot" style={{ background: m.color }} />
                {m.name}
              </div>
            ))}
          </div>
        )}

        {splitMode === "custom" && (
          <div className="custom-amounts">
            <div className="custom-hint">Total must equal RM {parseFloat(price || 0).toFixed(2)}</div>
            {members.map(m => (
              <div className="custom-row" key={m.id}>
                <Avatar name={m.name} color={m.color} size={26} />
                <span className="custom-name">{m.name}</span>
                <div className="custom-input-wrap">
                  <span className="custom-prefix">RM</span>
                  <input
                    className="field custom-input"
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={customAmounts[m.id] || ""}
                    onChange={e => setCustomAmounts(p => ({ ...p, [m.id]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-kaw btn-full" style={{ marginTop: 14 }} onClick={addItem}>
          + Add Item
        </button>
      </div>

      <div className="card">
        <div className="items-header">
          <div className="section-label" style={{ margin: 0 }}>Items ({items.length})</div>
          {items.length > 0 && <div className="items-total">{fmt(subtotal)}</div>}
        </div>
        {!items.length ? (
          <div className="empty">No items yet — add one above 👆</div>
        ) : (
          items.map(it => {
            const names = it.assignedTo
              .map(id => members.find(m => m.id === id)?.name)
              .filter(Boolean).join(", ");
            const payer = members.find(m => m.id === it.paidBy);
            return (
              <div className="item-row" key={it.id}>
                <div className="item-info">
                  <div className="item-name">{it.name}</div>
                  <div className="item-meta">
                    <span className="item-who">{it.splitMode === "everyone" ? "Everyone" : names}</span>
                    {payer && <span className="item-payer" style={{ color: payer.color }}>paid by {payer.name}</span>}
                  </div>
                </div>
                <div className="item-price">{fmt(it.price)}</div>
                <button className="btn-icon-del" onClick={() => { setItems(items.filter(x => x.id !== it.id)); addToast("Item removed", "info"); }}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── TabCharges ────────────────────────────────────────────────────────────────
function TabCharges({ members, items, charges, setCharges, addToast }) {
  const [ccName, setCcName] = useState("");
  const [ccAmt, setCcAmt] = useState("");
  const [ccSplit, setCcSplit] = useState("everyone");

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const sst = charges.sst ? subtotal * 0.06 : 0;
  const svc = charges.svc ? subtotal * 0.10 : 0;
  const extras = (charges.custom || []).reduce((s, c) => s + c.amt, 0);
  const total = subtotal + sst + svc + extras;

  const addCustom = () => {
    const amt = parseFloat(ccAmt);
    if (!ccName.trim() || isNaN(amt) || amt <= 0) { addToast("Enter a valid name and amount.", "error"); return; }
    setCharges(p => ({ ...p, custom: [...(p.custom || []), { id: uid(), name: ccName, amt, split: ccSplit }] }));
    setCcName(""); setCcAmt("");
    addToast(`"${ccName}" charge added!`, "success");
  };

  return (
    <div className="tab-content">
      <div className="card">
        <div className="section-label">Malaysian Taxes</div>
        <div className="tax-grid">
          <label className={`tax-card ${charges.sst ? "active" : ""}`}>
            <input type="checkbox" checked={!!charges.sst} onChange={e => setCharges(p => ({ ...p, sst: e.target.checked }))} />
            <div className="tax-card-top">
              <span className="tax-pct">6%</span>
              <span className="tax-toggle-indicator">{charges.sst ? "ON" : "OFF"}</span>
            </div>
            <div className="tax-name">SST</div>
            {charges.sst && <div className="tax-amount">{fmt(sst)}</div>}
          </label>
          <label className={`tax-card ${charges.svc ? "active" : ""}`}>
            <input type="checkbox" checked={!!charges.svc} onChange={e => setCharges(p => ({ ...p, svc: e.target.checked }))} />
            <div className="tax-card-top">
              <span className="tax-pct">10%</span>
              <span className="tax-toggle-indicator">{charges.svc ? "ON" : "OFF"}</span>
            </div>
            <div className="tax-name">Service Charge</div>
            {charges.svc && <div className="tax-amount">{fmt(svc)}</div>}
          </label>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Custom charge</div>
        <div className="custom-charge-row">
          <input className="field" placeholder="Name (e.g. Delivery)" value={ccName} onChange={e => setCcName(e.target.value)} />
          <div className="custom-input-wrap" style={{ width: 100 }}>
            <span className="custom-prefix">RM</span>
            <input className="field custom-input" type="number" placeholder="0.00" value={ccAmt} onChange={e => setCcAmt(e.target.value)} />
          </div>
          <select className="field" value={ccSplit} onChange={e => setCcSplit(e.target.value)} style={{ minWidth: 110 }}>
            <option value="everyone">Split equal</option>
            <option value="payer">Payer only</option>
          </select>
          <button className="btn btn-kaw" onClick={addCustom}>Add</button>
        </div>

        {(charges.custom || []).map(c => (
          <div className="item-row" key={c.id}>
            <div className="item-info">
              <div className="item-name">{c.name}</div>
              <div className="item-who">{c.split === "everyone" ? "Split equally" : "Payer only"}</div>
            </div>
            <div className="item-price">{fmt(c.amt)}</div>
            <button className="btn-icon-del" onClick={() => setCharges(p => ({ ...p, custom: p.custom.filter(x => x.id !== c.id) }))}>✕</button>
          </div>
        ))}
      </div>

      <div className="card bill-summary-card">
        <div className="section-label">Bill summary</div>
        <div className="summary-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
        {sst > 0 && <div className="summary-row"><span>SST (6%)</span><span>{fmt(sst)}</span></div>}
        {svc > 0 && <div className="summary-row"><span>Service Charge (10%)</span><span>{fmt(svc)}</span></div>}
        {(charges.custom || []).map(c => (
          <div className="summary-row" key={c.id}><span>{c.name}</span><span>{fmt(c.amt)}</span></div>
        ))}
        <div className="summary-row total-row"><span>Total</span><span>{fmt(total)}</span></div>
      </div>
    </div>
  );
}

// ── computeResults ────────────────────────────────────────────────────────────
function computeResults(members, items, charges) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const sst = charges.sst ? subtotal * 0.06 : 0;
  const svc = charges.svc ? subtotal * 0.10 : 0;
  const taxTotal = sst + svc;
  const customExtras = charges.custom || [];
  const grandTotal = subtotal + taxTotal + customExtras.reduce((s, c) => s + c.amt, 0);

  const owes = {};
  members.forEach(m => (owes[m.id] = 0));

  items.forEach(it => {
    if (it.splitMode === "custom") {
      Object.entries(it.customAmounts).forEach(([id, v]) => {
        if (owes[id] !== undefined) owes[id] += Number(v) || 0;
      });
    } else {
      const perHead = it.price / it.assignedTo.length;
      it.assignedTo.forEach(id => { if (owes[id] !== undefined) owes[id] += perHead; });
    }
  });

  if (taxTotal > 0 && subtotal > 0) {
    members.forEach(m => {
      const share = owes[m.id] / subtotal;
      owes[m.id] += taxTotal * share;
    });
  }

  customExtras.forEach(c => {
    if (c.split === "everyone") {
      const pp = c.amt / members.length;
      members.forEach(m => (owes[m.id] += pp));
    }
  });

  // Settle-up: minimum transfers
  const balances = members.map(m => ({ ...m, bal: owes[m.id] - grandTotal / members.length }));
  const cr = balances.filter(m => m.bal > 0.005).sort((a, b) => b.bal - a.bal).map(m => ({ ...m, rem: m.bal }));
  const dr = balances.filter(m => m.bal < -0.005).sort((a, b) => a.bal - b.bal).map(m => ({ ...m, rem: -m.bal }));
  const transfers = [];
  let ci = 0, di = 0;
  while (ci < cr.length && di < dr.length) {
    const amt = Math.min(cr[ci].rem, dr[di].rem);
    if (amt > 0.005) transfers.push({ from: dr[di], to: cr[ci], amt });
    cr[ci].rem -= amt; dr[di].rem -= amt;
    if (cr[ci].rem < 0.005) ci++;
    if (dr[di].rem < 0.005) di++;
  }

  return { owes, grandTotal, transfers, subtotal };
}

// ── TabResults ────────────────────────────────────────────────────────────────
function TabResults({ members, items, charges, billName, addToast }) {
  const [showEmail, setShowEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!items.length) return (
    <div className="tab-content">
      <div className="hint-card">Add some items first to see results 📝</div>
    </div>
  );

  const { owes, grandTotal, transfers } = computeResults(members, items, charges);

  const copyShareText = () => {
    const lines = [
      `🦅 BillKaw — ${billName || "Bill Summary"}`,
      `Total: ${fmt(grandTotal)}`,
      "",
      "Each person owes:",
      ...members.map(m => `  ${m.name}: ${fmt(owes[m.id] || 0)}`),
      "",
      transfers.length ? "Settle up:" : "All even — no transfers needed!",
      ...transfers.map(t => `  ${t.from.name} → ${t.to.name}: ${fmt(t.amt)}`),
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true); addToast("Summary copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="tab-content">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-val">{fmt(grandTotal)}</div>
          <div className="stat-lbl">Total Bill</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{members.length}</div>
          <div className="stat-lbl">People</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{fmt(grandTotal / Math.max(members.length, 1))}</div>
          <div className="stat-lbl">Avg per person</div>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Split breakdown</div>
        <SplitBar members={members} owes={owes} grandTotal={grandTotal} />
      </div>

      <div className="card">
        <div className="section-label">Each person owes</div>
        {members.map(m => {
          const breakdown = items
            .filter(it => it.assignedTo.includes(m.id))
            .map(it => {
              const share = it.splitMode === "custom"
                ? (it.customAmounts[m.id] || 0)
                : it.price / it.assignedTo.length;
              return `${it.name}: ${fmt(share)}`;
            }).join(" · ");
          return (
            <div className="owe-card" key={m.id}>
              <Avatar name={m.name} color={m.color} size={40} />
              <div style={{ flex: 1 }}>
                <div className="owe-name">{m.name}</div>
                <div className="owe-breakdown">{breakdown || "No items assigned"}</div>
              </div>
              <div className="owe-amount" style={{ color: m.color }}>{fmt(owes[m.id] || 0)}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="section-label">Settle up 🤝</div>
        {!transfers.length ? (
          <div className="all-even">
            <span className="all-even-icon">✅</span>
            <span>Everyone splits equally — no transfers needed!</span>
          </div>
        ) : (
          transfers.map((t, i) => (
            <div className="settle-row" key={i}>
              <Avatar name={t.from.name} color={t.from.color} size={32} />
              <div className="settle-from">{t.from.name}</div>
              <div className="settle-arrow">→</div>
              <Avatar name={t.to.name} color={t.to.color} size={32} />
              <div className="settle-to">{t.to.name}</div>
              <div className="settle-amt">{fmt(t.amt)}</div>
            </div>
          ))
        )}
      </div>

      <div className="action-row">
        <button className="btn btn-kaw btn-full" onClick={() => setShowEmail(true)}>
          📧 Email Bills
        </button>
        <button className={`btn btn-ghost btn-full ${copied ? "btn-copied" : ""}`} onClick={copyShareText}>
          {copied ? "✓ Copied!" : "📋 Copy Summary"}
        </button>
      </div>

      {showEmail && (
        <EmailModal
          onClose={() => setShowEmail(false)}
          members={members}
          items={items}
          charges={charges}
          billName={billName}
          owes={owes}
          transfers={transfers}
          grandTotal={grandTotal}
        />
      )}
    </div>
  );
}

// ── Animated tab wrapper ──────────────────────────────────────────────────────
function AnimatedTab({ active, children }) {
  const { mounted, visible } = useAnimatedMount(active);
  if (!mounted) return null;
  return (
    <div className={`animated-tab ${visible ? "tab-visible" : "tab-hidden"}`}>
      {children}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [billName, setBillName] = useState("");
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [charges, setCharges] = useState({ sst: false, svc: false, custom: [] });
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info") => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type, visible: true }]);
    setTimeout(() => setToasts(p => p.map(t => t.id === id ? { ...t, visible: false } : t)), 2500);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const TABS = [
    { label: "Setup", icon: "👥" },
    { label: "Items", icon: "🍽️" },
    { label: "Charges", icon: "💸" },
    { label: "Results", icon: "📊" },
  ];

  const canGoForward = tab < 3 && (tab > 0 || members.length >= 2);

  return (
    <div className="app">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="app-header">
        <div className="logo-lockup">
          <div className="logo-icon">🦅</div>
          <div>
            <div className="app-title">BillKaw</div>
            <div className="app-tagline">Split bills, not friendships</div>
          </div>
        </div>
        {billName && <div className="bill-name-badge">{billName}</div>}
      </header>

      {/* Progress */}
      <ProgressBar step={tab} />

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            className={`tab-btn ${tab === i ? "active" : ""} ${i > tab + 1 ? "locked" : ""}`}
            onClick={() => setTab(i)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Animated tab panels */}
      <AnimatedTab active={tab === 0}>
        <TabSetup billName={billName} setBillName={setBillName} members={members} setMembers={setMembers} addToast={addToast} />
      </AnimatedTab>
      <AnimatedTab active={tab === 1}>
        <TabItems members={members} items={items} setItems={setItems} addToast={addToast} />
      </AnimatedTab>
      <AnimatedTab active={tab === 2}>
        <TabCharges members={members} items={items} charges={charges} setCharges={setCharges} addToast={addToast} />
      </AnimatedTab>
      <AnimatedTab active={tab === 3}>
        <TabResults members={members} items={items} charges={charges} billName={billName} addToast={addToast} />
      </AnimatedTab>

      {/* Next/back nav */}
      <div className="bottom-nav">
        {tab > 0 && (
          <button className="btn btn-ghost" onClick={() => setTab(t => t - 1)}>
            ← Back
          </button>
        )}
        {tab < 3 && (
          <button
            className={`btn btn-kaw btn-next ${!canGoForward ? "btn-disabled" : ""}`}
            onClick={() => canGoForward && setTab(t => t + 1)}
            title={!canGoForward && tab === 0 ? "Add at least 2 people first" : ""}
          >
            {tab === 2 ? "See Results →" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}
