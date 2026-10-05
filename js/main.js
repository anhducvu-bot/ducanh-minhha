/* Renders the invitation from window.WEDDING (config.js). */
(function () {
  const W = window.WEDDING;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const date = new Date(W.date);
  const pad = (n) => String(n).padStart(2, "0");
  const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  // Guest name from ?to=... (e.g. ?to=Anh%20Minh)
  const params = new URLSearchParams(location.search);
  const guest = (params.get("to") || params.get("guest") || "").trim().slice(0, 60) || W.defaultGuest;

  const derived = {
    guest,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    weekday: WEEKDAYS[date.getDay()],
    day: pad(date.getDate()),
    monthLabel: `Tháng ${pad(date.getMonth() + 1)}`,
    yearLabel: `Năm ${date.getFullYear()}`,
    monthTitle: `Tháng ${date.getMonth() + 1} · ${date.getFullYear()}`,
    dateShort: `${pad(date.getDate())} . ${pad(date.getMonth() + 1)} . ${date.getFullYear()}`,
  };

  const lookup = (path) =>
    path in derived ? derived[path] : path.split(".").reduce((o, k) => (o == null ? o : o[k]), W);

  // Fill every [data-bind] element (textContent — safe for user-provided ?to=)
  $$("[data-bind]").forEach((el) => {
    const v = lookup(el.dataset.bind);
    if (v == null || v === "") el.hidden = true;
    else el.textContent = v;
  });

  // Parents' names: "Ông. Nguyễn Bội Hồng Minh" must always stay on ONE line.
  // The two family columns size to their names; if side by side doesn't fit
  // the screen, stack Nhà Trai above Nhà Gái (names keep their full size).
  const familyGrid = $(".family-grid");
  function fitFamilies() {
    familyGrid.classList.remove("stack");
    familyGrid.classList.toggle("stack", familyGrid.scrollWidth > familyGrid.clientWidth + 1);
  }
  fitFamilies();
  window.addEventListener("resize", fitFamilies);
  if (document.fonts) document.fonts.ready.then(fitFamilies);

  document.title = `Thiệp cưới ${W.groom.name} & ${W.bride.name}`;

  // Cover + desktop backdrop
  const cover = W.coverPhoto || W.photos[0];
  $("#coverImg").src = cover;
  if (W.coverText === "bottom") $(".cover").classList.add("text-bottom");

  // Lock the cover to the screen height measured when the page opens. iPhone
  // Safari changes the viewport height while its toolbar shrinks on scroll, which
  // made a viewport-sized cover (and its photo) grow. Only re-measure when the
  // width changes (e.g. the phone is rotated), never on height-only changes.
  let coverW = 0;
  function lockCoverHeight() {
    if (window.innerWidth === coverW) return;
    coverW = window.innerWidth;
    const h = Math.min(920, Math.max(520, window.innerHeight - 46));
    document.documentElement.style.setProperty("--cover-h", h + "px");
  }
  lockCoverHeight();
  window.addEventListener("resize", lockCoverHeight);
  document.documentElement.style.setProperty("--backdrop-img", `url("${cover}")`);

  // Map
  $("#mapBtn").href = W.venue.mapUrl;
  if (W.venue.mapEmbed) {
    const f = $("#mapEmbed");
    f.src = W.venue.mapEmbed;
    f.hidden = false;
  }

  // Calendar (Monday-first, Vietnamese style)
  (function renderCalendar() {
    const cal = $("#calendar");
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((d) => {
      cal.insertAdjacentHTML("beforeend", `<div class="dow">${d}</div>`);
    });
    const y = date.getFullYear(), m = date.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < offset; i++) cal.insertAdjacentHTML("beforeend", `<div></div>`);
    for (let d = 1; d <= days; d++) {
      const isW = d === date.getDate();
      cal.insertAdjacentHTML(
        "beforeend",
        isW
          ? `<div class="d wedding"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>${d}</div>`
          : `<div class="d">${d}</div>`
      );
    }
  })();

  // Gallery + lightbox
  (function renderGallery() {
    const g = $("#gallery");
    W.photos.forEach((src, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Xem ảnh ${i + 1}`);
      const img = document.createElement("img");
      img.src = src;
      img.alt = `Ảnh cưới ${i + 1}`;
      img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", () => openLb(i));
      g.appendChild(b);
    });

    const lb = $("#lightbox"), lbImg = $("img", lb);
    let idx = 0;
    const show = (i) => { idx = (i + W.photos.length) % W.photos.length; lbImg.src = W.photos[idx]; };
    function openLb(i) { show(i); lb.hidden = false; }
    const close = () => (lb.hidden = true);
    $(".lb-close", lb).onclick = close;
    $(".lb-prev", lb).onclick = (e) => { e.stopPropagation(); show(idx - 1); };
    $(".lb-next", lb).onclick = (e) => { e.stopPropagation(); show(idx + 1); };
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    // Swipe on phones
    let x0 = null;
    lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  })();

  // Timeline
  $("#timeline").innerHTML = "";
  W.timeline.forEach(({ time, title }) => {
    const li = document.createElement("li");
    const t = document.createElement("time");
    t.textContent = time;
    const s = document.createElement("span");
    s.textContent = title;
    li.append(t, s);
    $("#timeline").appendChild(li);
  });

  // "Còn N ngày nữa" under the names on the cover (counts calendar days)
  (function coverCountdown() {
    const el = $("#coverCountdown");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(date); day.setHours(0, 0, 0, 0);
    const n = Math.round((day - today) / 86400000);
    if (n > 0) el.textContent = `Còn ${n} ngày nữa`;
    else if (n === 0) el.textContent = "Hôm nay là ngày cưới! 💕";
    else return;
    el.hidden = false;
  })();

  // Countdown
  (function countdown() {
    const els = Object.fromEntries($$("#countdown [data-unit]").map((e) => [e.dataset.unit, e]));
    function tick() {
      let s = Math.max(0, Math.floor((date - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60); s %= 60;
      els.d.textContent = pad(d); els.h.textContent = pad(h);
      els.m.textContent = pad(m); els.s.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  })();

  // Opening screen
  $("#openBtn").addEventListener("click", () => {
    $("#opening").classList.add("hide");
    document.body.classList.remove("locked");
    window.scrollTo(0, 0);
  });

  // Scroll reveal
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.15 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  // Shared toast helper
  window.showToast = function (msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2600);
  };
})();
