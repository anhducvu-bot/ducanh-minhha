/* Mini game "Rước Dâu" — a pixel runner on a Hà Nội street.
   Tap to jump (tap again in the air for a double jump), land on slimes to
   defeat them, collect hearts & lì xì, and reach the bride at the end. */
(function () {
  const W = window.WEDDING;
  const cfg = W.game === true ? { enabled: true } : W.game || {};
  const section = document.getElementById("mini-game");
  if (!cfg.enabled) { section.hidden = true; return; }

  const $ = (id) => document.getElementById(id);
  const overlay = $("game"), canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
  const msgEl = $("gameMsg"), resultEl = $("gameResult");
  const hud = { score: $("hudScore"), hearts: $("hudHearts"), lixi: $("hudLixi"), bar: $("hudBar"), groom: $("hudGroom") };

  // ---------- Tunables ----------
  const H = 150, GY = 128;          // logical height, ground (feet) line
  const PX = 28;                    // player's screen x while running
  const COURSE = 4800;              // distance to the bride's gate
  const SPEED0 = 82, SPEED1 = 132;  // px/s at start / end
  const GRAV = 800, JUMP = 285, JUMP2 = 235;
  const SEED = 20261128;            // fixed course: same for everyone
  const PTS = { slime: 100, heart: 20, lixi: 50, hit: -50, finish: 1000, perfect: 500 };

  // ---------- Palette & sprites ----------
  const PAL = {
    k: "#2b1a14", s: "#f5c9a3", p: "#f08f8f", h: "#21160f", e: "#21160f",
    n: "#2f4a86", N: "#1f3363", g: "#e8b84a", w: "#fff6e6",
    r: "#d23c3c", R: "#9e1f24", l: "#86d46a", L: "#4f9d45", W: "#ffffff",
    D: "#4a4a52", S: "#c9ccd4", t: "#e9cf8b", T: "#c9a85e",
  };
  const GROOM_TOP = [
    "...kkkkkk...",
    "..knnnnnnk..",
    "..kgggggggk.",
    "..khssssssk.",
    "..khssssesk.",
    "..khssssspk.",
    "...ksssssk..",
    "....kgggk...",
    "...knngnnk..",
    "..knnngnnsk.",
    "..knnngnnk..",
    "..knnnnnnk..",
    "..kNnnnnNk..",
  ];
  const LEGS = {
    a: ["...kwk.kwk..", "..kwk...kwk.", "..kk.....kk."],
    b: ["....kwwk....", "....kwwk....", "....kkkk...."],
    j: ["...kwwwwk...", "..kwk..kwk..", ".kk.....kk.."],
  };
  const BRIDE = [
    "...kkkkkk...",
    "..kgrggrgk..",
    ".kggggggggk.",
    ".khhhhhhhhk.",
    ".khsssssshk.",
    ".khsesseshk.",
    ".khpssssphk.",
    "..kssssssk..",
    "...kkggkk...",
    "..krrggrrk..",
    ".ksrrrrrrsk.",
    ".krrrggrrrk.",
    ".krrrrrrrrk.",
    ".kRrrrrrrRk.",
    "..krrwwrrk..",
    "..krwwwwrk..",
    "...kwwwwk...",
    "...kk..kk...",
  ];
  const SLIME = [
    "...kkkk...",
    ".kkllllkk.",
    "kllWWllllk",
    "klWllllllk",
    "kllellellk",
    "klpllllplk",
    "kLLllllLLk",
    ".kkkkkkkk.",
  ];
  const SLIME_SQUISH = [
    "..........",
    "...kkkk...",
    ".kkllllkk.",
    "kllWWllllk",
    "kllellellk",
    "klpllllplk",
    "kLLLLLLLLk",
    "kkkkkkkkkk",
  ];
  const HEART = [".kk.kk.", "kWrkrrk", "krrrrrk", ".krrrk.", "..krk..", "...k..."];
  const LIXI = ["kkkkkk", "kRRRRk", "krggrk", "krggrk", "krrrrk", "krrrrk", "kkkkkk"];
  const WHEEL = ["..kkkk..", ".kDDDDk.", "kDDkkDDk", "kDkSSkDk", "kDkSSkDk", "kDDkkDDk", ".kDDDDk.", "..kkkk.."];
  const BWHEEL = ["..kkkk..", ".k....k.", "k......k", "k..kk..k", "k..kk..k", "k......k", ".k....k.", "..kkkk.."];
  const NONLA = [".....kk.....", "....kttk....", "...kttttk...", "..kTttttTk..", ".kkkkkkkkkk."];
  const HY_HALF = ["..#..", "#####", "..#..", ".###.", ".....", ".###.", ".#.#.", ".###.", ".#.#.", "#####", ".###.", ".#.#.", ".###."];
  const HY = HY_HALF.map((r, i) => r + (i === 1 || i === 9 ? "#" : ".") + r);

  function makeSprite(rows, map) {
    const c = document.createElement("canvas");
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext("2d");
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = (map || PAL)[ch];
      if (ch !== "." && col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }));
    return c;
  }
  const SPR = {
    runA: makeSprite(GROOM_TOP.concat(LEGS.a)),
    runB: makeSprite(GROOM_TOP.concat(LEGS.b)),
    jump: makeSprite(GROOM_TOP.concat(LEGS.j)),
    bride: makeSprite(BRIDE),
    slime: makeSprite(SLIME),
    slime2: makeSprite(SLIME_SQUISH),
    heart: makeSprite(HEART),
    lixi: makeSprite(LIXI),
    wheel: makeSprite(WHEEL),
    bwheel: makeSprite(BWHEEL),
    nonla: makeSprite(NONLA),
    hy: makeSprite(HY, { "#": "#c8323a" }),
  };

  // 3×5 pixel font (only the glyphs we draw on the canvas)
  const FONT = {
    0: ["###", "#.#", "#.#", "#.#", "###"], 1: [".#.", "##.", ".#.", ".#.", "###"],
    2: ["###", "..#", "###", "#..", "###"], 3: ["###", "..#", ".##", "..#", "###"],
    4: ["#.#", "#.#", "###", "..#", "..#"], 5: ["###", "#..", "###", "..#", "###"],
    6: ["###", "#..", "###", "#.#", "###"], 7: ["###", "..#", "..#", ".#.", ".#."],
    8: ["###", "#.#", "###", "#.#", "###"], 9: ["###", "#.#", "###", "..#", "###"],
    "+": ["...", ".#.", "###", ".#.", "..."], "-": ["...", "...", "###", "...", "..."],
    P: ["##.", "#.#", "##.", "#..", "#.."], H: ["#.#", "#.#", "###", "#.#", "#.#"],
    O: [".#.", "#.#", "#.#", "#.#", ".#."], V: ["#.#", "#.#", "#.#", "#.#", ".#."],
    U: ["#.#", "#.#", "#.#", "#.#", "###"], Q: [".#.", "#.#", "#.#", "##.", ".##"],
    Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  };
  function drawText(str, x, y, color) {
    ctx.fillStyle = color;
    for (const ch of str) {
      if (ch === " ") { x += 3; continue; }
      const g = FONT[ch === "Ở" ? "O" : ch];
      if (g) g.forEach((row, ry) => { for (let rx = 0; rx < 3; rx++) if (row[rx] === "#") ctx.fillRect(x + rx, y + ry, 1, 1); });
      if (ch === "Ở") { // horn + dấu hỏi
        ctx.fillRect(x + 3, y - 1, 1, 2);
        ctx.fillRect(x, y - 4, 2, 1); ctx.fillRect(x + 1, y - 3, 1, 1); ctx.fillRect(x, y - 2, 1, 1);
      }
      x += 4;
    }
  }
  const textW = (s) => [...s].reduce((w, c) => w + (c === " " ? 3 : 4), 0) - 1;

  // ---------- Drawing helpers ----------
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  // Rect shapes with a 1px dark outline (all outlines first, then fills)
  function parts(ox, oy, list) {
    ctx.fillStyle = PAL.k;
    for (const p of list) ctx.fillRect(ox + p[0] - 1, oy + p[1] - 1, p[2] + 2, p[3] + 2);
    for (const p of list) { ctx.fillStyle = p[4]; ctx.fillRect(ox + p[0], oy + p[1], p[2], p[3]); }
  }
  function disc(cx, cy, r, c) {
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const hw = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
    }
  }

  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Obstacles ----------
  const SIZE = { slime: { w: 10, h: 8 }, bike: { w: 24, h: 14 }, pho: { w: 28, h: 17 }, flower: { w: 24, h: 22 } };
  const BIKE_COLORS = ["#d23c3c", "#3b7dd8", "#e58a2e", "#3fae8c"];

  function drawBike(x, e) {
    ctx.drawImage(SPR.wheel, x + 1, GY - 8);
    ctx.drawImage(SPR.wheel, x + 15, GY - 8);
    const c = e.color;
    parts(x, GY, [
      [4, -14, 1, 6, PAL.S],        // fork
      [6, -12, 3, 6, c],            // leg shield
      [8, -7, 7, 2, PAL.D],         // footboard
      [13, -11, 9, 5, c],           // rear body
      [12, -13, 10, 2, "#4a2f2a"],  // seat
      [2, -9, 6, 2, c],             // front fender
      [15, -9, 7, 1, c],            // rear fender
      [2, -16, 6, 1, PAL.D],        // handlebar
    ]);
    R(x + 1, GY - 15, 2, 2, "#ffd75a");  // headlight
    R(x + 22, GY - 10, 1, 2, "#ff7043"); // tail light
    ctx.drawImage(SPR.nonla, x + 11, GY - 18);
  }

  function drawPho(x, e, t) {
    ctx.drawImage(SPR.wheel, x + 3, GY - 8);
    ctx.drawImage(SPR.wheel, x + 18, GY - 8);
    parts(x, GY, [
      [1, -17, 26, 10, "#b8743f"],  // wooden cart
      [18, -22, 7, 4, PAL.S],       // phở pot
      [26, -19, 2, 1, "#6b4226"],   // push handle
    ]);
    R(x + 18, GY - 22, 7, 1, "#eef0f4");  // pot rim highlight
    R(x + 1, GY - 9, 26, 1, "#9a5d30");   // plank line
    R(x + 3, GY - 16, 14, 8, "#fff3d6");  // sign board
    drawText("PHỞ", x + 4, GY - 12, "#c8323a");
    // steam
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.2 + i / 3) % 1;
      R(x + 19 + i * 2 + Math.round(Math.sin((t + i) * 4)), GY - 24 - k * 9, 1, 1, `rgba(255,255,255,${0.9 - k * 0.8})`);
    }
  }

  // Flower bicycle (xe đạp bán hoa) — tall obstacle
  const FLOWER_DOTS = (() => {
    const r = rng(7), cols = ["#f48fb1", "#d23c3c", "#ffd75a", "#ffffff", "#b388eb", "#ff8a65"], out = [];
    for (let i = 0; i < 46; i++) {
      const dx = 9 + r() * 14, cx = 16, hw = 7.5;
      const maxH = 9 * Math.sqrt(Math.max(0, 1 - ((dx - cx) / hw) ** 2));
      out.push([Math.round(dx), -13 - Math.round(r() * maxH), cols[(r() * cols.length) | 0]]);
    }
    return out;
  })();
  function drawFlower(x) {
    ctx.drawImage(SPR.bwheel, x, GY - 8);
    ctx.drawImage(SPR.bwheel, x + 16, GY - 8);
    const F = "#2f6f73";
    R(x + 4, GY - 4, 16, 1, F);
    R(x + 5, GY - 11, 10, 1, F);
    for (let i = 0; i < 7; i++) R(x + 5 + i, GY - 11 + i, 1, 1, F);
    R(x + 4, GY - 15, 1, 11, F);
    R(x + 14, GY - 13, 1, 9, F);
    R(x + 2, GY - 16, 4, 1, PAL.k);
    // leafy mound + blossoms on the rear rack
    for (let dy = 0; dy <= 9; dy++) {
      const hw = Math.round(7.5 * Math.sqrt(1 - (dy / 9.6) ** 2));
      R(x + 16 - hw, GY - 13 - dy, hw * 2 + 1, 1, dy === 0 ? "#3d7d36" : "#4f9d45");
    }
    for (const [dx, dy, c] of FLOWER_DOTS) R(x + dx, GY + dy, 2, 2, c);
    // front basket
    parts(x, GY, [[0, -14, 5, 3, "#c9a25e"]]);
    R(x + 1, GY - 16, 1, 1, "#f48fb1"); R(x + 3, GY - 16, 1, 1, "#ffd75a");
  }

  const DRAW = { bike: drawBike, pho: drawPho, flower: drawFlower };

  // ---------- Background (generated once, deterministic) ----------
  const HOUSE_COLORS = [
    ["#f2c14e", "#d9a43a"], ["#f3e6cc", "#d8c7a6"], ["#a8d5ba", "#86b89a"],
    ["#f4b6b6", "#d99595"], ["#f6d7a7", "#dcb985"], ["#c9dbe8", "#a7bfd0"],
  ];
  const SIGN_COLORS = ["#c8323a", "#2f6f9e", "#3f8f5a", "#e0a030", "#8e44ad"];
  let houses = [], poles = [], skyline = [], clouds = [];
  function buildBackground() {
    const r = rng(SEED + 1);
    houses = []; poles = []; skyline = []; clouds = [];
    for (let x = -40; x < COURSE * 0.55 + 400;) {
      const w = 26 + Math.round(r() * 14), floors = 3 + Math.floor(r() * 3);
      const [color, shade] = HOUSE_COLORS[(r() * HOUSE_COLORS.length) | 0];
      houses.push({
        x, w, floors, color, shade,
        sign: SIGN_COLORS[(r() * SIGN_COLORS.length) | 0],
        tank: r() < 0.45, tree: r() < 0.18, plants: Math.floor(r() * 4),
      });
      x += w + Math.round(r() * 3);
    }
    for (let x = 60; x < COURSE * 0.55 + 400; x += 150 + Math.round(r() * 50)) poles.push(x);
    for (let x = -20; x < COURSE * 0.25 + 400;) {
      const pagoda = r() < 0.12, w = pagoda ? 22 : 12 + Math.round(r() * 22);
      skyline.push({ x, w, h: pagoda ? 34 : 14 + Math.round(r() * 30), pagoda });
      x += w + Math.round(r() * 6);
    }
    for (let i = 0; i < 6; i++) clouds.push({ x: r() * 400, y: 10 + r() * 30, w: 14 + Math.round(r() * 14) });
  }

  function drawSky(t) {
    const bands = ["#fbe9d0", "#fae2c6", "#f8dabc", "#f7d2b3", "#f5caa9"];
    const bh = Math.ceil((GY - 20) / bands.length);
    bands.forEach((c, i) => R(0, i * bh, VW, bh, c));
    R(0, bands.length * bh, VW, H, bands[bands.length - 1]);
    disc(Math.round(VW * 0.78), 26, 11, "#fff2d6");
    for (const c of clouds) {
      const x = Math.round(((c.x - cam * 0.08 - t * 2) % (VW + 60) + VW + 60) % (VW + 60)) - 40;
      R(x, c.y, c.w, 3, "#fff8ec"); R(x + 3, c.y - 2, c.w - 7, 2, "#fff8ec");
    }
  }

  function drawSkyline() {
    const off = cam * 0.25, base = GY - 30;
    for (const b of skyline) {
      const x = Math.round(b.x - off);
      if (x > VW || x + b.w < 0) continue;
      if (b.pagoda) { // tiered roof silhouette (chùa / tháp)
        R(x + 6, base - 14, 10, 14, "#ecc2a6");
        for (let i = 0; i < 3; i++) {
          const y = base - 14 - i * 7, w = 20 - i * 5, x0 = x + 11 - w / 2;
          R(x0, y - 2, w, 2, "#e3b597"); R(x0 - 1, y - 3, 1, 1, "#e3b597"); R(x0 + w, y - 3, 1, 1, "#e3b597");
          if (i < 2) R(x + 8 - i, y - 7, 6 - i * 2 + 1 + i, 5, "#ecc2a6");
        }
        R(x + 10, base - 38, 2, 4, "#e3b597");
      } else {
        R(x, base - b.h, b.w, b.h + 30, "#efcdb3");
      }
    }
  }

  function drawHouses() {
    const off = cam * 0.55;
    for (const hs of houses) {
      const x = Math.round(hs.x - off);
      if (x > VW + 2 || x + hs.w < -2) continue;
      const top = GY - 2 - hs.floors * 16 - 3;
      R(x, top, hs.w, GY - top, hs.color);
      R(x + hs.w - 2, top, 2, GY - top, hs.shade);
      R(x - 1, top, hs.w + 2, 2, hs.shade); // parapet
      if (hs.tank) { // inox water tank on the roof
        R(x + 4, top - 6, 8, 5, "#d7dbe2"); R(x + 4, top - 6, 8, 1, "#f2f4f7"); R(x + 5, top - 1, 1, 1, "#8a8f98"); R(x + 10, top - 1, 1, 1, "#8a8f98");
      }
      for (let f = 0; f < hs.floors; f++) {
        const fy = GY - 2 - (f + 1) * 16;
        if (f === 0) { // shop front with sign board
          R(x + 1, fy + 2, hs.w - 3, 4, hs.sign);
          for (let i = x + 3; i < x + hs.w - 4; i += 3) R(i, fy + 3, 2, 1, "#fff3d6");
          R(x + 2, fy + 7, hs.w - 5, 9, "#5a3b2e");
          R(x + 3, fy + 9, hs.w - 7, 6, "#f2b766");
          R(x + 4, fy + 11, 3, 4, "#c47a3a"); R(x + hs.w - 9, fy + 10, 3, 5, "#c47a3a");
        } else {
          const n = hs.w >= 34 ? 2 : 1, ww = 8, gap = (hs.w - 2 - n * ww) / (n + 1);
          for (let i = 0; i < n; i++) {
            const wx = Math.round(x + gap + i * (ww + gap));
            R(wx, fy + 3, ww, 9, "#3e7b5a");       // green shutters
            R(wx + 3, fy + 4, 2, 7, "#2d3b45");    // open window
            R(wx - 1, fy + 2, ww + 2, 1, hs.shade);
          }
          // balcony rail + potted plants
          R(x + 1, fy + 12, hs.w - 3, 1, "#4a3a32");
          for (let i = x + 2; i < x + hs.w - 2; i += 2) R(i, fy + 13, 1, 2, "#4a3a32");
          R(x + 1, fy + 15, hs.w - 3, 1, "#4a3a32");
          for (let i = 0; i < hs.plants; i++) R(x + 3 + i * 8, fy + 10, 3, 2, "#4f9d45");
        }
      }
      if (hs.tree) { // cây bàng in front
        R(x + hs.w - 6, GY - 22, 2, 20, "#7a5232");
        R(x + hs.w - 14, GY - 34, 18, 10, "#5fa850"); R(x + hs.w - 11, GY - 38, 12, 4, "#6fbb5e"); R(x + hs.w - 12, GY - 24, 14, 2, "#4f9d45");
      }
    }
  }

  function drawWires(t) {
    const off = cam * 0.55;
    for (let i = 0; i < poles.length - 1; i++) {
      const x1 = Math.round(poles[i] - off), x2 = Math.round(poles[i + 1] - off);
      if (x2 < 0 || x1 > VW) continue;
      const mid = (x1 + x2) / 2, half = (x2 - x1) / 2;
      for (let k = 0; k < 3; k++) {
        const y0 = GY - 92 + k * 4, sag = 5 + k * 2;
        for (let x = Math.max(0, x1); x < Math.min(VW, x2); x++) {
          const y = Math.round(y0 + sag * (1 - ((x - mid) / half) ** 2));
          R(x, y, 1, 1, "#3b3430");
          if (k === 2 && (x - x1) % 22 === 11) { // lanterns (đèn lồng)
            const sw = Math.round(Math.sin(t * 2 + x) * 0.6);
            const c = ((x - x1) / 22) % 2 < 1 ? "#d23c3c" : "#f0b23c";
            R(x - 1 + sw, y + 1, 3, 1, "#e8b84a"); R(x - 1 + sw, y + 2, 3, 3, c); R(x + sw, y + 5, 1, 2, "#e8b84a");
          }
        }
      }
    }
    for (const px of poles) {
      const x = Math.round(px - off);
      if (x < -6 || x > VW + 6) continue;
      R(x, GY - 96, 2, 94, "#5b5550");
      R(x - 4, GY - 93, 10, 1, "#5b5550");
      R(x - 3, GY - 88, 7, 3, "#2f2a27"); // tangled cables
    }
  }

  function drawGround() {
    R(0, GY - 2, VW, 10, "#e3cfb2");
    const o = Math.round(cam % 10);
    for (let x = -o; x < VW; x += 10) R(x, GY - 2, 1, 10, "#cdb595");
    R(0, GY + 3, VW, 1, "#cdb595");
    R(0, GY + 8, VW, 2, "#a39a92");
    R(0, GY + 10, VW, H - GY - 10, "#6f6a66");
    const o2 = Math.round(cam % 24);
    for (let x = -o2; x < VW; x += 24) R(x, GY + 15, 10, 1, "#d8d2c8");
  }

  // Bride's house + flower gate (cổng cưới "Vu Quy")
  function drawGate(gx, t) {
    parts(gx - 26, GY, [[0, -92, 66, 90, "#f2c14e"]]);
    R(gx - 27, GY - 95, 68, 3, "#d9a43a");
    for (let f = 1; f < 5; f++) {
      const fy = GY - 2 - (f + 1) * 16;
      [gx - 20, gx + 26].forEach((wx) => { R(wx, fy + 3, 8, 9, "#3e7b5a"); R(wx + 3, fy + 4, 2, 7, "#2d3b45"); });
      R(gx - 25, fy + 12, 64, 1, "#4a3a32");
    }
    for (let i = 0; i < 5; i++) { // lanterns on the house
      const lx = gx - 18 + i * 13, sw = Math.round(Math.sin(t * 2 + i));
      R(lx + sw, GY - 70, 4, 1, "#e8b84a"); R(lx + sw, GY - 69, 4, 4, "#d23c3c"); R(lx + 1 + sw, GY - 65, 2, 2, "#e8b84a");
    }
    // pillars wrapped in flowers
    parts(gx, GY, [[-14, -52, 6, 52, "#f6e7cf"], [22, -52, 6, 52, "#f6e7cf"]]);
    const fc = ["#f48fb1", "#ffffff", "#d23c3c", "#ffd75a"];
    for (let y = 0; y < 52; y += 3) for (const px of [-14, 22]) {
      R(gx + px + ((y / 3) % 2 ? 1 : 3), GY - 52 + y, 2, 2, fc[(y / 3) % 4]);
      R(gx + px + ((y / 3) % 2 ? 4 : 0), GY - 51 + y, 1, 1, "#4f9d45");
    }
    // banner + 囍
    parts(gx, GY, [[-18, -64, 46, 12, "#c8323a"]]);
    R(gx - 18, GY - 64, 46, 1, "#e8b84a"); R(gx - 18, GY - 53, 46, 1, "#e8b84a");
    const label = "VU QUY";
    drawText(label, gx + 5 - Math.floor(textW(label) / 2), GY - 60, "#ffd75a");
    disc(gx + 5, GY - 76, 10, "#e8b84a");
    disc(gx + 5, GY - 76, 9, "#fff3d6");
    ctx.drawImage(SPR.hy, gx, GY - 82);
  }

  // ---------- Game state ----------
  let VW = 195;
  let state = "closed", t = 0, cam = 0, camStop = 0, last = 0, raf = 0;
  let pl, ents, fx, popups, stats, invuln, speedMul, jumpBuffer, walkX, celebT, runTime, nextFirework, hopT;

  const speedAt = (prog) => SPEED0 + (SPEED1 - SPEED0) * prog;

  function buildCourse() {
    const r = rng(SEED), list = [];
    let x = 230;
    while (x < COURSE - 300) {
      const prog = x / COURSE, k = r();
      const type = k < 0.34 ? "slime" : k < 0.58 ? "bike" : k < 0.8 ? "pho" : prog > 0.3 ? "flower" : "bike";
      const o = { type, x, w: SIZE[type].w, h: SIZE[type].h, color: BIKE_COLORS[(r() * 4) | 0], phase: r() * 6 };
      list.push(o);
      let w = o.w;
      if (type === "slime" && prog > 0.25 && r() < 0.4) {
        list.push({ ...o, x: x + 20, phase: o.phase + 1.5 });
        w += 20;
      }
      if (type !== "slime" && r() < 0.5) { // arc of hearts rewards a clean jump
        [[-10, 34], [w / 2 - 3, 54], [w + 4, 34]].forEach(([dx, dy]) => list.push({ type: "heart", x: x + dx, y: GY - dy }));
      }
      const gap = (100 + r() * 90) * (speedAt(prog) / SPEED0);
      const k2 = r();
      if (k2 < 0.22) list.push({ type: "lixi", x: x + w + gap * 0.5 - 3, y: GY - 46 });
      else if (k2 < 0.5) for (let i = 0; i < 3; i++) list.push({ type: "heart", x: x + w + gap * 0.3 + i * 12, y: GY - 14 });
      x += w + gap;
    }
    return list.sort((a, b) => a.x - b.x);
  }

  function reset() {
    cam = 0; t = 0; runTime = 0;
    pl = { y: GY, vy: 0, onGround: true, jumps: 0 };
    ents = buildCourse();
    fx = []; popups = [];
    stats = { slimes: 0, hearts: 0, lixi: 0, hits: 0 };
    invuln = 0; speedMul = 1; jumpBuffer = 0; walkX = PX; celebT = 0; nextFirework = 0; hopT = 0;
    updateHud();
  }

  const liveScore = () => stats.slimes * PTS.slime + stats.hearts * PTS.heart + stats.lixi * PTS.lixi + stats.hits * PTS.hit;

  function updateHud() {
    hud.score.textContent = Math.max(0, liveScore());
    hud.hearts.textContent = stats.hearts;
    hud.lixi.textContent = stats.lixi;
    const prog = Math.min(1, Math.max(0, (cam + PX) / (COURSE - VW * 0.6 + 7 + PX)));
    hud.bar.style.width = prog * 100 + "%";
    hud.groom.style.left = prog * 100 + "%";
  }

  function jump() {
    if (pl.onGround) { pl.vy = -JUMP; pl.onGround = false; pl.jumps = 1; }
    else if (pl.jumps < 2) {
      pl.vy = -JUMP2; pl.jumps = 2;
      for (let i = 0; i < 5; i++) fx.push({ x: cam + playerX() + 6, y: pl.y, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 20, life: 0.35, c: "#ffffff" });
    } else jumpBuffer = 0.12;
  }

  function playerX() { return state === "run" ? PX : walkX; }

  function popup(x, y, text, color) { popups.push({ x, y, text, color, life: 0.9 }); }

  function burst(x, y, colors, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, s = speed * (0.6 + Math.random() * 0.5);
      fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, c: colors[i % colors.length], g: 60 });
    }
  }

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function update(dt) {
    t += dt;
    if (state === "paused" || state === "idle") return;
    if (state === "run") runTime += dt;

    if (state === "run") {
      const prog = Math.min(1, (cam + PX) / COURSE);
      speedMul = Math.min(1, speedMul + dt * 0.8);
      cam += speedAt(prog) * speedMul * dt;
      camStop = COURSE + 7 - VW * 0.6;
      if (cam >= camStop) { cam = camStop; state = "arrive"; walkX = PX; }
    } else if (state === "arrive") {
      walkX += 50 * dt;
      const target = COURSE - 5 - cam;
      if (walkX >= target && pl.onGround) { walkX = target; state = "celebrate"; celebT = 0; }
    } else if (state === "celebrate" || state === "done") {
      celebT += dt;
      hopT += dt;
      const cx = cam + walkX + 12;
      if (celebT < 2.6 && Math.random() < dt * 9) fx.push({ x: cx + (Math.random() - 0.5) * 10, y: GY - 18, vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 20, life: 1.4, heart: true });
      if (t > nextFirework) {
        nextFirework = t + (state === "done" ? 0.9 : 0.35);
        burst(cam + 20 + Math.random() * (VW - 40), 20 + Math.random() * 35, ["#ffd75a", "#ff8a65", "#f48fb1", "#ffffff", "#d23c3c"], 18, 45);
      }
      if (state === "celebrate" && celebT > 2.8) showResult();
    }

    // vertical physics
    const prevFeet = pl.y;
    if (state !== "celebrate" && state !== "done") {
      if (jumpBuffer > 0) jumpBuffer -= dt;
      if (!pl.onGround) {
        pl.vy += GRAV * dt;
        pl.y += pl.vy * dt;
        if (pl.y >= GY) {
          pl.y = GY; pl.vy = 0; pl.onGround = true; pl.jumps = 0;
          if (jumpBuffer > 0) { jumpBuffer = 0; jump(); }
        }
      }
    }
    if (invuln > 0) invuln -= dt;

    // collisions
    if (state === "run" || state === "arrive") {
      const px = cam + playerX();
      const box = { x: px + 3, y: pl.y - 13, w: 7, h: 13 };
      for (const e of ents) {
        if (e.done || e.x > px + 40) { if (e.x > px + 40) break; continue; }
        if (e.x + 30 < px) continue;
        if (e.type === "heart" || e.type === "lixi") {
          const ib = e.type === "heart" ? { x: e.x, y: e.y, w: 7, h: 6 } : { x: e.x, y: e.y, w: 6, h: 7 };
          if (hit(box, ib)) {
            e.done = true;
            if (e.type === "heart") { stats.hearts++; popup(e.x, e.y, "+" + PTS.heart, "#ffd75a"); }
            else { stats.lixi++; popup(e.x, e.y, "+" + PTS.lixi, "#ffd75a"); burst(e.x + 3, e.y + 3, ["#ffd75a", "#d23c3c"], 8, 30); }
          }
        } else if (e.type === "slime") {
          const hop = slimeHop(e);
          const sb = { x: e.x + 1, y: GY - 7 - hop, w: 8, h: 7 };
          if (hit(box, sb)) {
            if (pl.vy > 0 && prevFeet <= sb.y + 4) { // stomp!
              e.done = true; stats.slimes++;
              pl.vy = -210; pl.onGround = false; pl.jumps = 1;
              popup(e.x, sb.y - 4, "+" + PTS.slime, "#ffd75a");
              burst(e.x + 5, sb.y + 4, ["#86d46a", "#4f9d45", "#ffffff"], 12, 50);
            } else if (invuln <= 0) takeHit(e);
          }
        } else if (!e.hitOnce && invuln <= 0) {
          if (hit(box, { x: e.x + 2, y: GY - e.h + 1, w: e.w - 4, h: e.h - 1 })) takeHit(e);
        }
      }
    }

    // particles & popups
    for (const p of fx) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.g) p.vy += p.g * dt;
    }
    fx = fx.filter((p) => p.life > 0);
    for (const p of popups) { p.life -= dt; p.y -= 18 * dt; }
    popups = popups.filter((p) => p.life > 0);
  }

  function slimeHop(e) { return Math.max(0, Math.sin(t * 4 + e.phase)) * 4; }

  function takeHit(e) {
    e.hitOnce = true;
    stats.hits++;
    invuln = 1.2;
    speedMul = 0.45;
    popup(cam + playerX(), pl.y - 22, String(PTS.hit), "#ff5a5a");
    burst(cam + playerX() + 6, pl.y - 8, ["#ffffff", "#ffd75a"], 8, 35);
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
  }

  // ---------- Render ----------
  function render() {
    ctx.imageSmoothingEnabled = false;
    drawSky(t);
    drawSkyline();
    drawHouses();
    drawWires(t);
    drawGround();
    const gx = Math.round(COURSE - cam);
    if (gx < VW + 60) drawGate(gx, t);

    for (const e of ents) {
      const x = Math.round(e.x - cam);
      if (x > VW + 4) break;
      if (x < -32 || e.done) continue;
      if (e.type === "heart") ctx.drawImage(SPR.heart, x, Math.round(e.y + Math.sin(t * 4 + e.x) * 1));
      else if (e.type === "lixi") ctx.drawImage(SPR.lixi, x, Math.round(e.y + Math.sin(t * 3 + e.x) * 1.5));
      else if (e.type === "slime") {
        const hop = slimeHop(e);
        ctx.drawImage(hop > 0.5 ? SPR.slime : SPR.slime2, x, Math.round(GY - 8 - hop));
      } else DRAW[e.type](x, e, t);
    }

    // bride waits at the gate
    if (gx < VW + 60) {
      const bh = state === "celebrate" || state === "done" ? Math.round(-Math.abs(Math.sin(hopT * 7)) * 3) : 0;
      ctx.drawImage(SPR.bride, gx + 8, GY - 18 + bh);
    }

    // groom
    const px = Math.round(playerX());
    let spr;
    if (!pl.onGround) spr = SPR.jump;
    else if (state === "idle" || state === "paused" || state === "celebrate" || state === "done") spr = SPR.runB;
    else spr = Math.floor(t * 10) % 2 ? SPR.runA : SPR.runB;
    const gh = state === "celebrate" || state === "done" ? Math.round(-Math.abs(Math.sin(hopT * 7 + 1)) * 3) : 0;
    if (!(invuln > 0 && Math.floor(t * 16) % 2)) ctx.drawImage(spr, px, Math.round(pl.y - 16 + gh));

    // big heart above the couple
    if (state === "celebrate" || state === "done") {
      const s = Math.min(1, celebT * 3);
      if (s > 0.3) {
        ctx.save();
        ctx.translate(px + 16, GY - 34);
        ctx.scale(2 * s, 2 * s);
        ctx.drawImage(SPR.heart, -3.5, -3);
        ctx.restore();
      }
    }

    for (const p of fx) {
      const x = Math.round(p.x - cam), y = Math.round(p.y);
      if (p.heart) { ctx.globalAlpha = Math.min(1, p.life); ctx.drawImage(SPR.heart, x, y); ctx.globalAlpha = 1; }
      else R(x, y, 1, 1, p.c);
    }
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      drawText(p.text, Math.round(p.x - cam), Math.round(p.y), p.color);
      ctx.globalAlpha = 1;
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    render();
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  // ---------- Layout ----------
  function fit() {
    const aw = Math.min(window.innerWidth, 760);
    const ah = Math.max(150, window.innerHeight - 170);
    let s = Math.min(aw / 180, ah / H, 3);
    if (s >= 2) s = Math.floor(s);
    VW = Math.max(180, Math.min(300, Math.floor(aw / s)));
    canvas.width = VW; canvas.height = H;
    canvas.style.width = VW * s + "px";
    canvas.style.height = H * s + "px";
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- Open / close / input ----------
  function setMsg(html) { msgEl.innerHTML = html; msgEl.hidden = !html; }

  function openGame() {
    overlay.hidden = false;
    document.body.classList.add("game-open");
    resultEl.hidden = true;
    fit();
    reset();
    state = "idle";
    setMsg('<b>Chạm để bắt đầu</b><span>Chạm để nhảy · chạm lần nữa trên không để nhảy cao hơn<br>Nhảy lên đầu slime để hạ gục chúng!</span>');
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function closeGame() {
    overlay.hidden = true;
    document.body.classList.remove("game-open");
    cancelAnimationFrame(raf);
    state = "closed";
    refreshMini();
  }

  function onTap() {
    if (state === "idle") { state = "run"; setMsg(""); return; }
    if (state === "paused") { state = "run"; setMsg(""); last = performance.now(); return; }
    if (state === "run" || state === "arrive") jump();
  }

  overlay.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".game-result, .game-close")) return;
    e.preventDefault();
    onTap();
  });
  overlay.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden || e.target.closest("input")) return;
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); if (!e.repeat) onTap(); }
    if (e.key === "Escape") closeGame();
  });
  $("gameClose").addEventListener("click", closeGame);
  $("playBtn").addEventListener("click", openGame);
  window.addEventListener("resize", () => { if (!overlay.hidden) fit(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "run") { state = "paused"; setMsg("<b>Tạm dừng</b><span>Chạm để chơi tiếp</span>"); }
  });

  // ---------- Results ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  function finalScore() {
    return Math.max(0, liveScore() + PTS.finish + (stats.hits === 0 ? PTS.perfect : 0));
  }

  function showResult() {
    state = "done";
    const score = finalScore();
    const prevBest = Number(store.get("ruocdau_best")) || 0;
    const isBest = score > prevBest;
    if (isBest) store.set("ruocdau_best", score);
    const rows = [
      [`Slime hạ gục × ${stats.slimes}`, stats.slimes * PTS.slime],
      [`Tim × ${stats.hearts}`, stats.hearts * PTS.heart],
      [`Lì xì × ${stats.lixi}`, stats.lixi * PTS.lixi],
      [`Vấp ngã × ${stats.hits}`, stats.hits * PTS.hit],
      ["Rước được cô dâu", PTS.finish],
    ];
    if (stats.hits === 0) rows.push(["Không vấp lần nào!", PTS.perfect]);

    resultEl.innerHTML = `
      <div class="gr-card">
        <p class="gr-title">Rước dâu thành công!</p>
        <p class="gr-sub">${esc(W.groom.name)} đã rước được ${esc(W.bride.name)} 💕</p>
        <p class="gr-score">${score}</p>
        <p class="gr-best">${isBest ? "Kỷ lục mới của bạn!" : "Kỷ lục của bạn: " + prevBest}</p>
        <ul class="gr-break">${rows.map(([l, v]) => `<li><span>${esc(l)}</span><b>${v > 0 ? "+" : ""}${v}</b></li>`).join("")}</ul>
        <div class="gr-actions">
          <button class="gbtn gbtn-gold" id="grAgain" type="button">Chơi lại</button>
          <button class="gbtn" id="grBack" type="button">Về thiệp</button>
        </div>
        <p class="gr-date">Hẹn gặp bạn ngày ${esc(dateText())} tại ${esc(W.venue.name)}</p>
      </div>`;
    resultEl.hidden = false;
    resultEl.scrollTop = 0;

    $("grAgain").onclick = () => { resultEl.hidden = true; reset(); state = "idle"; setMsg("<b>Chạm để bắt đầu</b>"); };
    $("grBack").onclick = closeGame;
  }

  function dateText() {
    const d = new Date(W.date), p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  // ---------- Invitation card: preview + personal best ----------
  const mini = $("lbMini");
  function refreshMini() {
    const best = Number(store.get("ruocdau_best")) || 0;
    mini.innerHTML = best ? `<p class="lb-best">Kỷ lục của bạn: <b>${best}</b></p>` : "";
  }

  const pv = $("gamePreview"), pctx = pv.getContext("2d");
  let pvFrame = 0, pvTimer = 0;
  function drawPreview() {
    pvFrame++;
    const w = pv.width, h = pv.height, g = h - 6;
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = "#f8dabc"; pctx.fillRect(0, 0, w, h);
    pctx.fillStyle = "#f2c14e"; pctx.fillRect(4, 6, 18, g - 6);
    pctx.fillStyle = "#a8d5ba"; pctx.fillRect(24, 12, 16, g - 12);
    pctx.fillStyle = "#f4b6b6"; pctx.fillRect(42, 4, 20, g - 4);
    pctx.fillStyle = "#3e7b5a";
    [[8, 10], [8, 20], [28, 16], [28, 26], [47, 9], [47, 19]].forEach(([x, y]) => pctx.fillRect(x, y, 6, 5));
    pctx.fillStyle = "#e3cfb2"; pctx.fillRect(0, g, w, 6);
    pctx.fillStyle = "#cdb595"; pctx.fillRect(0, g, w, 1);
    const jumpY = [0, 3, 6, 8, 9, 8, 6, 3][pvFrame % 16] || 0;
    pctx.drawImage(pvFrame % 2 ? SPR.runA : SPR.runB, 8, g - 16 - jumpY);
    pctx.drawImage(pvFrame % 4 < 2 ? SPR.slime : SPR.slime2, 30, g - 8);
    pctx.drawImage(SPR.heart, 30, g - 22 + (pvFrame % 4 < 2 ? 0 : 1));
    pctx.drawImage(SPR.bride, w - 16, g - 18);
  }
  new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      clearInterval(pvTimer);
      if (en.isIntersecting) { drawPreview(); pvTimer = setInterval(drawPreview, 140); refreshMini(); }
    });
  }).observe(pv);

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelector(".game-hint").textContent = "Nhấn Space hoặc click để nhảy";
  }
  hud.groom.style.backgroundImage = `url(${SPR.runB.toDataURL()})`;
  buildBackground();
  drawPreview();

  if (/[?&]debug\b/.test(location.search)) window.__ruocDau = { get state() { return state; }, get stats() { return stats; }, get cam() { return cam; }, get pl() { return pl; }, get ents() { return ents; }, tap: onTap, open: openGame };
})();
