// UI components for Meeting Manager
(function () {
const { useEffect, useLayoutEffect, useMemo, useRef, useState } = React;

// ────────────────────────────────────────────────────────────
// Small atoms
// ────────────────────────────────────────────────────────────

function Badge({ children, tone = "ink" }) {
  const palette = {
    ink: { bg: "transparent", fg: "var(--ink)", bd: "var(--line-strong)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)", bd: "transparent" },
    muted: { bg: "transparent", fg: "var(--muted)", bd: "var(--line)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Eyebrow({ children, color }) {
  return (
    <div
      style={{
        fontFamily: "var(--sans)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: color || "var(--accent)",
      }}
    >
      {children}
    </div>
  );
}

function IconButton({ onClick, title, children, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--line)",
        background: active ? "var(--accent-soft)" : "var(--paper)",
        color: active ? "var(--accent)" : "var(--ink-2)",
        borderRadius: 10,
        cursor: "pointer",
        transition: "background 120ms, color 120ms, border-color 120ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--line)")
      }
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children, primary, small, title, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: small ? 30 : 36,
        padding: small ? "0 12px" : "0 16px",
        border: `1px solid ${primary ? "transparent" : "var(--line)"}`,
        background: primary ? "var(--ink)" : "var(--paper)",
        color: primary ? "var(--paper)" : "var(--ink)",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 500,
        fontSize: small ? 13 : 14,
        letterSpacing: "-0.01em",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        transition: "transform 80ms ease, background 120ms ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Sidebar: agenda input + agenda nav
// ────────────────────────────────────────────────────────────

function AgendaInput({ rawMarkdown, onLoad, onSample, sampleText, errors }) {
  const [text, setText] = useState(rawMarkdown || "");
  const [open, setOpen] = useState(!rawMarkdown);
  useEffect(() => setText(rawMarkdown || ""), [rawMarkdown]);

  // How many agenda lines could pick up a clock time? Recomputed live so the
  // button hides itself the moment the textarea has nothing left to fill.
  const missingDeadlineCount = useMemo(() => {
    if (!window.addMissingDeadlines) return 0;
    try { return window.addMissingDeadlines(text).count; }
    catch { return 0; }
  }, [text]);

  function fillDeadlines() {
    if (!window.addMissingDeadlines) return;
    const { text: next, count } = window.addMissingDeadlines(text);
    if (!count) return;
    setText(next);
    onLoad(next);
  }

  return (
    <section
      style={{
        borderBottom: "1px solid var(--line)",
        padding: "18px 20px 18px",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--muted)",
          fontFamily: "var(--sans)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 120ms",
          }}
        >
          <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Agenda Source
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={sampleText || ""}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 180,
              padding: 12,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--paper)",
              color: "var(--ink)",
              fontFamily: "var(--sans)",
              fontSize: 13.5,
              fontWeight: 500,
              lineHeight: 1.5,
              letterSpacing: "-0.005em",
              resize: "vertical",
              outline: "none",
              transition: "border-color 120ms",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <GhostButton primary small onClick={() => onLoad(text)}>
              Load
            </GhostButton>
            <GhostButton small onClick={() => { if (sampleText) setText(sampleText); onSample && onSample(); }}>
              Sample
            </GhostButton>
            {missingDeadlineCount > 0 && (
              <button
                type="button"
                onClick={fillDeadlines}
                title={`Fill in clock times for ${missingDeadlineCount} agenda line${missingDeadlineCount === 1 ? "" : "s"}`}
                aria-label="Fill in clock times"
                style={{
                  width: 30,
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink-2)",
                  borderRadius: 10,
                  cursor: "pointer",
                  marginLeft: "auto",
                  transition: "border-color 120ms, color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--line-strong)";
                  e.currentTarget.style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.color = "var(--ink-2)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7 5V7.5L8.5 8.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.5 2.2L12 3.5M3.5 2.2L2 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          {errors && errors.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                fontSize: 12,
                lineHeight: 1.5,
                background: "rgba(177, 57, 31, 0.07)",
                border: "1px solid rgba(177, 57, 31, 0.2)",
                color: "var(--bad)",
                borderRadius: 8,
              }}
            >
              {errors.slice(0, 3).map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AgendaList({ items, currentSlide, slides, onJump, totalLabel }) {
  const [open, setOpen] = useState(true);
  if (!items.length) {
    return (
      <section style={{ padding: "18px 20px", color: "var(--muted)", fontSize: 13 }}>
        <Eyebrow color="var(--muted)">Agenda</Eyebrow>
        <p style={{ marginTop: 14, lineHeight: 1.5 }}>
          Paste an agenda above to begin.
        </p>
      </section>
    );
  }

  function slideIndexFor(itemIdx, subIdx) {
    return slides.findIndex(
      (s) =>
        s.kind === "agenda" &&
        s.item.agendaIndex === itemIdx &&
        (subIdx == null ? s.subIndex == null : s.subIndex === subIdx)
    );
  }

  const titleSlide = 0;
  const completeSlide = slides.length - 1;
  const cur = slides[currentSlide] || null;

  return (
    <section style={{ padding: "0 20px 24px", flex: 1, overflowY: "auto" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: 0,
          padding: "14px 0",
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--muted)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 120ms",
            }}
          >
            <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Agenda
        </span>
        <span style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
          {totalLabel}
        </span>
      </button>

      {open && (
        <div>
      <button
        type="button"
        onClick={() => onJump(titleSlide)}
        style={navItemStyle(currentSlide === titleSlide)}
      >
        <span style={numStyle(currentSlide === titleSlide)}>—</span>
        <span
          style={{
            fontWeight: 500,
            color: "var(--ink-2)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Title
        </span>
        <div style={durColStyle()} />
      </button>

      {items.map((it) => {
        const itSlide = slideIndexFor(it.agendaIndex, null);
        const isActive =
          cur &&
          cur.kind === "agenda" &&
          cur.item.agendaIndex === it.agendaIndex;
        const isThisRowActive = isActive && (cur.subIndex == null || it.subs.length === 0);

        return (
          <div key={it.agendaIndex}>
            <button
              type="button"
              onClick={() => onJump(itSlide)}
              style={navItemStyle(isThisRowActive)}
            >
              <span style={numStyle(isThisRowActive)}>{it.agendaIndex}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.title}
                </span>
                {it.names.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.names.join(", ")}
                  </span>
                )}
              </div>
              <div style={durColStyle()}>
                <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{it.durationLabel}</span>
                {it.deadlineLabel && (
                  <span style={{ color: "var(--faint)", fontSize: 10, marginTop: 2 }}>
                    {it.deadlineLabel}
                  </span>
                )}
              </div>
            </button>

            {it.subs.map((s, si) => {
              const ss = slideIndexFor(it.agendaIndex, si);
              const subActive =
                cur &&
                cur.kind === "agenda" &&
                cur.item.agendaIndex === it.agendaIndex &&
                cur.subIndex === si;
              return (
                <button
                  key={si}
                  type="button"
                  onClick={() => onJump(ss)}
                  style={{ ...navItemStyle(subActive), paddingLeft: 44 }}
                >
                  <span
                    style={{
                      ...numStyle(subActive),
                      fontSize: 10,
                      width: 16,
                    }}
                  >
                    {String.fromCharCode(97 + si)}
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--ink-2)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.name}
                  </span>
                  <div style={durColStyle()}>
                    <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>
                      {formatDurLabel(s.durationMs)}
                    </span>
                    {s.deadlineLabel && (
                      <span style={{ color: "var(--faint)", fontSize: 10, marginTop: 2 }}>
                        {s.deadlineLabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onJump(completeSlide)}
        style={navItemStyle(currentSlide === completeSlide)}
      >
        <span style={numStyle(currentSlide === completeSlide)}>✓</span>
        <span
          style={{
            fontWeight: 500,
            color: "var(--ink-2)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Complete
        </span>
        <div style={durColStyle()} />
      </button>
        </div>
      )}
    </section>
  );
}

function durColStyle() {
  return {
    width: 64,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: 11,
    color: "var(--faint)",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    lineHeight: 1.15,
  };
}

function navItemStyle(active) {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    margin: "2px -12px",
    border: 0,
    background: active ? "var(--accent-soft)" : "transparent",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--sans)",
    fontSize: 14,
    color: "var(--ink)",
  };
}
function numStyle(active) {
  return {
    width: 22,
    flexShrink: 0,
    fontFamily: "var(--sans)",
    fontSize: 11,
    fontWeight: 500,
    color: active ? "var(--accent)" : "var(--faint)",
    fontVariantNumeric: "tabular-nums",
    textAlign: "left",
  };
}

// ────────────────────────────────────────────────────────────
// Stage (title / agenda / complete)
// ────────────────────────────────────────────────────────────

function Stage({ slide, meeting, tweaks, current, total }) {
  if (!slide) return null;
  const FONT_REGISTRY = {
    "inter-tight":      { stack: '"Inter", system-ui, sans-serif',        weight: 700, tracking: "-0.025em" },
    "instrument-serif": { stack: '"Instrument Serif", serif',             weight: 400, tracking: "-0.02em" },
    "dm-serif":         { stack: '"DM Serif Display", serif',             weight: 400, tracking: "-0.015em" },
    "newsreader":       { stack: '"Newsreader", serif',                   weight: 500, tracking: "-0.02em" },
    "fraunces":         { stack: '"Fraunces", serif',                     weight: 500, tracking: "-0.025em" },
  };
  const font = FONT_REGISTRY[tweaks.titleFont] || FONT_REGISTRY["inter-tight"];
  const titleStyle = {
    fontFamily: font.stack,
    fontWeight: font.weight,
    letterSpacing: font.tracking,
  };

  if (slide.kind === "title") {
    return (
      <div style={stageWrap()}>
        <Eyebrow>Meeting</Eyebrow>
        <h1
          style={{
            ...titleStyle,
            fontSize: "clamp(48px, 10vh, 112px)",
            lineHeight: 0.98,
            margin: "14px 0 24px",
            color: "var(--ink)",
            textWrap: "balance",
          }}
        >
          {meeting.meetingTitle}
        </h1>
        {meeting.admins.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 16 }}>
            {meeting.admins.map((a, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {a.role}
                </span>
                <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
                  {a.value}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 40, display: "flex", gap: 12, alignItems: "center" }}>
          <Badge tone="ink">{`${meeting.items.length} items`}</Badge>
          <Badge tone="ink">{`${meeting.totalLabel} total`}</Badge>
        </div>
      </div>
    );
  }

  if (slide.kind === "complete") {
    return (
      <div style={stageWrap()}>
        <Eyebrow color="var(--good)">Wrapped</Eyebrow>
        <h1
          style={{
            ...titleStyle,
            fontSize: "clamp(48px, 10vh, 112px)",
            lineHeight: 0.98,
            margin: "14px 0 20px",
            color: "var(--ink)",
          }}
        >
          Meeting complete.
        </h1>
        <p
          style={{
            fontSize: 20,
            color: "var(--muted)",
            maxWidth: 600,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Thanks, everyone. Notes go to {meeting.admins.find((a) => /notetaker/i.test(a.role))?.value || "the notetaker"}.
        </p>
      </div>
    );
  }

  // agenda slide
  const it = slide.item;
  const sub = slide.subIndex != null ? it.subs[slide.subIndex] : null;
  const headline = sub ? sub.name : it.title;
  const duration = sub ? formatDurLabel(sub.durationMs) : it.durationLabel;
  const eyebrow = sub
    ? `${it.agendaIndex}${String.fromCharCode(97 + slide.subIndex)} · ${it.title}`
    : `${current} of ${total}`;

  return (
    <div style={stageWrap()}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1
        style={{
          ...titleStyle,
          fontSize: "clamp(44px, 9.5vh, 108px)",
          lineHeight: 0.98,
          margin: "14px 0 18px",
          color: "var(--ink)",
          textWrap: "balance",
        }}
      >
        {headline}
      </h1>

      {(!sub && it.names.length > 0) && (
        <p
          style={{
            fontSize: "clamp(18px, 2.6vh, 26px)",
            fontWeight: 400,
            color: "var(--muted)",
            margin: "0 0 20px",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          {it.names.join(" · ")}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Badge tone="accent">
          <DotIcon />
          <span>{duration}</span>
        </Badge>
        {(sub ? sub.deadlineLabel : it.deadlineLabel) && (
          <Badge tone="ink">
            <ClockIcon />
            <span>By {sub ? sub.deadlineLabel : it.deadlineLabel}</span>
          </Badge>
        )}
        {it.perPersonMs && !sub && (
          <Badge tone="muted">
            <span style={{ display: "inline-flex", gap: 4 }}>
              <span>{formatDurLabel(it.perPersonMs)}</span>
              <span>max per person</span>
            </span>
          </Badge>
        )}
      </div>
    </div>
  );
}

function stageWrap() {
  return {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "clamp(28px, 4vh, 64px) clamp(40px, 6vw, 120px)",
    maxWidth: 1400,
    overflow: "hidden",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };
}

function DotIcon() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 6,
        background: "currentColor",
        display: "inline-block",
      }}
    />
  );
}
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 3.2V6L7.8 7.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Timer (ring) with progress + controls
// ────────────────────────────────────────────────────────────

function FitText({ children, maxWidth }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const natural = el.scrollWidth;
    if (!natural) return;
    const next = natural > maxWidth ? maxWidth / natural : 1;
    setScale(next);
  }, [children, maxWidth]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        overflow: "visible",
      }}
    >
      <div
        ref={ref}
        style={{
          whiteSpace: "nowrap",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          transition: "transform 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function fmtTimer(ms) {
  const a = Math.abs(ms);
  // For positive ms: ceil so each integer second is held for its full
  // duration. e.g. a fresh 5:00 timer reads "5:00" for one whole second
  // before rolling to "4:59" — matching how every wall-clock timer behaves.
  // Without this, the digit flips ~instantly on resume (felt as "starts too
  // quickly" or skipping the first second).
  //
  // For negative ms (overtime): floor so the readout holds "0:00" for a full
  // second before rolling to "-0:01". This gives the 0:00 chime a moment to
  // land on the matching readout instead of immediately ticking to -0:01.
  const totalSec = ms < 0 ? Math.floor(a / 1000) : Math.ceil(a / 1000);
  // Suppress the minus while we're still inside the 0:00 hold window so it
  // reads "0:00" cleanly (not "-0:00").
  const sign = ms < 0 && totalSec > 0 ? "-" : "";
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Parse user-typed time. Accepts:
//   "90"        → 90 minutes
//   "1:30"      → 1m 30s
//   "01:30"     → 1m 30s
//   "1:02:30"   → 1h 2m 30s
//   "-0:30"     → negative (overtime)
// Returns ms, or null on parse failure.
function parseTimeInput(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let sign = 1;
  if (s.startsWith("-")) { sign = -1; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);
  const parts = s.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  let secs = 0;
  if (nums.length === 1) secs = nums[0] * 60;            // plain number = minutes
  else if (nums.length === 2) secs = nums[0] * 60 + nums[1];
  else if (nums.length === 3) secs = nums[0] * 3600 + nums[1] * 60 + nums[2];
  else return null;
  return sign * secs * 1000;
}

// Inline-editable time readout. Click to pause + edit; Enter commits, Esc cancels.
function EditableTime({ ms, color, fontSize, fontWeight, letterSpacing, fitTo, onBeginEdit, onCommit }) {
  const { useState, useRef, useEffect } = window.React;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  function start() {
    if (onBeginEdit) onBeginEdit();
    const formatted = fmtTimer(ms).replace(/^0(\d)/, "$1");
    setDraft(formatted);
    setEditing(true);
  }
  function commit() {
    const parsed = parseTimeInput(draft);
    if (parsed != null && onCommit) onCommit(parsed);
    setEditing(false);
  }
  function cancel() { setEditing(false); }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const baseStyle = {
    fontFamily: "var(--num)",
    fontSize,
    fontWeight,
    letterSpacing: letterSpacing || "-0.015em",
    color,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  };

  if (editing) {
    // Measure width based on draft length so the input matches the readout footprint
    const chars = Math.max(4, draft.length);
    // If a fit target is provided, shrink the font so the full draft (incl. a
    // leading "-") never gets clipped. Tabular digits run ~0.6em per char.
    const effFontSize = fitTo
      ? Math.min(fontSize, Math.floor((fitTo / (chars * 0.62))))
      : fontSize;
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        style={{
          ...baseStyle,
          fontSize: effFontSize,
          width: `${chars}ch`,
          maxWidth: fitTo ? fitTo : "100%",
          background: "transparent",
          border: 0,
          borderBottom: `2px dashed ${color}`,
          outline: "none",
          padding: 0,
          textAlign: "center",
          caretColor: color,
        }}
      />
    );
  }
  const content = (
    <span
      onClick={start}
      title="Click to edit"
      style={{
        ...baseStyle,
        cursor: "text",
        display: "inline-block",
        padding: "0 2px",
        borderRadius: 4,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {fmtTimer(ms)}
    </span>
  );
  return fitTo ? <FitText maxWidth={fitTo}>{content}</FitText> : content;
}

function TimerRing({ remainingMs, durationMs, running, onToggle, onReset, onBump, onSetTime, onReadTime, tweaks }) {
  // Effective duration: original budget unless the user has bumped above it.
  // No memory across changes — a Reset (remaining → duration) snaps the ring
  // back to empty cleanly. The smoothing pass below handles visible animation
  // on any discrete jump.
  const { useRef, useLayoutEffect } = window.React;
  const effDuration = Math.max(durationMs, remainingMs);

  // Track previous remainingMs so we can detect discrete jumps (bump /
  // set-time / reset). When paused the CSS transition handles them; when
  // running we drive a one-shot WAAPI animation imperatively below so the
  // ring sweeps from old → new instead of teleporting. (setState inside a
  // useEffect lands AFTER the new strokeDasharray has already been
  // committed, so CSS transitions can't catch the jump while running.)
  const prevMsRef = useRef(remainingMs);
  const ringArcRef = useRef(null);
  // When paused we always want the CSS transition on; when running we
  // animate jumps via WAAPI instead, so the CSS transition stays off
  // (per-frame rAF updates would otherwise queue 360ms tweens each paint).
  const showTransition = !running;

  const elapsed = effDuration - remainingMs;
  const pct = effDuration > 0 ? Math.max(0, Math.min(1, elapsed / effDuration)) : 0;
  const over = remainingMs < 0;
  const warn = !over && remainingMs <= durationMs * 0.2 && durationMs > 0;
  const state = over ? "over" : warn ? "warn" : "ok";
  const color = state === "over" ? "var(--bad)" : state === "warn" ? "var(--warn)" : "var(--good)";

  const ringSize = 156;
  const stroke = 5;
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Sweep grows clockwise from 12 o'clock
  const dash = c * Math.max(0, Math.min(1, pct));

  // On discrete jumps while running, animate the arc from the old dash to
  // the new one via WAAPI. Runs in a layout effect so we read the previous
  // remainingMs before React's next paint, and the animation overlays on
  // top of React's strokeDasharray attribute for its 360ms duration.
  useLayoutEffect(() => {
    const prev = prevMsRef.current;
    prevMsRef.current = remainingMs;
    if (!running) return;
    if (Math.abs(remainingMs - prev) <= 200) return;
    const node = ringArcRef.current;
    if (!node || typeof node.animate !== "function") return;
    const prevElapsed = effDuration - prev;
    const prevPct = effDuration > 0 ? Math.max(0, Math.min(1, prevElapsed / effDuration)) : 0;
    const prevDash = c * prevPct;
    try {
      node.animate(
        [
          { strokeDasharray: `${prevDash} ${c}` },
          { strokeDasharray: `${dash} ${c}` },
        ],
        { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    } catch (e) { /* WAAPI on SVG attrs unsupported — silently fall back to teleport */ }
  }, [remainingMs, running, effDuration, c, dash]);

  if (!tweaks.ringTimer) {
    return (
      <FlatTimer
        tweaks={tweaks}
        remainingMs={remainingMs}
        durationMs={durationMs}
        running={running}
        onToggle={onToggle}
        onReset={onReset}
        onBump={onBump}
        onSetTime={onSetTime}
        onReadTime={onReadTime}
        state={state}
        color={color}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "16px 28px 18px",
        borderTop: "1px solid var(--line)",
        background: "var(--paper)",
      }}
    >
      <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
        <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={r}
            stroke="var(--line)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            ref={ringArcRef}
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            style={{
              transition: showTransition
                ? "stroke-dasharray 360ms cubic-bezier(0.22, 1, 0.36, 1), stroke 240ms ease"
                : "stroke 240ms ease",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <div
            style={{
              fontFamily: "var(--num)",
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            <EditableTime
              ms={remainingMs}
              color={color}
              fontSize={44}
              fontWeight={600}
              fitTo={ringSize - stroke * 2 - 16}
              onBeginEdit={() => running && onToggle && onToggle()}
              onCommit={(ms) => onSetTime && onSetTime(ms)}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--num)",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--faint)",
              letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            / {fmtTimer(durationMs)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatePill state={state} running={running} tweaks={tweaks} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <PrimaryAction onClick={onToggle} running={running} />
          <GhostButton onClick={() => onBump(-60000)} title="Subtract 1 minute">
            −1 min
          </GhostButton>
          <GhostButton onClick={() => onBump(60000)} title="Add 1 minute">
            +1 min
          </GhostButton>
          <IconButton onClick={onReadTime} title="Speak the remaining time aloud">
            <SpeakerIcon />
          </IconButton>
          <IconButton onClick={onReset} title="Reset to original">
            <ResetIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function FlatTimer({ remainingMs, durationMs, running, onToggle, onReset, onBump, onSetTime, onReadTime, state, color, tweaks }) {
  const { useRef, useLayoutEffect } = window.React;
  const effDuration = Math.max(durationMs, remainingMs);
  const elapsed = effDuration - remainingMs;
  const pct = effDuration > 0 ? Math.max(0, Math.min(1, elapsed / effDuration)) : 0;

  // On discrete jumps while running (bumps, set-time, reset) we animate the
  // bar imperatively via WAAPI — driving it through setState in useEffect
  // lands AFTER the new width is already committed, so the CSS transition
  // never catches the jump.
  const prevMsRef = useRef(remainingMs);
  const barRef = useRef(null);
  useLayoutEffect(() => {
    const prev = prevMsRef.current;
    prevMsRef.current = remainingMs;
    if (!running) return;
    if (Math.abs(remainingMs - prev) <= 200) return;
    const node = barRef.current;
    if (!node || typeof node.animate !== "function") return;
    const prevElapsed = effDuration - prev;
    const prevPct = effDuration > 0 ? Math.max(0, Math.min(1, prevElapsed / effDuration)) : 0;
    try {
      node.animate(
        [{ width: `${prevPct * 100}%` }, { width: `${pct * 100}%` }],
        { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    } catch (e) { /* no-op */ }
  }, [remainingMs, running, effDuration, pct]);
  const showTransition = !running;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid var(--line)",
        background: "var(--paper)",
      }}
    >
      <div style={{ height: 4, background: "var(--line)" }}>
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: color,
            transition: showTransition
              ? "width 360ms cubic-bezier(0.22, 1, 0.36, 1), background 240ms ease"
              : "background 240ms ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span
            style={{
              fontFamily: "var(--num)",
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <EditableTime
              ms={remainingMs}
              color={color}
              fontSize={72}
              fontWeight={600}
              letterSpacing="-0.02em"
              onBeginEdit={() => running && onToggle && onToggle()}
              onCommit={(ms) => onSetTime && onSetTime(ms)}
            />
          </span>
          <span
            style={{
              fontFamily: "var(--num)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--faint)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            / {fmtTimer(durationMs)}
          </span>
          <StatePill state={state} running={running} tweaks={tweaks} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PrimaryAction onClick={onToggle} running={running} />
          <GhostButton onClick={() => onBump(-60000)}>−1 min</GhostButton>
          <GhostButton onClick={() => onBump(60000)}>+1 min</GhostButton>
          <IconButton onClick={onReadTime} title="Speak remaining time">
            <SpeakerIcon />
          </IconButton>
          <IconButton onClick={onReset} title="Reset">
            <ResetIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function PrimaryAction({ onClick, running }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={running ? "Pause" : "Start"}
      style={{
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        background: "var(--ink)",
        color: "var(--paper)",
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      {running ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="2.5" y="2" width="2.5" height="8" rx="0.6" />
          <rect x="7" y="2" width="2.5" height="8" rx="0.6" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2.5 2L10 6L2.5 10V2Z" />
        </svg>
      )}
    </button>
  );
}

function SpeakerIcon() {
  // Person speaking — head + shoulder + sound waves
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 12.5C2.5 10.3 4 9 6 9C8 9 9.5 10.3 9.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 4.5C11.7 5.5 11.7 7 11 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12.6 3C13.7 4.5 13.7 8 12.6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  // Counter-clockwise rotate — Lucide-style
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function StatePill({ state, running, tweaks }) {
  const label = !running
    ? "Paused"
    : state === "over"
    ? "Overtime"
    : state === "warn"
    ? "Almost up"
    : "Running";

  const isOvertime = running && state === "over";
  const overtimeRef = React.useRef(null);
  const flameRef = React.useRef(null);
  const wasOvertimeRef = React.useRef(false);

  React.useEffect(() => {
    if (isOvertime && !wasOvertimeRef.current) {
      // Ignite! Replays every time overtime turns on (unpause, slot switch, etc).
      const span = overtimeRef.current;
      const flame = flameRef.current;
      if (span && typeof span.animate === "function") {
        span.animate(
          [
            { transform: "scale(0.55) rotate(-6deg)", opacity: 0, filter: "blur(6px) brightness(2.4)", letterSpacing: "0.02em" },
            { transform: "scale(1.18) rotate(2deg)",  opacity: 1, filter: "blur(0) brightness(1.9)",   letterSpacing: "0.22em", offset: 0.45 },
            { transform: "scale(0.96) rotate(-1deg)", opacity: 1, filter: "blur(0) brightness(1.15)",  letterSpacing: "0.16em", offset: 0.75 },
            { transform: "scale(1) rotate(0deg)",     opacity: 1, filter: "blur(0) brightness(1)",     letterSpacing: "0.16em" },
          ],
          { duration: 720, easing: "cubic-bezier(.18,.8,.25,1)", fill: "none" }
        );
      }
      if (flame && typeof flame.animate === "function") {
        flame.animate(
          [
            { transform: "scale(0.2) translateY(8px) rotate(-20deg)", opacity: 0 },
            { transform: "scale(1.6) translateY(-2px) rotate(8deg)",  opacity: 1, offset: 0.35 },
            { transform: "scale(0.85) translateY(1px) rotate(-4deg)", opacity: 1, offset: 0.7 },
            { transform: "scale(1) translateY(0) rotate(-1deg)",      opacity: 1 },
          ],
          { duration: 760, easing: "cubic-bezier(.2,.9,.2,1)", fill: "none" }
        );
      }
    }
    wasOvertimeRef.current = isOvertime;
  }, [isOvertime]);

  const color =
    !running
      ? "var(--muted)"
      : state === "over"
      ? "var(--bad)"
      : state === "warn"
      ? "var(--warn)"
      : "var(--good)";

  // Special fiery treatment for Overtime
  if (isOvertime) {
    return (
      <span
        ref={overtimeRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5.5,
          fontSize: 22,
          fontWeight: 900,
          fontStyle: "italic",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: '"Inter", system-ui, sans-serif',
          color: "#FFE27A",
          WebkitTextStroke: `${tweaks?.overtimeStrokeWidth ?? 1.25}px ${tweaks?.overtimeStrokeColor ?? "#7A3812"}`,
          paintOrder: "stroke fill",
          textShadow: [
            "0 0 6px #FFB347",
            "0 0 14px #FF7A1F",
            "0 0 28px #FF3B00",
            "0 0 44px rgba(255, 59, 0, 0.85)",
          ].join(", "),
          animation: "mm-overtime-flicker 2.4s ease-in-out infinite",
          paddingRight: 2,
        }}
      >
        <svg
          width="26"
          height="22"
          viewBox="0 1 16 12"
          fill="none"
          style={{
            display: "block",
            filter:
              "drop-shadow(0 0 4px #FFE27A) drop-shadow(0 0 10px #FF9020) drop-shadow(0 0 18px #FF3B00) drop-shadow(0 0 28px rgba(255,59,0,0.7))",
            animation: "mm-overtime-flame 0.8s ease-in-out infinite alternate",
            transformOrigin: "50% 70%",
          }}
        >
          <path
            d="M8 1.2c1.4 2.6 3.6 3.7 3.6 6.6 0 1-.5 1.9-1.3 2.4.6-1.6.1-3-1.1-4 .5 2.4-1.1 2.7-1.1 4.6 0 .8.5 1.5 1.2 1.8-2.1.2-3.8-1.4-3.8-3.6 0-1.4.8-2.4.8-3.7 0-.8-.3-1.5-.8-2 .9.2 1.7.9 2 1.8.2-1.4-.1-3-.8-3.9.8.1 1.5.3 2.1.8.5-.4.9-.7 1.2-.8z"
            fill="#FFE27A"
          />
          <path
            d="M8 4.2c1.0 1.8 2.5 2.6 2.5 4.6 0 .7-.35 1.3-.9 1.7.4-1.1.05-2.1-.8-2.8.35 1.7-.8 1.9-.8 3.2 0 .6.35 1.05.85 1.25-1.5.1-2.7-1-2.7-2.5 0-1 .56-1.7.56-2.6 0-.55-.2-1.05-.55-1.4.6.15 1.2.65 1.4 1.3.15-1-.05-2.1-.55-2.75.55.07 1.05.2 1.45.55.35-.28.6-.5.85-.55z"
            fill="#FF9020"
          />
        </svg>
        {label}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        fontFamily: "var(--sans)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          background: color,
          animation: running ? "mm-pulse 1.4s ease-in-out infinite" : "none",
        }}
      />
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Header / clock
// ────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hh = ((h + 11) % 12) + 1;
  const ap = h >= 12 ? "PM" : "AM";
  return (
    <span
      style={{
        fontFamily: "var(--num)",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--muted)",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.005em",
      }}
    >
      {hh}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")} {ap}
    </span>
  );
}

Object.assign(window, {
  Badge,
  Eyebrow,
  IconButton,
  GhostButton,
  AgendaInput,
  AgendaList,
  Stage,
  TimerRing,
  LiveClock,
  fmtTimer,
});
})();
