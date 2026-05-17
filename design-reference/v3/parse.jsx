// Markdown agenda parser. Matches the grammar in README:
//   # <Meeting Title>
//   **Meeting Admins**
//   - **Meeting Master:** <name>
//   - **Notetaker:** <name>
//   **Agenda**
//   1. <title> (<names>) - <N>[.<N>] min [max per person] [by H:MM AM/PM]

(function () {
  function stripMd(s) {
    return String(s || "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .trim();
  }

  function parseAdmins(block) {
    const roles = [];
    const lines = block.split(/\r?\n/);
    for (const raw of lines) {
      const m = raw.match(/^\s*[-*]\s+(.*)$/);
      if (!m) continue;
      const cleaned = stripMd(m[1]);
      const kv = cleaned.match(/^([^:]+):\s*(.+)$/);
      if (!kv) continue;
      roles.push({ role: kv[1].trim(), value: kv[2].trim() });
    }
    return roles;
  }

  // Duration grammar. A token can be one or two parts joined by whitespace:
  //   "5 min", "30s", "1.5m", "1 min 30 s", "2 minutes 15 seconds"
  // Unit alternation is longest-first so "minutes" wins over "m".
  const UNIT = "(?:minutes|minute|mins|min|seconds|second|secs|sec|m|s)";
  const PART = `\\d+(?:\\.\\d+)?\\s*${UNIT}\\b`;
  const TOKEN = `${PART}(?:\\s+${PART})?`;

  function parseDurationToken(str) {
    const re = /(\d+(?:\.\d+)?)\s*(minutes|minute|mins|min|seconds|second|secs|sec|m|s)\b/gi;
    let total = 0, any = false, m;
    while ((m = re.exec(str)) !== null) {
      const n = parseFloat(m[1]);
      const u = m[2].toLowerCase();
      const isSec = u === "s" || u.startsWith("sec");
      total += n * (isSec ? 1000 : 60000);
      any = true;
    }
    return any ? Math.max(1, Math.round(total)) : null;
  }

  function formatDurLabel(ms) {
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec} sec`;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (s === 0) return `${m} min`;
    return `${m} min ${s} sec`;
  }

  function parseDeadline(text) {
    const m = text.match(/by\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mins = m[2] ? parseInt(m[2], 10) : 0;
    const ap = (m[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { h, m: mins, raw: m[0].replace(/^by\s+/i, "") };
  }

  function fmtClock(h, m, s) {
    const hh = ((h + 11) % 12) + 1;
    const ap = h >= 12 ? "PM" : "AM";
    const secs = s ? `:${String(s).padStart(2, "0")}` : "";
    return `${hh}:${String(m).padStart(2, "0")}${secs} ${ap}`;
  }

  // Split "Opening context (Sarah, Tifa)" -> { title, names }
  const STRIP_PERPERSON = new RegExp(
    `(?:max\\s+)?${TOKEN}\\s*(?:max\\s*)?per\\s+person`,
    "gi"
  );
  function splitTitle(raw) {
    const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!m) return { title: raw.trim(), names: [] };
    const names = m[2]
      .split(",")
      .map((n) => stripMd(n.replace(STRIP_PERPERSON, "")).trim())
      .filter(Boolean);
    return { title: m[1].trim(), names };
  }

  const SEP_RE = new RegExp(
    `\\s+(?:[\\u2014\\u2013]|--|-)\\s*(?=(?:max\\s+)?${TOKEN})`,
    "i"
  );
  const DUR_RE = new RegExp(`^(${TOKEN})`, "i");
  const PERPERSON_RE = new RegExp(
    `(?:max\\s+)?(${TOKEN})\\s*(?:max\\s*)?per\\s+person`,
    "i"
  );

  function parseAgendaLine(raw, idx) {
    const text = stripMd(raw);
    // Find the duration separator
    const sep = text.match(SEP_RE);
    if (!sep) {
      return { error: "Missing duration for: " + text };
    }
    const titlePart = text.slice(0, sep.index).trim();
    const detailPart = text.slice(sep.index + sep[0].length).trim();
    const durM = detailPart.match(DUR_RE);
    if (!durM) return { error: "Missing duration value: " + text };
    const perPersonM = (titlePart + " " + detailPart).match(PERPERSON_RE);
    const { title, names } = splitTitle(titlePart);
    let durationMs = parseDurationToken(durM[1]);
    const deadline = parseDeadline(detailPart);
    let subs = [];
    let perPersonMs = null;
    if (perPersonM) {
      perPersonMs = parseDurationToken(perPersonM[1]);
      if (names.length) {
        subs = names.map((n, i) => ({
          name: n,
          durationMs: perPersonMs,
          key: `${idx + 1}.${i}`,
        }));
        durationMs = perPersonMs * subs.length;
      }
    }
    return {
      agendaIndex: idx + 1,
      title: title || "Untitled",
      names,
      durationMs,
      durationLabel: formatDurLabel(perPersonMs || durationMs),
      perPersonMs,
      deadline,
      deadlineLabel: deadline ? fmtClock(deadline.h, deadline.m) : null,
      subs,
      key: subs.length ? null : String(idx + 1),
    };
  }

  function findSection(text, header) {
    const re = new RegExp(
      `\\*\\*\\s*${header}\\s*\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\s*\\*\\*|$)`,
      "i"
    );
    const m = text.match(re);
    return m ? m[1] : "";
  }

  function parseAgendaSection(block) {
    const lines = block.split(/\r?\n/);
    const out = [];
    for (const raw of lines) {
      const m = raw.match(/^\s*(?:\d+\.\s+|[-*]\s+)(.*\S)\s*$/);
      if (!m) continue;
      out.push(m[1]);
    }
    return out;
  }

  function parseStartTime(text) {
    // Matches "**Start Time:** 1 PM", "**Start Time**: 1:00 PM", etc.
    const m = String(text || "").match(
      /\*\*\s*Start\s*Time\s*:?\s*\*\*\s*:?\s*([^\n]+)/i
    );
    if (!m) return null;
    const tm = m[1].trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!tm) return null;
    let h = parseInt(tm[1], 10);
    const mins = tm[2] ? parseInt(tm[2], 10) : 0;
    const ap = (tm[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { h, m: mins };
  }

  function parseAgenda(markdown) {
    const text = String(markdown || "").replace(/\r\n/g, "\n");
    const titleM = text.match(/^\s*#\s+(.+?)\s*$/m);
    const meetingTitle = titleM ? stripMd(titleM[1]) : "Meeting";

    const adminsBlock = findSection(text, "Meeting Admins");
    const agendaBlock = findSection(text, "Agenda");

    const admins = parseAdmins(adminsBlock);
    const startTime = parseStartTime(text);
    const errors = [];
    const items = [];
    parseAgendaSection(agendaBlock).forEach((line, i) => {
      const r = parseAgendaLine(line, i);
      if (r.error) errors.push(r.error);
      else items.push(r);
    });

    if (!adminsBlock) errors.push("Meeting Admins section not found");
    if (!agendaBlock) errors.push("Agenda section not found");
    if (!startTime) {
      errors.push(
        'Missing **Start Time** — add a line like "**Start Time:** 1 PM" right after the title so clock times can be computed.'
      );
    }

    // ── Auto-fill missing deadlines. Walk items in order:
    //  • If an item has an explicit deadline, sync the running clock to it.
    //  • Else if we have a running clock, advance it by this item's duration
    //    and synthesize a deadline.
    //  • Anchor priority: explicit **Start Time** > existing item deadline >
    //    "now" rounded up to the next 5 minutes.
    const hasAnyDeadline = items.some((it) => it.deadline);
    let running = null; // Date
    if (startTime) {
      running = new Date();
      running.setHours(startTime.h, startTime.m, 0, 0);
    } else if (!hasAnyDeadline && items.length) {
      const now = new Date();
      const m = now.getMinutes();
      now.setMinutes(m + ((5 - (m % 5)) % 5 || 5), 0, 0);
      running = now;
    }
    items.forEach((it) => {
      if (it.deadline) {
        const d = new Date();
        d.setHours(it.deadline.h, it.deadline.m, 0, 0);
        running = d;
      } else if (running) {
        running = new Date(running.getTime() + it.durationMs);
        it.deadline = { h: running.getHours(), m: running.getMinutes() };
        it.deadlineLabel = fmtClock(running.getHours(), running.getMinutes());
        it.deadlineComputed = true;
      }
      // Compute per-sub deadlines if we know when the parent ends.
      if (it.subs.length && running) {
        const parentEnd = running.getTime();
        const parentStart = parentEnd - it.durationMs;
        let subRun = parentStart;
        it.subs.forEach((s, si) => {
          subRun += s.durationMs;
          // Last sub always lands exactly on the parent's deadline so the
          // visible clock ticks line up with the agenda's stated end time.
          const t = si === it.subs.length - 1 ? parentEnd : subRun;
          const d = new Date(t);
          s.deadline = { h: d.getHours(), m: d.getMinutes() };
          s.deadlineLabel = fmtClock(d.getHours(), d.getMinutes());
        });
      }
    });

    // Backward pass: head-of-list items with no explicit clock still need a
    // deadline if a later item anchors one. Walk right→left and back-compute
    // from the next item's start.
    for (let i = items.length - 2; i >= 0; i--) {
      const it = items[i];
      if (it.deadline) continue;
      const next = items[i + 1];
      if (!next || !next.deadline) continue;
      const nd = new Date();
      nd.setHours(next.deadline.h, next.deadline.m, 0, 0);
      const end = new Date(nd.getTime() - next.durationMs);
      it.deadline = { h: end.getHours(), m: end.getMinutes() };
      it.deadlineLabel = fmtClock(end.getHours(), end.getMinutes());
      it.deadlineComputed = true;
      if (it.subs.length) {
        const parentEnd = end.getTime();
        const parentStart = parentEnd - it.durationMs;
        let subRun = parentStart;
        it.subs.forEach((s, si) => {
          subRun += s.durationMs;
          const t = si === it.subs.length - 1 ? parentEnd : subRun;
          const d = new Date(t);
          s.deadline = { h: d.getHours(), m: d.getMinutes() };
          s.deadlineLabel = fmtClock(d.getHours(), d.getMinutes());
        });
      }
    }

    // Build slides: title -> agenda items (with sub-items) -> complete
    const slides = [{ kind: "title", title: meetingTitle, admins }];
    items.forEach((it) => {
      if (it.subs.length) {
        slides.push({ kind: "agenda", item: it, subIndex: null });
        it.subs.forEach((s, si) =>
          slides.push({ kind: "agenda", item: it, subIndex: si })
        );
      } else {
        slides.push({ kind: "agenda", item: it, subIndex: null });
      }
    });
    slides.push({ kind: "complete", title: "Meeting complete" });

    const totalMs = items.reduce((s, i) => s + i.durationMs, 0);
    return {
      meetingTitle,
      admins,
      startTime,
      items,
      slides,
      errors,
      totalMs,
      totalLabel: formatDurLabel(totalMs),
    };
  }

  // Walk the **Agenda** block and append ", by H:MM PM" to every numbered /
  // bulleted line that has a duration but no "by ..." clock time. We rely on
  // parseAgenda's deadline auto-fill so the times line up with the running
  // clock the rest of the app uses.
  function addMissingDeadlines(text) {
    const parsed = parseAgenda(text);
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    let inAgenda = false;
    let itemIdx = 0;
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const headerM = trimmed.match(/^\*\*\s*(.+?)\s*\*\*\s*$/);
      if (headerM) {
        inAgenda = /^agenda$/i.test(headerM[1]);
        continue;
      }
      if (!inAgenda) continue;
      const m = line.match(/^(\s*(?:\d+\.\s+|[-*]\s+))(.*\S)\s*$/);
      if (!m) continue;
      // Only lines with a duration separator became items in the parser.
      if (!SEP_RE.test(line)) continue;
      const item = parsed.items[itemIdx];
      itemIdx++;
      if (!item) continue;
      if (/\bby\s+\d/i.test(line)) continue;          // already has a clock
      if (!item.deadlineLabel) continue;
      // Strip a dangling partial "by H:MM AM/PM" suffix the user left behind
      // (e.g. they deleted some-but-not-all of the time) so we don't end up
      // with "…, b, by 1:28 PM" or "…, by, by 1:14 PM". Handles every truncation
      // point of ", by 1:28 PM": ", b", ", by", ", by 1", ", by 1:2",
      // ", by 1:28", ", by 1:28 P", etc. Also handles a bare trailing comma.
      const cleaned = line
        .replace(
          /,?\s*\bby?\b(?:\s+\d{1,2}(?::\d{0,2})?\s*[ap]?\.?m?\.?)?\s*$/i,
          ""
        )
        .replace(/,\s*$/, "")
        .replace(/\s+$/, "");
      lines[i] = `${cleaned}, by ${item.deadlineLabel}`;
      count++;
    }
    return { text: lines.join("\n"), count };
  }

  window.parseAgenda = parseAgenda;
  window.formatDurLabel = formatDurLabel;
  window.fmtClock = fmtClock;
  window.addMissingDeadlines = addMissingDeadlines;
})();
