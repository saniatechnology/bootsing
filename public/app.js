(function () {
  const FLAG_ICON = { closing: "\u{1F534}", rare: "⭐", finale: "\u{1F389}" };
  const FLAG_LABEL = { closing: "Last chance", rare: "One-off / rare", finale: "Season finale" };
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let EVENTS = [];
  let META = null;
  let chatHistory = [];

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function parseDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }
  function fmtDateRange(s, e) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (s.getTime() === e.getTime()) return `${months[s.getUTCMonth()]} ${s.getUTCDate()}`;
    if (s.getUTCMonth() === e.getUTCMonth())
      return `${months[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
    return `${months[s.getUTCMonth()]} ${s.getUTCDate()} – ${months[e.getUTCMonth()]} ${e.getUTCDate()}`;
  }

  function clip(e, wkStart, wkEnd) {
    const s = new Date(Math.max(parseDate(e.start), wkStart));
    const en = new Date(Math.min(parseDate(e.end), wkEnd));
    if (s > en) return null;
    return [s, en];
  }

  function renderChips() {
    const catRow = document.getElementById("cat-filters");
    const genreRow = document.getElementById("genre-filters");
    const resetBtn = document.getElementById("reset-cats");

    Object.entries(META.cats).forEach(([key, { label, color }]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip cat-chip";
      btn.dataset.cat = key;
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = `<span class="catdot" style="background:${color}"></span>${esc(label)}`;
      catRow.insertBefore(btn, resetBtn);
    });

    Object.entries(META.genreLabels).forEach(([g, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const off = g === "electronic";
      btn.className = "chip genre-chip" + (off ? " off" : "");
      btn.dataset.genre = g;
      btn.setAttribute("aria-pressed", off ? "false" : "true");
      btn.textContent = label;
      genreRow.appendChild(btn);
    });

    function applyChip(chip, isOn) {
      chip.classList.toggle("off", !isOn);
      chip.setAttribute("aria-pressed", String(isOn));
      const cls = chip.dataset.cat ? "hide-cat-" + chip.dataset.cat : "hide-genre-" + chip.dataset.genre;
      document.body.classList.toggle(cls, !isOn);
    }
    document.querySelectorAll(".chip[data-cat], .chip[data-genre]").forEach((chip) => {
      applyChip(chip, !chip.classList.contains("off"));
      chip.addEventListener("click", () => applyChip(chip, chip.classList.contains("off")));
    });
    resetBtn.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-cat]").forEach((chip) => applyChip(chip, true));
    });
  }

  function renderWeeks() {
    const container = document.getElementById("weeks");
    container.innerHTML = "";

    META.weeks.forEach(([wkStartStr, wkEndStr], wi) => {
      const wkStart = parseDate(wkStartStr);
      const wkEnd = parseDate(wkEndStr);
      const ndays = daysBetween(wkStart, wkEnd) + 1;

      const items = [];
      for (const e of EVENTS) {
        const c = clip(e, wkStart, wkEnd);
        if (c) {
          const fullDur = daysBetween(parseDate(e.start), parseDate(e.end)) + 1;
          items.push({ e, cs: c[0], ce: c[1], fullDur });
        }
      }
      items.sort((a, b) => a.fullDur - b.fullDur || a.cs - b.cs);

      const headers = [];
      for (let d = new Date(wkStart); d <= wkEnd; d.setUTCDate(d.getUTCDate() + 1)) headers.push(new Date(d));

      const section = document.createElement("section");
      section.className = "week";

      const headerCells = headers
        .map(
          (h) =>
            `<div class="daycell head"><span class="dow">${DAY_NAMES[h.getUTCDay()]}</span><span class="dnum">${h.getUTCDate()}</span></div>`
        )
        .join("");

      const rows = [];
      const detailRows = [];
      items.forEach((it, i) => {
        const idx = i + 1;
        const colStart = daysBetween(wkStart, it.cs) + 1;
        const span = daysBetween(it.cs, it.ce) + 1;
        const { cat, genre, flags, approx, name, venue } = it.e;
        const { label: catLabel, color: catColor } = META.cats[cat];
        const genreAttr = genre ? ` data-genre="${genre}"` : "";
        const genreChip = genre ? `<span class="genrechip">${esc(META.genreLabels[genre])}</span>` : "";
        const flagIcons = (flags || [])
          .map((f) => `<span class="flagchip" title="${FLAG_LABEL[f]}">${FLAG_ICON[f]}</span>`)
          .join("");
        const approxMark = approx ? ' <span class="approx">approx.</span>' : "";

        rows.push(
          `<div class="ev-row" data-cat="${cat}"${genreAttr} style="grid-row:${idx + 1}; grid-column:${colStart} / span ${span}; --cat: ${catColor};">` +
            `<span class="ev-badge">${idx}</span>` +
            `<span class="ev-name">${esc(name)}</span>` +
            `<span class="ev-venue">${esc(venue)}</span>` +
            `${flagIcons}${approxMark}</div>`
        );

        detailRows.push(
          `<tr data-cat="${cat}"${genreAttr}>` +
            `<td class="dnum-cell">${idx}</td>` +
            `<td><span class="catdot" style="background:${catColor}"></span>${esc(catLabel)}${genreChip}</td>` +
            `<td class="evn">${esc(name)}${approxMark}</td>` +
            `<td>${esc(venue)}</td>` +
            `<td class="mono">${fmtDateRange(parseDate(it.e.start), parseDate(it.e.end))}</td>` +
            `<td>${esc(it.e.cost)}</td>` +
            `<td>${esc(it.e.desc)}</td>` +
            `<td><a href="${it.e.link}" target="_blank" rel="noopener">More info ↗</a></td>` +
            `</tr>`
        );
      });

      const gridRowsCount = items.length + 1;
      section.innerHTML = `
        <h2 class="week-title">Week ${wi + 1} <span class="week-range">${fmtDateRange(wkStart, wkEnd)}</span></h2>
        <div class="grid" style="grid-template-columns: repeat(${ndays}, 1fr); grid-template-rows: auto repeat(${gridRowsCount - 1}, auto);">
          ${headerCells}
          ${rows.join("")}
        </div>
        <div class="detail-wrap">
          <table class="detail-table">
            <thead><tr><th>#</th><th>Category</th><th>Event</th><th>Venue</th><th>Date</th><th>Cost</th><th>Description</th><th></th></tr></thead>
            <tbody>${detailRows.join("")}</tbody>
          </table>
        </div>`;
      container.appendChild(section);
    });
  }

  async function loadEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    EVENTS = data.events;
    META = data.meta;
    renderWeeks();
  }

  async function init() {
    await loadEvents();
    renderChips();
    wireChat();
  }

  function addMsg(role, text) {
    const log = document.getElementById("chat-log");
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function wireChat() {
    const toggle = document.getElementById("chat-toggle");
    const panel = document.getElementById("chat-panel");
    const closeBtn = document.getElementById("chat-close");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");

    toggle.addEventListener("click", () => panel.classList.toggle("hidden"));
    closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMsg("user", text);
      addMsg("system", "Thinking…");
      const log = document.getElementById("chat-log");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: chatHistory }),
        });
        const data = await res.json();
        log.removeChild(log.lastChild); // remove "Thinking..."
        if (!res.ok) {
          addMsg("system", "Error: " + (data.error || "something went wrong"));
          return;
        }
        chatHistory = data.history;
        addMsg("assistant", data.reply);
        if (data.changes && data.changes.length > 0) {
          EVENTS = data.events;
          renderWeeks();
        }
      } catch (err) {
        log.removeChild(log.lastChild);
        addMsg("system", "Error: " + err.message);
      }
    });
  }

  init();
})();
