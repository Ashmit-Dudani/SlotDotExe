import { useEffect, useRef, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const to24Hour = (hour12, minute, period) => {
  const h = clamp(Number(hour12), 1, 12);
  const m = clamp(Number(minute), 0, 59);
  const p = String(period || "AM").toUpperCase() === "PM" ? "PM" : "AM";
  const base = h % 12;
  const hour24 = p === "PM" ? base + 12 : base;
  return { h24: hour24, m };
};

const from24Hour = (hour24, minute) => {
  const h24 = ((Number(hour24) % 24) + 24) % 24;
  const m = clamp(Number(minute), 0, 59);
  const period = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: m, period };
};

const parseTimeValue = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  // 24h: HH:MM
  const m24 = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) {
    return from24Hour(Number(m24[1]), Number(m24[2]));
  }

  // 12h: HH:MM AM/PM
  const m12 = raw.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (m12) {
    return { hour12: Number(m12[1]), minute: Number(m12[2]), period: m12[3].toUpperCase() };
  }

  return null;
};

const presets = [
  { label: "6:00 AM", h: 6, m: 0, period: "AM" },
  { label: "8:30 AM", h: 8, m: 30, period: "AM" },
  { label: "Noon", h: 12, m: 0, period: "PM" },
  { label: "1:00 PM", h: 1, m: 0, period: "PM" },
  { label: "5:00 PM", h: 5, m: 0, period: "PM" },
  { label: "9:00 PM", h: 9, m: 0, period: "PM" },
];

function ChevronUp() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 10 8 6 12 10" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}

function Spinner({ value, onUp, onDown, onWheel, label, onManualCommit }) {
  const inputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus?.();
      inputRef.current?.select?.();
    });
    return () => cancelAnimationFrame(id);
  }, [editing]);

  const commit = () => {
    if (!onManualCommit) {
      setEditing(false);
      return;
    }
    const ok = onManualCommit(String(draft));
    if (ok) setEditing(false);
    else {
      inputRef.current?.focus?.();
      inputRef.current?.select?.();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 72, background: "var(--ti-surface)", borderRadius: 12, overflow: "hidden", border: "0.5px solid var(--ti-border)" }}>
        <button className="ti-spin-btn" onClick={onUp} aria-label={`increase ${label}`}><ChevronUp /></button>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={commit}
            inputMode="numeric"
            aria-label={`Edit ${label}`}
            className="ti-value-input"
          />
        ) : (
          <div
            className="ti-value"
            onWheel={onWheel}
            tabIndex={0}
            onClick={() => setEditing(true)}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 400, color: "var(--ti-text)", width: "100%", textAlign: "center", padding: "6px 0", borderTop: "0.5px solid var(--ti-border)", borderBottom: "0.5px solid var(--ti-border)", background: "var(--ti-bg)", cursor: "text", userSelect: "none", transition: "background 0.15s" }}
          >
            {value}
          </div>
        )}

        <button className="ti-spin-btn" onClick={onDown} aria-label={`decrease ${label}`}><ChevronDown /></button>
      </div>
      <span style={{ fontSize: 11, color: "var(--ti-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
        {label}
      </span>
    </div>
  );
}

export default function TimeInput({ onConfirm, value, format = "24h" }) {
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const [period, setPeriod] = useState("AM");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const parsed = parseTimeValue(value);
    if (!parsed) return;
    setH(parsed.hour12);
    setM(parsed.minute);
    setPeriod(parsed.period);
  }, [value]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const changeH = (dir) => setH((prev) => ((prev - 1 + dir + 12) % 12) + 1);
  const changeM = (dir) => setM((prev) => (prev + dir * 5 + 60) % 60);
  const wheelH = (e) => { e.preventDefault(); changeH(e.deltaY < 0 ? 1 : -1); };
  const wheelM = (e) => { e.preventDefault(); changeM(e.deltaY < 0 ? 1 : -1); };

  const manualCommitHour = (raw) => {
    const trimmed = String(raw).trim();
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      showToast("Invalid hour");
      return false;
    }

    const hourInt = Math.trunc(n);
    if (hourInt === 0 || (hourInt >= 13 && hourInt <= 23)) {
      const parsed = from24Hour(hourInt, m);
      setH(parsed.hour12);
      setM(parsed.minute);
      setPeriod(parsed.period);
      showToast(`Hour → ${pad(parsed.hour12)} ${parsed.period}`);
      return true;
    }

    const next = clamp(hourInt, 1, 12);
    setH(next);
    showToast(`Hour → ${pad(next)}`);
    return true;
  };

  const manualCommitMinute = (raw) => {
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n)) {
      showToast("Invalid minute");
      return false;
    }
    const next = clamp(Math.trunc(n), 0, 59);
    setM(next);
    showToast(`Minute → ${pad(next)}`);
    return true;
  };

  const setPreset = (p) => {
    setH(p.h); setM(p.m); setPeriod(p.period);
    showToast(`Preset → ${pad(p.h)}:${pad(p.m)} ${p.period}`);
  };

  const confirm = () => {
    const time12 = `${pad(h)}:${pad(m)} ${period}`;
    const { h24, m: m24 } = to24Hour(h, m, period);
    const time24 = `${pad(h24)}:${pad(m24)}`;
    showToast(`Time set — ${time12}`);
    onConfirm?.(format === "12h" ? time12 : time24);
  };

  return (
    <>
      <style>{`
        .ti-wrap { padding: 2rem 0; display: flex; justify-content: center; }
        .ti-card { background: var(--ti-bg); border: 0.5px solid var(--ti-border); border-radius: 16px; padding: 2rem 2.5rem 2.5rem; width: 340px; }
        :root {
          --ti-bg: #ffffff;
          --ti-surface: #f4f4f5;
          --ti-border: #e4e4e7;
          --ti-border-strong: #d4d4d8;
          --ti-text: #18181b;
          --ti-secondary: #52525b;
          --ti-muted: #a1a1aa;
          --ti-accent: #18181b;
          --ti-accent-fg: #ffffff;
          --ti-accent-bg: #e4e4e7;
        }
        .dark {
          --ti-bg: #000000;
          --ti-surface: #18181b;
          --ti-border: rgba(255,255,255,0.12);
          --ti-border-strong: rgba(125,211,252,0.35);
          --ti-text: #e4e4e7;
          --ti-secondary: #a1a1aa;
          --ti-muted: #71717a;
          --ti-accent: #38bdf8;
          --ti-accent-fg: #000000;
          --ti-accent-bg: rgba(56,189,248,0.12);
        }
        .ti-spin-btn { width: 100%; padding: 7px 0; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ti-secondary); transition: background 0.15s, color 0.15s; }
        .ti-spin-btn:hover { background: var(--ti-accent-bg); color: var(--ti-text); }
        .ti-spin-btn:active { transform: scale(0.95); }
        .ti-value:hover { background: var(--ti-surface) !important; }
        .ti-value-input { font-family: 'DM Mono', monospace; font-size: 32px; font-weight: 400; color: var(--ti-text); width: 100%; text-align: center; padding: 6px 0; border: none; border-top: 0.5px solid var(--ti-border); border-bottom: 0.5px solid var(--ti-border); background: var(--ti-bg); outline: none; }
        .ti-per-btn { font-family: 'DM Mono', monospace; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 0.5px solid var(--ti-border-strong); cursor: pointer; background: transparent; color: var(--ti-secondary); transition: all 0.15s; letter-spacing: 0.04em; }
        .ti-per-btn:hover { background: var(--ti-surface); }
        .ti-per-btn.active { background: var(--ti-accent); color: var(--ti-accent-fg); border-color: var(--ti-accent); }
        .ti-quick-btn { font-family: 'DM Mono', monospace; font-size: 12px; padding: 5px 10px; border-radius: 100px; border: 0.5px solid var(--ti-border-strong); background: transparent; color: var(--ti-secondary); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .ti-quick-btn:hover { background: var(--ti-surface); color: var(--ti-text); border-color: var(--ti-accent); }
        .ti-confirm-btn { width: 100%; padding: 12px; border-radius: 12px; border: 0.5px solid var(--ti-border-strong); background: var(--ti-accent); color: var(--ti-accent-fg); font-family: 'DM Mono', monospace; font-size: 14px; cursor: pointer; transition: opacity 0.15s, transform 0.1s; letter-spacing: 0.04em; }
        .ti-confirm-btn:hover { opacity: 0.82; }
        .ti-confirm-btn:active { transform: scale(0.99); }
      `}</style>

      <div className="ti-wrap">
        <div className="ti-card">
          {/* Header */}
          <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 22, color: "var(--ti-text)", margin: "0 0 4px" }}>Set a time</p>
          <p style={{ fontSize: 13, color: "var(--ti-muted)", margin: "0 0 28px" }}>Use spinners or pick a preset</p>

          {/* Spinner row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: "2rem" }}>
            <Spinner value={pad(h)} onUp={() => changeH(1)} onDown={() => changeH(-1)} onWheel={wheelH} label="hr" onManualCommit={manualCommitHour} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 300, color: "var(--ti-secondary)", marginBottom: 22, padding: "0 2px" }}>:</span>
            <Spinner value={pad(m)} onUp={() => changeM(1)} onDown={() => changeM(-1)} onWheel={wheelM} label="min" onManualCommit={manualCommitMinute} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22, marginLeft: 8 }}>
              {["AM", "PM"].map((p) => (
                <button key={p} className={`ti-per-btn${period === p ? " active" : ""}`} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <hr style={{ border: "none", borderTop: "0.5px solid var(--ti-border)", margin: "0 0 1.5rem" }} />

          {/* Quick presets */}
          <p style={{ fontSize: 12, color: "var(--ti-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", margin: "0 0 10px" }}>Quick select</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1.75rem" }}>
            {presets.map((p) => (
              <button key={p.label} className="ti-quick-btn" onClick={() => setPreset(p)}>{p.label}</button>
            ))}
          </div>

          {/* Confirm */}
          <button className="ti-confirm-btn" onClick={confirm}>Confirm time</button>

          {/* Toast */}
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--ti-muted)", textAlign: "center", fontFamily: "'DM Mono', monospace", minHeight: 18, transition: "opacity 0.3s", opacity: toast ? 1 : 0 }}>
            {toast || "\u00A0"}
          </div>
        </div>
      </div>
    </>
  );
}