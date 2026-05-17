// Meeting Manager — main app
(function () {
const { useEffect, useMemo, useRef, useState, useCallback } = window.React;

const SAMPLE = `# Weekly Planning

**Start Time:** 1 PM

**Meeting Admins**
- **Meeting Master:** Sarah
- **Notetaker:** Teck Lee

**Agenda**
1. Opening context (Sarah) - 2 min, by 1:02 PM
2. Team check-in (Sarah, Teck Lee, Solomon) - 7 min max per person, by 1:23 PM
3. Decision review (Solomon) - 3 mins, by 1:26 PM
4. Action items (Sarah) - 2 min, by 1:28 PM`;

const STORAGE_KEY = "meeting-manager.v2.state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function App() {
  const [t, setTweak] = window.useTweaks(window.__TWEAK_DEFAULTS);

  // Theme
  useEffect(() => {
    document.documentElement.dataset.theme = t.dark ? "dark" : "light";
  }, [t.dark]);

  // Accent override
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.accent]);

  // ── Load persisted state on mount
  const initial = loadState();

  // Prime voice list (some browsers populate async)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
  }, []);
  const [rawMarkdown, setRawMarkdown] = useState(initial?.rawMarkdown || SAMPLE);
  const [meeting, setMeeting] = useState(() => window.parseAgenda(initial?.rawMarkdown || SAMPLE));
  const [currentSlide, setCurrentSlide] = useState(initial?.currentSlide || 0);
  const [remainingMap, setRemainingMap] = useState(initial?.remainingMap || {});
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(
    () => initial?.sidebarWidth || 320
  );
  const resizingRef = useRef(false);
  const [resizing, setResizing] = useState(false);

  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    setResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    function onMove(ev) {
      if (!resizingRef.current) return;
      const w = Math.max(240, Math.min(560, ev.clientX));
      setSidebarWidth(w);
    }
    function onUp() {
      resizingRef.current = false;
      setResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Persist on changes (debounced via rAF coalescing not necessary at this rate)
  useEffect(() => {
    saveState({ rawMarkdown, currentSlide, remainingMap, sidebarWidth, theme: t.dark ? "dark" : "light" });
  }, [rawMarkdown, currentSlide, remainingMap, sidebarWidth, t.dark]);

  // ── Current slide's timer key + duration
  const slide = meeting.slides[currentSlide] || meeting.slides[0];
  const timerInfo = useMemo(() => {
    if (!slide || slide.kind !== "agenda") return null;
    const it = slide.item;
    if (slide.subIndex != null) {
      const s = it.subs[slide.subIndex];
      return { key: s.key, durationMs: s.durationMs };
    }
    if (it.subs.length) {
      // Item-overview slide for a sub-item parent — show total but don't auto-run
      return { key: `${it.agendaIndex}.total`, durationMs: it.durationMs };
    }
    return { key: it.key, durationMs: it.durationMs };
  }, [slide]);

  const remainingMs = timerInfo
    ? remainingMap[timerInfo.key] != null
      ? remainingMap[timerInfo.key]
      : timerInfo.durationMs
    : 0;

  // ── Timer tick
  const tickRef = useRef(null);
  useEffect(() => {
    if (!running || !timerInfo) return;
    // Seed `last` from the rAF's own timestamp on first tick (not from
    // performance.now() at effect-mount time). rAF's `now` is the frame's
    // *start* time, which can predate effect-mount when the click and React
    // commit land mid-frame — making the first `dt` negative and ticking the
    // remaining time *up* for one paint (e.g. 7:00 → 7:01 → 7:00).
    let last = null;
    function step(now) {
      if (last == null) last = now;
      const dt = Math.max(0, now - last);
      last = now;
      if (dt > 0) {
        setRemainingMap((m) => ({
          ...m,
          [timerInfo.key]: (m[timerInfo.key] != null ? m[timerInfo.key] : timerInfo.durationMs) - dt,
        }));
      }
      tickRef.current = requestAnimationFrame(step);
    }
    tickRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(tickRef.current);
  }, [running, timerInfo]);

  // ── Countdown sounds (last 10s + 0:00 chime)
  // Mirror Canva's pacing: a soft tick at 10s, 9s, ... 1s, then a brighter
  // two-note chime at 0:00 — but synthesized fresh via Web Audio so we don't
  // ship anyone else's samples.
  const audioCtxRef = useRef(null);
  function getAudio() {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    } catch { return null; }
    return audioCtxRef.current;
  }
  function playTick(volume, emphasis) {
    const ctx = getAudio(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(emphasis ? 880 : 660, now);
    const peak = (emphasis ? 0.22 : 0.13) * volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
  function playFinal(volume) {
    const ctx = getAudio(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const notes = [
      { f: 1318.5, t: 0.00, d: 0.7 }, // E6
      { f: 1760.0, t: 0.16, d: 0.9 }, // A6
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, now + n.t);
      const peak = 0.28 * volume;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + n.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    }
  }

  // Watch the timer's integer-second display and fire on each transition.
  // Mirror the readout's Math.floor rounding so the chime lands the instant
  // the display rolls to "0:00" (not a second later).
  const lastTickSecRef = useRef(null);
  useEffect(() => {
    if (!timerInfo) { lastTickSecRef.current = null; return; }
    if (!running) { lastTickSecRef.current = null; return; }
    if (!t.countdownSounds) return;
    // Mirror the readout's Math.ceil rounding so the tick lands the instant
    // the display rolls to "0:10", "0:09", ... and the chime lands at "0:00".
    const sec = remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000);
    const prev = lastTickSecRef.current;
    if (prev === sec) return;
    lastTickSecRef.current = sec;
    const vol = Math.max(0, Math.min(1, t.soundVolume ?? 0.6));
    if (prev == null) {
      // First observation after start/resume — fire if we land inside the
      // countdown window (so resuming at 0:05 still ticks).
      if (sec >= 1 && sec <= 10) playTick(vol, sec <= 5);
      return;
    }
    if (sec >= prev) return;        // only fire on countdown, not bumps upward
    if (sec === 0) playFinal(vol);
    else if (sec >= 1 && sec <= 10) playTick(vol, sec <= 5);
  }, [remainingMs, running, timerInfo, t.countdownSounds, t.soundVolume]);

  // ── When slide changes, pause + clear flash
  useEffect(() => {
    setRunning(false);
  }, [currentSlide]);

  // ── Navigation
  const goto = useCallback(
    (i) => {
      const max = meeting.slides.length - 1;
      setCurrentSlide(Math.max(0, Math.min(max, i)));
    },
    [meeting.slides.length]
  );

  // ── Keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "j" || e.key === "PageDown") {
        e.preventDefault();
        goto(currentSlide + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "k" || e.key === "PageUp") {
        e.preventDefault();
        goto(currentSlide - 1);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setRunning((r) => !r);
      } else if (e.key === "r" || e.key === "R") {
        if (timerInfo) {
          setRemainingMap((m) => ({ ...m, [timerInfo.key]: timerInfo.durationMs }));
          setRunning(false);
        }
      } else if (e.key === "[") {
        setSidebarOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentSlide, goto, timerInfo]);

  // ── Drag-and-drop .md / .markdown / .txt files anywhere on the window
  const [dragHover, setDragHover] = useState(false);
  useEffect(() => {
    const dragCount = { current: 0 };
    function isAgendaDrag(e) {
      if (!e.dataTransfer) return false;
      return Array.from(e.dataTransfer.types || []).some((t) =>
        /file/i.test(t)
      );
    }
    function onEnter(e) {
      if (!isAgendaDrag(e)) return;
      dragCount.current += 1;
      setDragHover(true);
    }
    function onLeave() {
      dragCount.current = Math.max(0, dragCount.current - 1);
      if (dragCount.current === 0) setDragHover(false);
    }
    function onOver(e) {
      if (!isAgendaDrag(e)) return;
      e.preventDefault();
    }
    function onDrop(e) {
      dragCount.current = 0;
      setDragHover(false);
      if (!isAgendaDrag(e)) return;
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!/\.(md|markdown|txt)$/i.test(file.name)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        onLoad(text);
      };
      reader.readAsText(file);
    }
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [/* onLoad changes don't matter; we always call latest from closure */ rawMarkdown]);

  // ── Handlers
  function onLoad(md) {
    setRawMarkdown(md);
    setMeeting(window.parseAgenda(md));
    setCurrentSlide(0);
    setRemainingMap({});
    setRunning(false);
  }
  function onSample() {
    onLoad(SAMPLE);
  }
  function bumpTimer(delta) {
    if (!timerInfo) return;
    setRemainingMap((m) => ({
      ...m,
      [timerInfo.key]: (m[timerInfo.key] != null ? m[timerInfo.key] : timerInfo.durationMs) + delta,
    }));
  }
  function setTimerTo(ms) {
    if (!timerInfo) return;
    setRemainingMap((m) => ({ ...m, [timerInfo.key]: ms }));
  }
  function resetTimer() {
    if (!timerInfo) return;
    setRemainingMap((m) => ({ ...m, [timerInfo.key]: timerInfo.durationMs }));
    setRunning(false);
  }
  // Voice list for the TTS picker. Re-fetched whenever the engine reports
  // voices are available (browser-dependent, sometimes async).
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const sync = () => {
      const list = window.speechSynthesis.getVoices();
      const en = list.filter((v) => /^en/i.test(v.lang));
      setVoices(en.length ? en : list);
    };
    sync();
    window.speechSynthesis.addEventListener?.("voiceschanged", sync);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", sync);
  }, []);

  function pickFemaleVoice() {
    if (t.ttsVoice) {
      const named = voices.find((v) => v.name === t.ttsVoice);
      if (named) return named;
    }
    const femaleHints = /(zira|samantha|karen|victoria|allison|susan|kate|fiona|moira|tessa|jenny|aria|emma|amy|google us english|female)/i;
    return (
      voices.find((v) => femaleHints.test(v.name)) ||
      voices.find((v) => v.name.toLowerCase().includes("female")) ||
      voices[0] ||
      null
    );
  }

  function speakSentence(sentence) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sentence);
      u.rate = 1.05;
      u.pitch = 1.05;
      const v = pickFemaleVoice();
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function previewVoice(name) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Two minutes remaining.");
      u.rate = 1.05;
      u.pitch = 1.05;
      const v = voices.find((vv) => vv.name === name);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch {}
  }
  function readTimer() {
    if (!timerInfo) return;
    const ms = remainingMs;
    const over = ms < 0;
    const abs = Math.abs(ms);
    const mins = Math.floor(abs / 60000);
    const secs = Math.round((abs % 60000) / 1000);
    let phrase = "";
    if (mins > 0 && secs > 0) phrase = `${mins} minute${mins !== 1 ? "s" : ""} and ${secs} second${secs !== 1 ? "s" : ""}`;
    else if (mins > 0) phrase = `${mins} minute${mins !== 1 ? "s" : ""}`;
    else phrase = `${secs} second${secs !== 1 ? "s" : ""}`;
    const sentence = over ? `${phrase} over time` : `${phrase} remaining`;
    speakSentence(sentence);
  }

  const currentNum = slide && slide.kind === "agenda" ? slide.item.agendaIndex : null;
  const totalNum = meeting.items.length;

  // ── Layout
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--paper)",
      }}
    >
      {(
        <aside
          aria-hidden={!sidebarOpen}
          style={{
            width: sidebarOpen ? sidebarWidth : 0,
            flexShrink: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            borderRight: sidebarOpen ? "1px solid var(--line)" : "1px solid transparent",
            background: "var(--paper-2)",
            overflow: "hidden",
            transition: resizing
              ? "none"
              : "width 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease",
            pointerEvents: sidebarOpen ? "auto" : "none",
          }}
        >
          <div
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              opacity: sidebarOpen ? 1 : 0,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-12px)",
              transition: resizing
                ? "none"
                : "opacity 200ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 20px 14px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--sans)",
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                whiteSpace: "nowrap",
              }}
            >
              Meeting Manager
            </span>
            <window.IconButton
              onClick={() => setSidebarOpen(false)}
              title="Hide sidebar — [ key"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M6 3L2 7L6 11M12 3L8 7L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </window.IconButton>
          </div>
          <window.AgendaInput
            rawMarkdown={rawMarkdown}
            onLoad={onLoad}
            onSample={onSample}
            sampleText={SAMPLE}
            errors={meeting.errors}
          />
          <window.AgendaList
            items={meeting.items}
            slides={meeting.slides}
            currentSlide={currentSlide}
            onJump={goto}
            totalLabel={meeting.totalLabel}
          />
          {/* Resize handle */}
          </div>
          <div
            onMouseDown={startResize}
            onDoubleClick={() => setSidebarWidth(320)}
            title="Drag to resize · double-click to reset"
            style={{
              position: "absolute",
              top: 0,
              right: -4,
              width: 8,
              height: "100%",
              cursor: "col-resize",
              zIndex: 10,
              background: "transparent",
              opacity: sidebarOpen ? 1 : 0,
              pointerEvents: sidebarOpen ? "auto" : "none",
              transition: "opacity 200ms ease",
            }}
            onMouseEnter={(e) => {
              const bar = e.currentTarget.querySelector("span");
              if (bar) bar.style.background = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              const bar = e.currentTarget.querySelector("span");
              if (bar) bar.style.background = "transparent";
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 3,
                width: 2,
                height: "100%",
                background: "transparent",
                transition: "background 120ms",
                pointerEvents: "none",
              }}
            />
          </div>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--paper)",
        }}
      >
        {/* Top strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 36px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <window.IconButton
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Hide sidebar — [ key" : "Show sidebar — [ key"}
              active={!sidebarOpen}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <line x1="5.5" y1="3" x2="5.5" y2="11" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </window.IconButton>
            <span
              style={{
                fontFamily: "var(--sans)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {`Slide ${currentSlide + 1} of ${meeting.slides.length}`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <window.IconButton onClick={() => goto(currentSlide - 1)} title="Previous — ← key">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </window.IconButton>
            <window.IconButton onClick={() => goto(currentSlide + 1)} title="Next — → key">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </window.IconButton>
            <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
            {t.showSecondaryClock && <window.LiveClock />}
            <window.IconButton
              onClick={() => setTweak("dark", !t.dark)}
              title="Toggle theme"
              active={t.dark}
            >
              {t.dark ? <MoonIcon /> : <SunIcon />}
            </window.IconButton>
          </div>
        </div>

        {/* Stage */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex" }}>
          <window.Stage
            slide={slide}
            meeting={meeting}
            tweaks={t}
            current={currentNum}
            total={totalNum}
          />
        </div>

        {/* Timer */}
        {timerInfo ? (
          <window.TimerRing
            remainingMs={remainingMs}
            durationMs={timerInfo.durationMs}
            running={running}
            onToggle={() => setRunning((r) => !r)}
            onReset={resetTimer}
            onBump={bumpTimer}
            onSetTime={setTimerTo}
            onReadTime={readTimer}
            tweaks={t}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 28px",
              borderTop: "1px solid var(--line)",
              background: "var(--paper)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, color: "var(--muted)", fontSize: 14 }}>
              {slide?.kind === "title" ? (
                <>
                  <span style={{ color: "var(--muted)" }}>Ready when you are.</span>
                </>
              ) : (
                <span style={{ color: "var(--muted)" }}>Nice meeting!</span>
              )}
            </div>
            <window.GhostButton
              primary
              onClick={() => goto(slide?.kind === "title" ? 1 : 0)}
            >
              {slide?.kind === "title" ? "Start meeting →" : "Start over"}
            </window.GhostButton>
          </div>
        )}
      </main>

      <TweaksPanelWrapper t={t} setTweak={setTweak} voices={voices} previewVoice={previewVoice} />

      <style>{`
        @keyframes mm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes mm-overtime-flicker {
          0%, 100% {
            text-shadow:
              0 0 5px #FF9F1B,
              0 0 13px #FF6A0F,
              0 0 27px #FF3500,
              0 0 46px rgba(255, 45, 0, 0.9);
          }
          45% {
            text-shadow:
              0 0 7px #FFB033,
              0 0 19px #FF7A1A,
              0 0 37px #FF3700,
              0 0 62px rgba(255, 55, 0, 0.95);
          }
          70% {
            text-shadow:
              0 0 5px #FF8C2E,
              0 0 11px #FF5A0A,
              0 0 23px #E62A00,
              0 0 41px rgba(255, 45, 0, 0.78);
          }
        }
        @keyframes mm-overtime-flame {
          0%   { transform: scale(1) translateY(0) rotate(-1deg); }
          50%  { transform: scale(1.08) translateY(-0.5px) rotate(1.5deg); }
          100% { transform: scale(0.96) translateY(0.5px) rotate(-2deg); }
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        textarea { scrollbar-gutter: stable; }
        textarea::-webkit-scrollbar { width: 10px; }
        textarea::-webkit-scrollbar-thumb {
          background: var(--line-strong);
          background-clip: padding-box;
          border: 3px solid transparent;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

function TweaksPanelWrapper({ t, setTweak, voices, previewVoice }) {
  const voiceOptions = [
    { value: "", label: "Auto (best female)" },
    ...voices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` })),
  ];
  return (
    <window.TweaksPanel>
      <window.TweakSection label="Overtime border">
        <window.TweakColor
          label="Color"
          value={t.overtimeStrokeColor}
          onChange={(v) => setTweak("overtimeStrokeColor", v)}
          options={["#7A3812", "#A0522D", "#5A1A00", "#3A1A06", "#C2410C", "#1F1F1F"]}
        />
        <window.TweakSlider
          label="Width"
          value={t.overtimeStrokeWidth}
          min={0}
          max={4}
          step={0.25}
          unit="px"
          onChange={(v) => setTweak("overtimeStrokeWidth", v)}
        />
      </window.TweakSection>

      <window.TweakSection label="Voice">
        <window.TweakSelect
          label="Speak time voice"
          value={t.ttsVoice}
          onChange={(v) => {
            setTweak("ttsVoice", v);
            if (v) previewVoice(v);
          }}
          options={voiceOptions}
        />
        <window.TweakButton
          label="Preview current voice"
          onClick={() => previewVoice(t.ttsVoice)}
        />
      </window.TweakSection>

      <window.TweakSection label="Countdown sounds">
        <window.TweakToggle
          label="Tick last 10 seconds"
          value={t.countdownSounds}
          onChange={(v) => setTweak("countdownSounds", v)}
        />
        <window.TweakSlider
          label="Volume"
          value={t.soundVolume}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setTweak("soundVolume", v)}
        />
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

function Mark() { return null; }

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="7" y1="1" x2="7" y2="2.5" />
        <line x1="7" y1="11.5" x2="7" y2="13" />
        <line x1="1" y1="7" x2="2.5" y2="7" />
        <line x1="11.5" y1="7" x2="13" y2="7" />
        <line x1="2.6" y1="2.6" x2="3.6" y2="3.6" />
        <line x1="10.4" y1="10.4" x2="11.4" y2="11.4" />
        <line x1="2.6" y1="11.4" x2="3.6" y2="10.4" />
        <line x1="10.4" y1="3.6" x2="11.4" y2="2.6" />
      </g>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
})();
