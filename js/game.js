/* Mini game "Rước Dâu" — a pixel wedding procession through Hà Nội.
   Phố cổ → Hồ Gươm → Phố đường tàu → the bride's "Vu Quy" gate.
   Tap to jump (tap again in the air for a double jump). Land on slimes to
   defeat them, collect the 5 lễ vật of the mâm quả, pick up groomsmen,
   and save lì xì for the cousins guarding the gate. */
(function () {
  const W = window.WEDDING;
  const cfg = W.game === true ? { enabled: true } : W.game || {};
  const section = document.getElementById("mini-game");
  if (!cfg.enabled) { section.hidden = true; return; }

  const $ = (id) => document.getElementById(id);
  const overlay = $("game"), canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
  const msgEl = $("gameMsg"), resultEl = $("gameResult"), bubbleLayer = $("gameBubbles");
  const hud = {
    score: $("hudScore"), hearts: $("hudHearts"), lixi: $("hudLixi"), bar: $("hudBar"),
    groom: $("hudGroom"), tray: $("hudTray"),
  };

  // ---------- Tunables ----------
  const H = 150, GY = 128;          // logical height, ground (feet) line
  const PX = 52;                    // groom's screen x while running (room for the procession behind)
  const COURSE = 5700;              // distance to the bride's gate
  const ZONES = [
    { id: 0, name: "Phố cổ", start: 0 },
    { id: 1, name: "Hồ Gươm", start: 2000 },
    { id: 2, name: "Phố đường tàu", start: 3800 },
  ];
  const SPEED0 = 82, SPEED1 = 132;  // px/s at start / end
  const GRAV = 800, JUMP = 285, JUMP2 = 235;
  const MID = 0.55, FAR = 0.25;     // parallax factors
  const SEED = 20261128;            // fixed course: same for everyone
  const LIXI_NEEDED = 3;            // lì xì the cousins ask for at the gate
  const TRAIN_X = 4250;             // where the train rushes past on Phố đường tàu
  const MAX_FRIENDS = 5;
  const PTS = {
    slime: 100, heart: 20, lixi: 50, item: 100, fullSet: 500, friend: 50, hit: -50,
    finish: 1000, perfect: 500, gateLixi: 200, gateFlatter: 100,
  };


  // ---------- Palette & sprites ----------
  const PAL = {
    k: "#2b1a14", s: "#f5c9a3", p: "#f08f8f", h: "#21160f", e: "#21160f",
    n: "#2f4a86", N: "#1f3363", g: "#e8b84a", w: "#fff6e6",
    r: "#d23c3c", R: "#9e1f24", l: "#86d46a", L: "#4f9d45", W: "#ffffff",
    D: "#4a4a52", S: "#c9ccd4", t: "#e9cf8b", T: "#c9a85e",
    v: "#26272f", q: "#f4a6c0", Q: "#d97a9c", G: "#00b14f", y: "#ffd75a",
    f: "#7cc46a", F: "#3f8f3a", b: "#7a4a2a", B: "#4a2c18", o: "#f29b38",
    m: "#8e6bb8", M: "#5f4589", x: "#8fa0ad", u: "#5a8fd6", U: "#35588f", z: "#fff3c4",
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
  // Groomsman of the đoàn nhà trai, carrying a mâm quả under red cloth
  const FRIEND_TOP = [
    "...kkkkkk...",
    "..khhhhhhk..",
    "..khhhhhhhk.",
    "..khssssssk.",
    "..khssssesk.",
    "..khssssspk.",
    "...ksssssk..",
    "....kkkkkk..",
    "...krrgrrrk.",
    "..krrrrrrrrk",
    "..kgggggggk.",
    "..kvvvvvvk..",
    "..kvvwvvvk..",
  ];
  const FRIEND_LEGS = {
    a: ["...kvk.kvk..", "..kvk...kvk.", "..kk.....kk."],
    b: ["....kvvk....", "....kvvk....", "....kkkk...."],
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
  // The bride's cousins guarding the gate (pink áo dài)
  const COUSIN = [
    "....kkkk....",
    "...khhhhk...",
    "..khhhhhhk..",
    ".khhhhhhhhk.",
    ".khsssssshk.",
    ".khsesseshk.",
    ".khpssssphk.",
    "..kssssssk..",
    "...kkqqkk...",
    "..kqqqqqqk..",
    ".ksqqqqqqsk.",
    ".kqqqqqqqqk.",
    ".kQqqqqqqQk.",
    "..kqqwwqqk..",
    "..kqwwwwqk..",
    "...kwwwwk...",
    "...kk..kk...",
  ];
  const COUSIN_BLOCK = COUSIN.map((r, i) => (i === 9 ? "kssqqqqqqssk" : i === 10 ? ".kkqqqqqqkk." : r));
  // Cô bán trà đá with nón lá and áo bà ba
  const AUNTIE = [
    ".....kk.....",
    "....kttk....",
    "...kttttk...",
    "..kTttttTk..",
    ".kkkkkkkkkk.",
    "..khssssshk.",
    "..ksessesk..",
    "..kpsssspk..",
    "...kssssk...",
    "..kmmmmmmk..",
    ".ksmmmmmmsk.",
    ".kmmmmmmmmk.",
    "..kmmmmmmk..",
    "..kMMMMMMk..",
    "..kMMkkMMk..",
    "..kMMk.kMMk.",
    "..kkk...kkk.",
  ];
  // Friend in a t-shirt cheering with a sign
  const FAN = FRIEND_TOP.slice(0, 7).concat([
    "...kkuukk...",
    "..kuuuuuuk..",
    "..kuuuuuusk.",
    "..kuuuuuuk..",
    "..kUUUUUUk..",
    "..kUUkkUUk..",
    "..kUUk.kUUk.",
    "..kkk...kkk.",
  ]);
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
  const HOASUA = [".w.w.w.", "wzwzwzw", ".wwwww.", "..fFf..", "...F..."];
  const LIXI = ["kkkkkk", "kRRRRk", "krggrk", "krggrk", "krrrrk", "krrrrk", "kkkkkk"];
  const WHEEL = ["..kkkk..", ".kDDDDk.", "kDDkkDDk", "kDkSSkDk", "kDkSSkDk", "kDDkkDDk", ".kDDDDk.", "..kkkk.."];
  const BWHEEL = ["..kkkk..", ".k....k.", "k......k", "k..kk..k", "k..kk..k", "k......k", ".k....k.", "..kkkk.."];
  const NONLA = [".....kk.....", "....kttk....", "...kttttk...", "..kTttttTk..", ".kkkkkkkkkk."];
  const HELMET = ["..kkkk..", ".kGGGGk.", "kGGWGGGk", "kGGGGGGk", "kkkkkkkk"];
  const ITEMS = {
    traucau: { name: "Trầu cau", rows: ["...ff...", "..fFFf..", ".fFffFf.", "fFffffFf", ".fFffFf.", "..kbbk..", ".kbBBbk.", "..kkkk.."] },
    banhcom: { name: "Bánh cốm", rows: ["kkkkkkkk", "kffrrffk", "kffrrffk", "krrrrrrk", "krrrrrrk", "kffrrffk", "kffrrffk", "kkkkkkkk"] },
    ruou: { name: "Rượu", rows: ["...kk...", "..kxxk..", "..kxxk..", ".kxxxxk.", ".krggrk.", ".krrrrk.", ".kxxxxk.", "..kkkk.."] },
    che: { name: "Chè", rows: ["..kkkk..", ".kggggk.", "kffffffk", "kfgffgfk", "kffffffk", "kfgffgfk", "kffffffk", "kkkkkkkk"] },
    hoaqua: { name: "Hoa quả", rows: ["...kk...", "..kffk..", ".kookook", "koookmmk", "kooommmk", "krrrrrrk", ".kgggggk", "..kkkkk."] },
  };
  const ITEM_ORDER = ["traucau", "banhcom", "ruou", "che", "hoaqua"];
  const HY_HALF = ["..#..", "#####", "..#..", ".###.", ".....", ".###.", ".#.#.", ".###.", ".#.#.", "#####", ".###.", ".#.#.", ".###."];
  const HY = HY_HALF.map((r, i) => r + (i === 1 || i === 9 ? "#" : ".") + r);

  function makeSprite(rows, map) {
    const pal = Object.assign({}, PAL, map || {});
    const c = document.createElement("canvas");
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext("2d");
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (ch !== "." && col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }));
    return c;
  }
  const SLIME_KINDS = {
    ketxe: { label: "Kẹt xe!", map: { l: "#f07a5f", L: "#b8463a" } },
    muaphun: { label: "Mưa phùn!", map: { l: "#a9c1d6", L: "#7290ab" } },
    manom: { label: "Ma Nồm!", map: { l: "#dff3f6", L: "#a9d2db" } },
  };
  const SPR = {
    runA: makeSprite(GROOM_TOP.concat(LEGS.a)),
    runB: makeSprite(GROOM_TOP.concat(LEGS.b)),
    jump: makeSprite(GROOM_TOP.concat(LEGS.j)),
    groomTop: makeSprite(GROOM_TOP),
    friendA: makeSprite(FRIEND_TOP.concat(FRIEND_LEGS.a)),
    friendB: makeSprite(FRIEND_TOP.concat(FRIEND_LEGS.b)),
    bride: makeSprite(BRIDE),
    cousin: makeSprite(COUSIN),
    cousinBlock: makeSprite(COUSIN_BLOCK),
    auntie: makeSprite(AUNTIE),
    fan: makeSprite(FAN),
    slimes: Object.fromEntries(Object.entries(SLIME_KINDS).map(([k, v]) => [k, { a: makeSprite(SLIME, v.map), b: makeSprite(SLIME_SQUISH, v.map) }])),
    heart: makeSprite(HEART),
    hoasua: makeSprite(HOASUA),
    lixi: makeSprite(LIXI),
    wheel: makeSprite(WHEEL),
    bwheel: makeSprite(BWHEEL),
    nonla: makeSprite(NONLA),
    helmet: makeSprite(HELMET),
    items: Object.fromEntries(ITEM_ORDER.map((k) => [k, makeSprite(ITEMS[k].rows)])),
    hy: makeSprite(HY, { "#": "#c8323a" }),
  };

  // 3×5 pixel font for the numbers and the few signs drawn on the canvas
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
  function flipped(x, w, draw) { // draw something mirrored (facing right)
    ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); draw(0); ctx.restore();
  }
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
  }
  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const zoneAt = (x) => (x >= ZONES[2].start ? ZONES[2] : x >= ZONES[1].start ? ZONES[1] : ZONES[0]);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ---------- Obstacles ----------
  const SIZE = {
    slime: { w: 10, h: 8 }, bike: { w: 24, h: 14 }, pho: { w: 28, h: 17 }, flower: { w: 24, h: 22 },
    stools: { w: 34, h: 11 }, xichlo: { w: 30, h: 22 }, ganh: { w: 28, h: 12 }, barrier: { w: 22, h: 13 }, puddle: { w: 26, h: 3 },
  };
  const BIKE_LOAD_H = { nonla: 14, fridge: 27, chicken: 25, dao: 30 };
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
    const load = e.load || "nonla";
    if (load === "nonla") ctx.drawImage(SPR.nonla, x + 11, GY - 18);
    else if (load === "fridge") { // a whole fridge strapped on the back
      parts(x, GY, [[12, -27, 10, 13, "#eef1f4"]]);
      R(x + 13, GY - 21, 8, 1, "#c9ced6"); R(x + 20, GY - 25, 1, 3, "#9aa3ad"); R(x + 20, GY - 19, 1, 3, "#9aa3ad");
      R(x + 11, GY - 16, 12, 1, "#7a5232");
    } else if (load === "chicken") { // stacked chicken cages
      for (let i = 0; i < 3; i++) {
        const cy = GY - 17 - i * 5;
        parts(x, 0, [[11, cy, 12, 4, "#d9b77a"]]);
        for (let b = 0; b < 12; b += 3) R(x + 11 + b, cy, 1, 4, "#a8823f");
        R(x + 13 + i * 3, cy + 1, 2, 2, "#ffffff"); R(x + 15 + i * 3, cy, 1, 1, "#d23c3c");
        R(x + 19 - i, cy + 1, 2, 2, i === 1 ? "#f29b38" : "#ffffff");
      }
    } else if (load === "dao") { // a peach-blossom tree going home for Tết
      parts(x, GY, [[13, -16, 8, 4, "#b5562f"]]);
      R(x + 16, GY - 25, 2, 9, "#6b4226"); R(x + 12, GY - 24, 4, 1, "#6b4226"); R(x + 18, GY - 27, 4, 1, "#6b4226");
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4, rr = 3 + (i % 4) * 1.6;
        R(x + 17 + Math.cos(a) * rr * 2.1, GY - 25 + Math.sin(a) * rr, 2, 2, ["#f6a5c0", "#f48fb1", "#ffffff", "#f06292"][i % 4]);
      }
    }
  }

  function drawPho(x, e, t) {
    ctx.drawImage(SPR.wheel, x + 3, GY - 8);
    ctx.drawImage(SPR.wheel, x + 18, GY - 8);
    parts(x, GY, [
      [1, -17, 26, 10, "#b8743f"],  // wooden cart
      [18, -22, 7, 4, PAL.S],       // phở pot
      [26, -19, 2, 1, "#6b4226"],   // push handle
    ]);
    R(x + 18, GY - 22, 7, 1, "#eef0f4");
    R(x + 1, GY - 9, 26, 1, "#9a5d30");
    R(x + 3, GY - 16, 14, 8, "#fff3d6");
    drawText("PHỞ", x + 4, GY - 12, "#c8323a");
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.2 + i / 3) % 1;
      R(x + 19 + i * 2 + Math.round(Math.sin((t + i) * 4)), GY - 24 - k * 9, 1, 1, `rgba(255,255,255,${0.9 - k * 0.8})`);
    }
  }

  const FLOWER_DOTS = (() => {
    const r = rng(7), cols = ["#f48fb1", "#d23c3c", "#ffd75a", "#ffffff", "#b388eb", "#ff8a65"], out = [];
    for (let i = 0; i < 46; i++) {
      const dx = 9 + r() * 14, maxH = 9 * Math.sqrt(Math.max(0, 1 - ((dx - 16) / 7.5) ** 2));
      out.push([Math.round(dx), -13 - Math.round(r() * maxH), cols[(r() * cols.length) | 0]]);
    }
    return out;
  })();
  function drawFlower(x) { // xe đạp bán hoa
    ctx.drawImage(SPR.bwheel, x, GY - 8);
    ctx.drawImage(SPR.bwheel, x + 16, GY - 8);
    const F = "#2f6f73";
    R(x + 4, GY - 4, 16, 1, F); R(x + 5, GY - 11, 10, 1, F);
    for (let i = 0; i < 7; i++) R(x + 5 + i, GY - 11 + i, 1, 1, F);
    R(x + 4, GY - 15, 1, 11, F); R(x + 14, GY - 13, 1, 9, F); R(x + 2, GY - 16, 4, 1, PAL.k);
    for (let dy = 0; dy <= 9; dy++) {
      const hw = Math.round(7.5 * Math.sqrt(1 - (dy / 9.6) ** 2));
      R(x + 16 - hw, GY - 13 - dy, hw * 2 + 1, 1, dy === 0 ? "#3d7d36" : "#4f9d45");
    }
    for (const [dx, dy, c] of FLOWER_DOTS) R(x + dx, GY + dy, 2, 2, c);
    parts(x, GY, [[0, -14, 5, 3, "#c9a25e"]]);
    R(x + 1, GY - 16, 1, 1, "#f48fb1"); R(x + 3, GY - 16, 1, 1, "#ffd75a");
  }

  function drawStools(x, e) { // trà đá: tiny plastic stools around a low table
    const cols = ["#d23c3c", "#3b7dd8"], half = Math.floor(e.n / 2);
    for (let i = 0; i < e.n; i++) {
      const sx = x + i * 8 + (i >= half ? 10 : 0), c = cols[i % 2];
      parts(sx, GY, [[0, -6, 6, 2, c]]);
      R(sx, GY - 4, 1, 4, c); R(sx + 5, GY - 4, 1, 4, c);
    }
    const tx = x + half * 8;
    parts(tx, GY, [[1, -8, 8, 2, "#3b7dd8"]]);
    R(tx + 2, GY - 6, 1, 6, "#3b7dd8"); R(tx + 7, GY - 6, 1, 6, "#3b7dd8");
    R(tx + 2, GY - 11, 2, 3, "#e8f4f8"); R(tx + 2, GY - 9, 2, 1, "#c79a5b");
    parts(tx, GY, [[5, -11, 3, 3, "#e8e2d0"]]);
  }

  function drawXichLo(x) { // cyclo with the driver in a nón lá
    ctx.drawImage(SPR.bwheel, x, GY - 8);
    ctx.drawImage(SPR.bwheel, x + 22, GY - 8);
    parts(x, GY, [
      [2, -15, 13, 6, "#9e1f24"],
      [1, -21, 4, 7, "#3a2a22"],
      [3, -9, 12, 2, "#6b4226"],
      [14, -11, 12, 1, "#2f2f35"],
      [22, -17, 1, 8, "#2f2f35"],
    ]);
    R(x + 4, GY - 14, 9, 1, "#c8323a");
    parts(x, GY, [[20, -21, 5, 5, "#3e7b5a"]]);
    R(x + 21, GY - 23, 3, 2, PAL.s);
    ctx.drawImage(SPR.nonla, x + 16, GY - 27);
  }

  function drawGanh(x, e) { // gánh hàng rong set down on the street
    for (const bx of [0, 18]) {
      for (let i = 0; i < 4; i++) {
        const c = e.goods === "com" ? (i % 2 ? "#8fcf6a" : "#6fb64f") : (i % 2 ? "#f29b38" : "#e8572e");
        R(x + bx + 2 + i * 2, GY - 9 + (i % 2), 2, 2, c);
      }
      parts(x, GY, [[bx + 1, -7, 8, 7, "#c9a25e"]]);
      R(x + bx + 1, GY - 5, 8, 1, "#a8823f"); R(x + bx + 1, GY - 3, 8, 1, "#a8823f");
      R(x + bx + 1, GY - 12, 1, 4, "#7a5232"); R(x + bx + 8, GY - 12, 1, 4, "#7a5232");
    }
    R(x, GY - 12, 28, 1, "#6b4226");
  }

  function drawBarrier(x) { // "đang thi công"
    R(x + 2, GY - 13, 1, 13, "#4a4a52"); R(x + 19, GY - 13, 1, 13, "#4a4a52");
    parts(x, GY, [[1, -12, 20, 5, "#ffffff"]]);
    for (let i = 0; i < 20; i += 4) R(x + 1 + i, GY - 12, 2, 5, "#d23c3c");
    parts(x, GY, [[8, -19, 6, 5, "#ffd75a"]]);
    R(x + 10, GY - 18, 2, 2, PAL.k); R(x + 10, GY - 15, 2, 1, PAL.k);
    R(x + 4, GY - 3, 3, 3, "#f29b38"); R(x + 5, GY - 5, 1, 2, "#f29b38"); // traffic cone
  }

  function drawPuddle(x, e, t) {
    R(x + 2, GY - 2, 22, 1, "#6a9fe0"); R(x, GY - 1, 26, 2, "#4a7cc0");
    R(x + 4, GY - 2, 6, 1, "#bfe0ff");
    R(x + 13 + Math.round(Math.sin(t * 3) * 3), GY - 1, 3, 1, "#9cc8f5");
  }

  const DRAW = {
    bike: drawBike, pho: drawPho, flower: drawFlower, stools: drawStools,
    xichlo: drawXichLo, ganh: drawGanh, barrier: drawBarrier, puddle: drawPuddle,
  };

  // Obstacle mix per zone: [type, weight, extra]
  const POOLS = [
    [["slime", 30], ["stools", 18], ["bike", 14, "nonla"], ["bike", 8, "fridge"], ["bike", 8, "chicken"], ["pho", 12], ["ganh", 6, "fruit"], ["barrier", 6]],
    [["slime", 28], ["flower", 14], ["xichlo", 16], ["puddle", 12], ["bike", 10, "dao"], ["ganh", 12, "com"], ["bike", 8, "nonla"]],
    [["slime", 30], ["stools", 20], ["bike", 10, "chicken"], ["barrier", 10], ["puddle", 8], ["flower", 10], ["bike", 8, "fridge"], ["pho", 8]],
  ];
  const ZONE_SLIME = ["ketxe", "muaphun", "manom"];

  // ---------- Background (generated once, deterministic) ----------
  const HOUSE_COLORS = [
    ["#f2c14e", "#d9a43a"], ["#f3e6cc", "#d8c7a6"], ["#a8d5ba", "#86b89a"],
    ["#f4b6b6", "#d99595"], ["#f6d7a7", "#dcb985"], ["#c9dbe8", "#a7bfd0"],
  ];
  const SIGN_COLORS = ["#c8323a", "#2f6f9e", "#3f8f5a", "#e0a030", "#8e44ad"];
  // The lake (Hồ Gươm) occupies the mid layer while the groom is in zone 1
  const LAKE = { start: ZONES[1].start * MID + PX * (1 - MID), end: ZONES[2].start * MID + PX * (1 - MID) };
  let houses = [], poles = [], skyline = [], clouds = [], willows = [], stars = [];
  function buildBackground() {
    const r = rng(SEED + 1);
    houses = []; poles = []; skyline = []; clouds = []; willows = []; stars = [];
    for (let x = -40; x < COURSE * MID + 400;) {
      if (x > LAKE.start - 30 && x < LAKE.end + 4) { x = LAKE.end + 4; continue; }
      const narrow = x > LAKE.end; // phố đường tàu: narrower, taller houses
      const w = narrow ? 22 + Math.round(r() * 8) : 26 + Math.round(r() * 14);
      const floors = narrow ? 4 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3);
      const [color, shade] = HOUSE_COLORS[(r() * HOUSE_COLORS.length) | 0];
      houses.push({
        x, w, floors, color, shade, sign: SIGN_COLORS[(r() * SIGN_COLORS.length) | 0],
        tank: r() < 0.45, tree: r() < 0.16, hoasua: r() < 0.5, plants: Math.floor(r() * 4),
      });
      x += w + Math.round(r() * 3);
    }
    for (let x = 60; x < COURSE * MID + 400; x += 150 + Math.round(r() * 50)) {
      if (x > LAKE.start - 10 && x < LAKE.end + 10) continue;
      poles.push(x);
    }
    for (let x = LAKE.start + 20; x < LAKE.end - 20; x += 46 + Math.round(r() * 30)) willows.push({ x, kind: r() < 0.3 ? "hoasua" : "willow" });
    for (let x = -20; x < COURSE * FAR + 400;) {
      const pagoda = r() < 0.12, w = pagoda ? 22 : 12 + Math.round(r() * 22);
      skyline.push({ x, w, h: pagoda ? 34 : 14 + Math.round(r() * 30), pagoda });
      x += w + Math.round(r() * 6);
    }
    for (let i = 0; i < 6; i++) clouds.push({ x: r() * 400, y: 10 + r() * 30, w: 14 + Math.round(r() * 14) });
    for (let i = 0; i < 26; i++) stars.push({ x: r(), y: 4 + r() * 46, p: r() * 6 });
  }

  // Time of day follows the journey: afternoon → sunset at Hồ Gươm → evening at the bride's house
  const SKIES = [
    [0.0, ["#fbe9d0", "#fae2c6", "#f8dabc", "#f7d2b3", "#f5caa9"]],
    [0.42, ["#fbe9d0", "#fae2c6", "#f8dabc", "#f7d2b3", "#f5caa9"]],
    [0.66, ["#f7c9a0", "#f5b48e", "#f19c86", "#ea8a86", "#f1a183"]],
    [0.94, ["#3d3466", "#5a437a", "#7f5582", "#a7667e", "#cf8679"]],
  ];
  function skyAt(p) {
    for (let i = 0; i < SKIES.length - 1; i++) {
      const [p0, a] = SKIES[i], [p1, b] = SKIES[i + 1];
      if (p <= p1) return a.map((c, j) => mix(c, b[j], clamp01((p - p0) / (p1 - p0))));
    }
    return SKIES[SKIES.length - 1][1];
  }
  let night = 0; // 0 = day, 1 = evening

  function drawSky(t) {
    const p = clamp01((cam + PX) / COURSE);
    const bands = skyAt(p);
    const bh = Math.ceil((GY - 20) / bands.length);
    bands.forEach((c, i) => R(0, i * bh, VW, bh, c));
    R(0, bands.length * bh, VW, H, bands[bands.length - 1]);
    if (night > 0.25) for (const s of stars) {
      if (Math.sin(t * 2 + s.p) > -0.3) R(Math.round(s.x * VW), s.y, 1, 1, `rgba(255,248,220,${(night - 0.25) * 1.2})`);
    }
    if (night < 0.9) { // sun sinking and turning orange
      ctx.globalAlpha = 1 - night;
      disc(Math.round(VW * 0.78), Math.round(26 + p * 48), 11, mix("#fff2d6", "#ff9a5a", clamp01(p * 1.4)));
      ctx.globalAlpha = 1;
    }
    const cc = mix("#fff8ec", "#b9a3c9", night);
    for (const c of clouds) {
      const x = Math.round(((c.x - cam * 0.08 - t * 2) % (VW + 60) + VW + 60) % (VW + 60)) - 40;
      R(x, c.y, c.w, 3, cc); R(x + 3, c.y - 2, c.w - 7, 2, cc);
    }
  }

  function drawSkyline() {
    const off = cam * FAR, base = GY - 30;
    const c1 = mix("#efcdb3", "#6b5583", night), c2 = mix("#e3b597", "#5a4672", night), c3 = mix("#ecc2a6", "#644e7c", night);
    for (const b of skyline) {
      const x = Math.round(b.x - off);
      if (x > VW || x + b.w < 0) continue;
      if (b.pagoda) {
        R(x + 6, base - 14, 10, 14, c3);
        for (let i = 0; i < 3; i++) {
          const y = base - 14 - i * 7, w = 20 - i * 5, x0 = x + 11 - w / 2;
          R(x0, y - 2, w, 2, c2); R(x0 - 1, y - 3, 1, 1, c2); R(x0 + w, y - 3, 1, 1, c2);
          if (i < 2) R(x + 8 - i, y - 7, 7, 5, c3);
        }
        R(x + 10, base - 38, 2, 4, c2);
      } else R(x, base - b.h, b.w, b.h + 30, c1);
    }
  }

  let lights = []; // windows that light up in the evening (drawn after the dusk overlay)
  const lit = (a, b, c) => ((a * 13 + b * 7 + c * 31) % 10) / 10 < 0.62;

  function drawHouses() {
    const off = cam * MID;
    for (const hs of houses) {
      const x = Math.round(hs.x - off);
      if (x > VW + 2 || x + hs.w < -2) continue;
      const top = GY - 2 - hs.floors * 16 - 3;
      R(x, top, hs.w, GY - top, hs.color);
      R(x + hs.w - 2, top, 2, GY - top, hs.shade);
      R(x - 1, top, hs.w + 2, 2, hs.shade);
      if (hs.tank) {
        R(x + 4, top - 6, 8, 5, "#d7dbe2"); R(x + 4, top - 6, 8, 1, "#f2f4f7");
        R(x + 5, top - 1, 1, 1, "#8a8f98"); R(x + 10, top - 1, 1, 1, "#8a8f98");
      }
      for (let f = 0; f < hs.floors; f++) {
        const fy = GY - 2 - (f + 1) * 16;
        if (f === 0) {
          R(x + 1, fy + 2, hs.w - 3, 4, hs.sign);
          for (let i = x + 3; i < x + hs.w - 4; i += 3) R(i, fy + 3, 2, 1, "#fff3d6");
          R(x + 2, fy + 7, hs.w - 5, 9, "#5a3b2e");
          R(x + 3, fy + 9, hs.w - 7, 6, "#f2b766");
          R(x + 4, fy + 11, 3, 4, "#c47a3a"); R(x + hs.w - 9, fy + 10, 3, 5, "#c47a3a");
          if (night > 0.3) lights.push([x + 3, fy + 9, hs.w - 7, 2]);
        } else {
          const n = hs.w >= 34 ? 2 : 1, ww = 8, gap = (hs.w - 2 - n * ww) / (n + 1);
          for (let i = 0; i < n; i++) {
            const wx = Math.round(x + gap + i * (ww + gap));
            R(wx, fy + 3, ww, 9, "#3e7b5a");
            R(wx + 3, fy + 4, 2, 7, "#2d3b45");
            R(wx - 1, fy + 2, ww + 2, 1, hs.shade);
            if (night > 0.3 && lit(hs.x, f, i)) lights.push([wx + 3, fy + 4, 2, 7]);
          }
          R(x + 1, fy + 12, hs.w - 3, 1, "#4a3a32");
          for (let i = x + 2; i < x + hs.w - 2; i += 2) R(i, fy + 13, 1, 2, "#4a3a32");
          R(x + 1, fy + 15, hs.w - 3, 1, "#4a3a32");
          for (let i = 0; i < hs.plants; i++) R(x + 3 + i * 8, fy + 10, 3, 2, "#4f9d45");
        }
      }
      if (hs.tree) drawTree(x + hs.w - 6, hs.hoasua);
    }
  }

  function drawTree(x, hoasua) { // cây bàng / cây hoa sữa
    R(x, GY - 22, 2, 20, "#7a5232");
    R(x - 8, GY - 34, 18, 10, "#5fa850"); R(x - 5, GY - 38, 12, 4, "#6fbb5e"); R(x - 6, GY - 24, 14, 2, "#4f9d45");
    if (hoasua) for (let i = 0; i < 12; i++) R(x - 7 + ((i * 5) % 16), GY - 36 + ((i * 3) % 11), 1, 1, "#fffbe8");
    else { R(x - 6, GY - 30, 2, 2, "#d9622b"); R(x + 4, GY - 33, 2, 1, "#e07b39"); } // a few red bàng leaves
  }

  function drawLake(t) {
    const off = cam * MID;
    const x1 = Math.round(LAKE.start - off), x2 = Math.round(LAKE.end - off);
    if (x2 < 0 || x1 > VW) return;
    const a = Math.max(0, x1), b = Math.min(VW, x2);
    const tree = mix("#5d8f63", "#3e4f5e", night), water = mix("#79b4ab", "#4f6680", night), shine = mix("#a7d6cc", "#8aa0c0", night);
    for (let x = a; x < b; x += 3) {
      const hh = 3 + (((x + Math.round(off)) * 7) % 5);
      R(x, GY - 34 - hh, 3, hh + 3, tree);
    }
    R(a, GY - 33, b - a, 31, water);
    for (let row = 0; row < 3; row++) {
      const y = GY - 27 + row * 8, o = Math.round((t * 6 + row * 7 + off) % 14);
      for (let x = a - o; x < b; x += 14) if (x >= a) R(x, y, 5, 1, shine);
    }
    // Tháp Rùa on its little island
    const tx = Math.round(LAKE.start + 300 - off);
    if (tx > -30 && tx < VW + 30) {
      R(tx - 12, GY - 22, 30, 3, mix("#6f9c5a", "#3e5848", night));
      const wall = mix("#d9c49a", "#7d7090", night), roof = mix("#7a6a4a", "#463c55", night);
      R(tx - 6, GY - 34, 18, 12, wall); R(tx - 8, GY - 36, 22, 2, roof);
      R(tx - 4, GY - 44, 14, 8, wall); R(tx - 6, GY - 46, 18, 2, roof);
      R(tx - 1, GY - 52, 8, 6, wall); R(tx - 3, GY - 54, 12, 2, roof); R(tx + 2, GY - 57, 2, 3, roof);
      for (const [wx, wy] of [[tx - 3, GY - 30], [tx + 3, GY - 30], [tx + 9, GY - 30], [tx, GY - 41], [tx + 6, GY - 41], [tx + 2, GY - 50]]) {
        R(wx, wy, 2, 3, night > 0.3 ? "#ffd56b" : roof);
      }
    }
    // Cầu Thê Húc (red arched bridge) leading to Đền Ngọc Sơn
    const bx = Math.round(LAKE.start + 610 - off);
    if (bx > -90 && bx < VW + 30) {
      const red = mix("#d23c3c", "#a33a4a", night);
      for (let i = 0; i <= 70; i++) {
        const y = GY - 6 - Math.round(Math.sin((i / 70) * Math.PI) * 12);
        R(bx + i, y, 1, 2, red);
        if (i % 5 === 0) R(bx + i, y - 4, 1, 4, red);
      }
      for (let i = 0; i <= 70; i++) R(bx + i, GY - 10 - Math.round(Math.sin((i / 70) * Math.PI) * 12), 1, 1, red);
      const gx2 = bx + 72; // temple gate
      R(gx2, GY - 30, 3, 26, red); R(gx2 + 15, GY - 30, 3, 26, red);
      R(gx2 - 3, GY - 33, 24, 3, mix("#3a6b4a", "#2c3e48", night)); R(gx2 + 3, GY - 27, 12, 4, "#ffd75a");
    }
  }

  function drawLakeFront(t) { // willows, hoa sữa trees and lamp posts along the lake shore
    const off = cam * MID;
    for (const w of willows) {
      const x = Math.round(w.x - off);
      if (x < -20 || x > VW + 20) continue;
      if (w.kind === "hoasua") { drawTree(x, true); continue; }
      R(x, GY - 24, 2, 22, "#6b4a2f"); R(x + 2, GY - 28, 1, 5, "#6b4a2f");
      R(x - 8, GY - 30, 18, 3, "#7cbf5f");
      for (let i = 0; i < 10; i++) {
        const len = 6 + ((i * 7) % 9), sway = Math.round(Math.sin(t * 1.5 + i) * 0.7);
        R(x - 8 + i * 2 + sway, GY - 28, 1, len, i % 2 ? "#8fd16a" : "#6aad52");
      }
    }
    for (let x0 = LAKE.start + 40; x0 < LAKE.end; x0 += 120) {
      const x = Math.round(x0 - off);
      if (x < -6 || x > VW + 6) continue;
      R(x, GY - 30, 1, 28, "#3a3a40"); R(x - 1, GY - 33, 3, 3, night > 0.3 ? "#ffe59a" : "#e8e2d0");
      if (night > 0.3) lights.push(["glow", x, GY - 32]);
    }
  }

  function drawWires(t) {
    const off = cam * MID;
    for (let i = 0; i < poles.length - 1; i++) {
      const x1 = Math.round(poles[i] - off), x2 = Math.round(poles[i + 1] - off);
      if (x2 < 0 || x1 > VW || poles[i + 1] - poles[i] > 260) continue;
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
            if (night > 0.3) lights.push(["glow", x + sw, y + 3]);
          }
        }
      }
    }
    for (const px of poles) {
      const x = Math.round(px - off);
      if (x < -6 || x > VW + 6) continue;
      R(x, GY - 96, 2, 94, "#5b5550");
      R(x - 4, GY - 93, 10, 1, "#5b5550");
      R(x - 3, GY - 88, 7, 3, "#2f2a27");
    }
  }

  function drawLights() {
    for (const L of lights) {
      if (L[0] === "glow") {
        ctx.globalAlpha = 0.22 * night; disc(L[1], L[2], 5, "#ffd56b"); ctx.globalAlpha = 1;
        R(L[1], L[2], 1, 1, "#fff4c2");
      } else R(L[0], L[1], L[2], L[3], "#ffd56b");
    }
    lights = [];
  }

  function drawTrain() { // the famous train squeezing through Phố đường tàu
    if (!train) return;
    const sx = Math.round(train.sx), y0 = GY - 3;
    parts(sx, y0, [[0, -27, 54, 23, "#2c4f8a"]]);
    R(sx, y0 - 15, 54, 3, "#f2c14e"); R(sx + 2, y0 - 24, 9, 6, "#cfe6f5"); R(sx - 2, y0 - 9, 3, 3, "#ffe59a");
    for (let i = 0; i < 4; i++) {
      const cx = sx + 58 + i * 58;
      if (cx > VW + 4) break;
      parts(cx, y0, [[0, -25, 54, 21, "#3b6fb0"]]);
      R(cx, y0 - 23, 54, 2, "#e9e2cf"); R(cx, y0 - 9, 54, 2, "#e9e2cf");
      for (let k = 0; k < 5; k++) R(cx + 3 + k * 10, y0 - 19, 7, 6, night > 0.3 ? "#ffe59a" : "#cfe6f5");
      R(cx - 4, y0 - 12, 4, 2, PAL.k);
    }
    for (let x = sx + 4; x < Math.min(VW, sx + 290); x += 9) R(x, y0 - 4, 4, 3, PAL.D);
  }

  function drawGround() {
    const segs = [
      [ZONES[0].start, ZONES[1].start, 0], [ZONES[1].start, ZONES[2].start, 1], [ZONES[2].start, COURSE + 400, 2],
    ];
    for (const [w0, w1, z] of segs) {
      const a = Math.max(0, Math.round(w0 - cam)), b = Math.min(VW, Math.round(w1 - cam));
      if (b <= a) continue;
      if (z === 0) { // vỉa hè tiles + road
        R(a, GY - 2, b - a, 10, "#e3cfb2");
        for (let x = a - Math.round(cam % 10); x < b; x += 10) if (x >= a) R(x, GY - 2, 1, 10, "#cdb595");
        R(a, GY + 3, b - a, 1, "#cdb595"); R(a, GY + 8, b - a, 2, "#a39a92"); R(a, GY + 10, b - a, H - GY - 10, "#6f6a66");
        for (let x = a - Math.round(cam % 24); x < b; x += 24) if (x >= a) R(x, GY + 15, 10, 1, "#d8d2c8");
      } else if (z === 1) { // brick walkway by the lake + grass
        R(a, GY - 2, b - a, 12, "#d79f7a");
        for (let row = 0; row < 3; row++) {
          R(a, GY + 1 + row * 4, b - a, 1, "#b97f5c");
          for (let x = a - Math.round((cam + row * 4) % 8); x < b; x += 8) if (x >= a) R(x, GY - 2 + row * 4, 1, 4, "#b97f5c");
        }
        R(a, GY + 10, b - a, H - GY - 10, "#7cb46a");
        for (let x = a - Math.round(cam % 6); x < b; x += 6) if (x >= a) R(x, GY + 12 + ((x * 3) % 4), 1, 2, "#5f9a52");
      } else { // railway: gravel, sleepers, rails
        R(a, GY - 2, b - a, H - GY + 2, "#9b938a");
        for (let x = a - Math.round(cam % 8); x < b; x += 8) if (x >= a) R(x, GY - 1, 3, 10, "#6b4a2f");
        R(a, GY, b - a, 1, "#c3c6cc"); R(a, GY + 1, b - a, 1, "#7d8088");
        R(a, GY + 6, b - a, 1, "#c3c6cc"); R(a, GY + 7, b - a, 1, "#7d8088");
        R(a, GY - 4, b - a, 1, "#7d8088"); // the second track behind
      }
    }
    if (night > 0) { ctx.globalAlpha = 0.18 * night; R(0, GY - 2, VW, H, "#1d1440"); ctx.globalAlpha = 1; }
  }

  // Bride's house + flower gate (cổng cưới "Vu Quy")
  function drawGate(gx, t) {
    const lightOn = night > 0.3;
    parts(gx - 26, GY, [[0, -92, 102, 90, "#f2c14e"]]);
    R(gx - 27, GY - 95, 104, 3, "#d9a43a");
    for (let f = 1; f < 5; f++) {
      const fy = GY - 2 - (f + 1) * 16;
      [gx - 20, gx + 26, gx + 56].forEach((wx, i) => {
        R(wx, fy + 3, 8, 9, "#3e7b5a"); R(wx + 3, fy + 4, 2, 7, lightOn && lit(wx, f, i) ? "#ffd56b" : "#2d3b45");
      });
      R(gx - 25, fy + 12, 100, 1, "#4a3a32");
    }
    parts(gx, GY, [[44, -26, 22, 24, "#8e1b1b"]]); // open front doors
    R(gx + 47, GY - 23, 16, 21, lightOn ? "#ffd56b" : "#f2b766");
    for (let i = 0; i < 7; i++) {
      const lx = gx - 18 + i * 14, sw = Math.round(Math.sin(t * 2 + i));
      R(lx + sw, GY - 70, 4, 1, "#e8b84a"); R(lx + sw, GY - 69, 4, 4, "#d23c3c"); R(lx + 1 + sw, GY - 65, 2, 2, "#e8b84a");
      if (lightOn) lights.push(["glow", lx + 2 + sw, GY - 67]);
    }
    parts(gx, GY, [[-14, -52, 6, 52, "#f6e7cf"], [22, -52, 6, 52, "#f6e7cf"]]);
    const fc = ["#f48fb1", "#ffffff", "#d23c3c", "#ffd75a"];
    for (let y = 0; y < 52; y += 3) for (const px of [-14, 22]) {
      R(gx + px + ((y / 3) % 2 ? 1 : 3), GY - 52 + y, 2, 2, fc[(y / 3) % 4]);
      R(gx + px + ((y / 3) % 2 ? 4 : 0), GY - 51 + y, 1, 1, "#4f9d45");
    }
    parts(gx, GY, [[-18, -64, 46, 12, "#c8323a"]]);
    R(gx - 18, GY - 64, 46, 1, "#e8b84a"); R(gx - 18, GY - 53, 46, 1, "#e8b84a");
    const label = "VU QUY";
    drawText(label, gx + 5 - Math.floor(textW(label) / 2), GY - 60, "#ffd75a");
    disc(gx + 5, GY - 76, 10, "#e8b84a");
    disc(gx + 5, GY - 76, 9, "#fff3d6");
    ctx.drawImage(SPR.hy, gx, GY - 82);
  }

  // ---------- Course ----------
  // Fixed spots for the special things; each is moved into the nearest free gap between obstacles.
  const SPECIALS = [
    { type: "friend", x: 520 }, { type: "power", kind: "nonla", x: 760 },
    { type: "item", kind: "traucau", x: 1000 },
    { type: "friend", x: 1350 }, { type: "power", kind: "grab", x: 1620 },
    { type: "item", kind: "banhcom", x: 1850, high: true },
    { type: "friend", x: 2450 }, { type: "item", kind: "ruou", x: 2800 },
    { type: "item", kind: "che", x: 3450, high: true },
    { type: "friend", x: 3950 }, { type: "power", kind: "nonla", x: 4400 },
    { type: "item", kind: "hoaqua", x: 4800 }, { type: "friend", x: 5150 },
  ];
  const CAMEOS = [
    { kind: "auntie", name: "Cô bán trà đá", x: 820, say: "Đẹp trai thế!" },
    { kind: "fan", name: "Hội bạn thân", x: 2250, say: `Cố lên ${W.groom.name}!` },
    { kind: "auntie", name: "Bác bán cốm", x: 3300, say: "Đi rước dâu à? Chúc mừng nhé!" },
    { kind: "auntie", name: "Cô chủ quán cà phê", x: TRAIN_X - 60, say: "Tàu đến! Đứng sát vào!" },
    { kind: "fan", name: "Hội bạn thân", x: 4950, say: "Sắp tới nhà gái rồi!" },
  ];

  const speedAt = (prog) => SPEED0 + (SPEED1 - SPEED0) * prog;

  function buildCourse() {
    const r = rng(SEED), list = [], gaps = [];
    let x = 300;
    while (x < COURSE - 320) {
      const prog = x / COURSE, z = zoneAt(x).id, pool = POOLS[z];
      const total = pool.reduce((s, p) => s + p[1], 0);
      let k = r() * total, choice = pool[0];
      for (const p of pool) { if ((k -= p[1]) < 0) { choice = p; break; } }
      let [type, , extra] = choice;
      if (type === "bike" && BIKE_LOAD_H[extra] > 22 && prog < 0.12) extra = "nonla";
      const o = { type, x, w: SIZE[type].w, h: SIZE[type].h, color: BIKE_COLORS[(r() * 4) | 0], phase: r() * 6 };
      if (type === "bike") { o.load = extra; o.h = BIKE_LOAD_H[extra]; }
      if (type === "ganh") o.goods = extra;
      if (type === "stools") { o.n = r() < 0.5 ? 3 : 4; o.w = o.n * 8 + 10; }
      if (type === "slime") o.kind = ZONE_SLIME[z];
      list.push(o);
      let w = o.w;
      if (type === "slime" && prog > 0.22 && r() < 0.35) { list.push({ ...o, x: x + 20, phase: o.phase + 1.5 }); w += 20; }
      if (type !== "slime" && type !== "puddle" && r() < 0.45) { // arc of hearts rewards a clean jump
        const top = Math.max(54, o.h + 30);
        [[-10, 34], [w / 2 - 3, top], [w + 4, 34]].forEach(([dx, dy]) => list.push({ type: "heart", x: x + dx, y: GY - dy }));
      }
      const gap = (105 + r() * 85) * (speedAt(prog) / SPEED0);
      gaps.push({ a: x + w + 14, b: x + w + gap - 14, used: false });
      x += w + gap;
    }
    // specials go into the nearest unused gap
    for (const sp of SPECIALS) {
      let best = null;
      for (const g of gaps) if (!g.used && g.b - g.a > 30 && (!best || Math.abs((g.a + g.b) / 2 - sp.x) < Math.abs((best.a + best.b) / 2 - sp.x))) best = g;
      if (!best) continue;
      best.used = true;
      const cx = Math.round((best.a + best.b) / 2);
      if (sp.type === "friend") list.push({ type: "friend", x: cx - 6 });
      else if (sp.type === "power") list.push({ type: "power", kind: sp.kind, x: cx - 4, y: GY - 15 }); // run-through height
      else list.push({ type: "item", kind: sp.kind, x: cx - 4, y: sp.high ? GY - 44 : GY - 15 });
    }
    // fill the remaining gaps with lì xì and rows of hearts
    for (const g of gaps) {
      if (g.used) continue;
      const k2 = r(), cx = (g.a + g.b) / 2;
      if (k2 < 0.24) list.push({ type: "lixi", x: Math.round(cx - 3), y: GY - 46 });
      else if (k2 < 0.52) for (let i = 0; i < 3; i++) list.push({ type: "heart", x: Math.round(cx - 18 + i * 12), y: GY - 14 });
    }
    for (const c of CAMEOS) list.push({ type: "cameo", kind: c.kind, name: c.name, x: c.x, say: c.say });
    return list.sort((a, b) => a.x - b.x);
  }

  // ---------- Speech bubbles (HTML, so Vietnamese text stays crisp) ----------
  let bubbles = [], scale = 2;
  function say(text, o) {
    const key = o.key || (o.follow === "groom" ? "groom" : "");
    if (key) bubbles.filter((b) => b.key === key).forEach((b) => { b.life = 0; b.el.remove(); });
    const el = document.createElement("div");
    el.className = "gbubble" + (o.cls ? " " + o.cls : "");
    el.textContent = text;
    bubbleLayer.appendChild(el);
    const life = Math.max(o.life || 0, o.cls ? 0 : Math.min(3, 0.9 + 0.06 * [...text].length));
    bubbles.push(Object.assign({ el }, o, { key, life: life || 1.8 }));
  }
  function clearBubbles() { bubbles.forEach((b) => b.el.remove()); bubbles = []; }
  function updateBubbles(dt) {
    for (const b of bubbles) { b.life -= dt; if (b.rise) b.y -= 14 * dt; }
    bubbles = bubbles.filter((b) => (b.life > 0 ? true : (b.el.remove(), false)));
  }
  function placeBubbles() {
    for (const b of bubbles) {
      let sx, sy;
      if (b.screen) { sx = VW / 2; sy = 26; }
      else if (b.follow === "groom") { sx = playerX() + 6; sy = pl.y - 19; }
      else if (b.follow === "train") { sx = train ? train.sx + 20 : -99; sy = GY - 32; }
      else { sx = b.x - cam; sy = b.y; }
      b.el.style.transform = `translate(${(sx * scale).toFixed(1)}px, ${(sy * scale).toFixed(1)}px) translate(-50%, -100%)`;
      b.el.style.opacity = Math.min(1, b.life * 3).toFixed(2);
    }
  }

  // ---------- Dialogue box (story lines stay put while the street scrolls) ----------
  const dlgEl = $("gameDialog"), dlgFace = dlgEl.querySelector(".gd-face"), dlgName = dlgEl.querySelector(".gd-name"), dlgText = dlgEl.querySelector(".gd-text");
  const hintEl = document.querySelector(".game-hint");
  const readTime = (text) => Math.max(1.8, Math.min(4, 1.3 + 0.07 * [...text].length)); // longer lines stay longer
  let dlg = { cur: null, t: 0, queue: [] };
  function faceURL(spr) { // the speaker's head, cropped from their sprite
    const c = document.createElement("canvas");
    c.width = 12; c.height = 11;
    c.getContext("2d").drawImage(spr, 0, 0);
    return c.toDataURL();
  }
  let SPEAKERS = null;
  function speakers() {
    return SPEAKERS || (SPEAKERS = {
      groom: { name: W.groom.name, face: faceURL(SPR.runB) },
      bride: { name: W.bride.name, face: faceURL(SPR.bride) },
      friend: { name: "Anh em bê tráp", face: faceURL(SPR.friendA) },
      cousin: { name: "Chị em nhà gái", face: faceURL(SPR.cousin) },
      auntie: { name: "Cô bán trà đá", face: faceURL(SPR.auntie) },
      fan: { name: "Hội bạn thân", face: faceURL(SPR.fan) },
    });
  }
  function talk(who, text, o = {}) { // who = speaker key, or null for a narrator line
    const sp = who ? speakers()[who] : null;
    const line = { name: o.name || (sp && sp.name) || "", face: sp ? sp.face : "", text, dur: o.dur || readTime(text), narrator: !who };
    if (o.now) { dlg.queue = []; dlg.cur = null; dlg.gap = 0; } // scene lines replace whatever is showing
    else if (dlg.queue.length >= 3) dlg.queue.shift(); // never let a backlog build up
    dlg.queue.push(line);
    if (o.now) updateDialog(0);
    return line.dur;
  }
  function clearDialog() { dlg = { cur: null, t: 0, queue: [] }; dlgEl.hidden = true; }
  function updateDialog(dt) {
    if (dlg.cur) { dlg.t += dt; if (dlg.t >= dlg.cur.dur) { dlg.cur = null; dlgEl.hidden = true; dlg.gap = 0.15; } }
    if (dlg.gap > 0) { dlg.gap -= dt; return; }
    if (!dlg.cur && dlg.queue.length) {
      dlg.cur = dlg.queue.shift(); dlg.t = 0;
      dlgEl.classList.toggle("narrator", dlg.cur.narrator);
      dlgFace.hidden = !dlg.cur.face; if (dlg.cur.face) dlgFace.src = dlg.cur.face;
      dlgName.textContent = dlg.cur.name; dlgName.hidden = !dlg.cur.name;
      dlgText.textContent = dlg.cur.text;
      dlgEl.hidden = false;
    }
  }
  const HINT = hintEl.textContent;
  function setHint(text, hot) { hintEl.textContent = text || hintTextDefault(); hintEl.classList.toggle("hot", !!hot); }
  function hintTextDefault() { return matchMedia("(hover: hover) and (pointer: fine)").matches ? "Nhấn Space hoặc click để nhảy" : HINT; }

  const OUCH = ["Ối giời ơi!", "Ui da!", "Toang rồi!", "Đau quá mẹ ơi!"];
  const FRIEND_LINES = ["Đợi anh em với!", "Bê tráp cho!", "Anh em tới đây!", "Đi rước dâu nào!"];
  const COMPLIMENTS = ["Các em xinh quá!", `Anh hứa thương ${W.bride.name} cả đời!`, "Cho anh qua đi mà!", "Anh sẽ rửa bát mỗi ngày!", "Lần sau anh lì xì gấp đôi!"];

  // ---------- Game state ----------
  let VW = 195;
  let state = "closed", t = 0, cam = 0, camStop = 0, last = 0, raf = 0;
  let pl, ents, fx, popups, ambient, stats, invuln, speedMul, jumpBuffer, walkX, runTime;
  let followers, yHist, power, zoneShown, train, trainDone, gate, celebT, hopT, nextFirework;
  let hudCache = "";

  function reset() {
    cam = 0; t = 0; runTime = 0;
    pl = { y: GY, vy: 0, onGround: true, jumps: 0 };
    ents = buildCourse();
    fx = []; popups = []; ambient = [];
    clearBubbles();
    stats = { slimes: 0, hearts: 0, lixi: 0, hits: 0, items: [], friends: 0 };
    invuln = 0; speedMul = 1; jumpBuffer = 0; walkX = PX;
    followers = 0; yHist = [];
    power = { ride: 0, shield: false };
    zoneShown = -1; train = null; trainDone = false;
    gate = { phase: "", t: 0, paid: 0, meter: 0, alpha: 1, bonus: "", nextPay: 0, lastTalk: 0, readUntil: 0 };
    clearDialog(); setHint("");
    celebT = 0; hopT = 0; nextFirework = 0; night = 0; hudCache = "";
    hud.tray.querySelectorAll("img").forEach((i) => i.classList.remove("got"));
    updateHud();
  }

  const liveScore = () =>
    stats.slimes * PTS.slime + stats.hearts * PTS.heart + stats.lixi * PTS.lixi + stats.items.length * PTS.item +
    (stats.items.length === ITEM_ORDER.length ? PTS.fullSet : 0) + stats.friends * PTS.friend + stats.hits * PTS.hit;

  function updateHud() {
    const prog = Math.min(1, Math.max(0, (cam + PX) / (COURSE - VW * 0.42 + 7 + PX)));
    const key = [Math.max(0, liveScore()), stats.hearts, stats.lixi, Math.round(prog * 200)].join("|");
    if (key === hudCache) return;
    hudCache = key;
    hud.score.textContent = Math.max(0, liveScore());
    hud.hearts.textContent = stats.hearts;
    hud.lixi.textContent = stats.lixi;
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

  function playerX() { return state === "run" || state === "idle" || state === "paused" ? PX : walkX; }

  function popup(x, y, text, color) { popups.push({ x, y, text, color, life: 0.9 }); }

  function burst(x, y, colors, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, s = speed * (0.6 + Math.random() * 0.5);
      fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, c: colors[i % colors.length], g: 60 });
    }
  }

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function slimeHop(e) { return Math.max(0, Math.sin(t * 4 + e.phase)) * 4; }

  // Gate layout (relative to the gate's x on screen)
  const COUSIN_X = [-5, 9], BRIDE_X = 34, BLOCK_X = -20, MEET_X = 22;

  function update(rdt) {
    t += rdt;
    updateBubbles(rdt);
    updateDialog(rdt);
    updateAmbient(rdt);
    if (state === "paused" || state === "idle") return;
    if (power.ride > 0) power.ride -= rdt;
    const dt = rdt;
    const gx = COURSE - cam;

    if (state === "run") {
      runTime += dt;
      const prog = Math.min(1, (cam + PX) / COURSE);
      speedMul = Math.min(1, speedMul + dt * 0.8);
      cam += speedAt(prog) * speedMul * (power.ride > 0 ? 1.35 : 1) * dt;
      const z = zoneAt(cam + PX);
      if (z.id !== zoneShown) { zoneShown = z.id; talk(null, `— ${z.name} —`, { dur: 1.8 }); }
      if (!train && !trainDone && cam + VW > TRAIN_X) {
        train = { sx: VW + 8 };
        say("Tu tuuu! 🚂", { follow: "train", life: 1.6 });
      }
      camStop = COURSE + 7 - VW * 0.42;
      if (cam >= camStop) {
        cam = camStop; state = "arrive"; walkX = PX; power.ride = 0;
        gate.readUntil = talk("cousin", "Lì xì đi rồi mới cho qua! 🧧", { now: true });
      }
    } else if (state === "arrive") {
      walkX = Math.min(gx + BLOCK_X, walkX + 55 * dt);
      if (walkX >= gx + BLOCK_X && pl.onGround) { state = "gate"; gate.phase = "pay"; gate.t = 0; gate.nextPay = Math.max(0.4, (gate.readUntil || 0) - 0.6); }
    } else if (state === "gate") {
      gate.t += dt;
      if (gate.phase === "pay") {
        if (gate.t > gate.nextPay) {
          if (gate.paid < LIXI_NEEDED && gate.paid < stats.lixi) {
            gate.paid++; gate.nextPay = gate.t + 0.35;
            fx.push({ fly: true, x0: cam + walkX + 6, y0: GY - 12, x1: COURSE + 8, y1: GY - 14, t: 0, dur: 0.35 });
            popup(COURSE + 4, GY - 26, `${gate.paid}`, "#ffd75a");
          } else if (gate.paid >= LIXI_NEEDED) {
            gate.bonus = "lixi"; openGate("Đủ rồi! Mời chú rể vào!");
          } else {
            gate.phase = "flatter";
            talk("cousin", "Chưa đủ lì xì! Nịnh đi nào!", { now: true });
            setHint("👆 Chạm liên tục để nịnh!", true);
          }
        }
      } else if (gate.phase === "open") {
        gate.alpha = Math.max(0, gate.alpha - dt * 1.6);
        if (gate.t > 0.75) { state = "enter"; setHint(""); }
      }
    } else if (state === "enter") {
      walkX = Math.min(gx + MEET_X, walkX + 50 * dt);
      if (walkX >= gx + MEET_X && pl.onGround) {
        state = "celebrate"; celebT = 0;
        talk("bride", "Anh đến rồi! 💕", { now: true });
      }
    } else if (state === "celebrate" || state === "done") {
      celebT += dt; hopT += dt;
      const cx = cam + walkX + 12;
      if (celebT < 2.6 && Math.random() < dt * 9) fx.push({ x: cx + (Math.random() - 0.5) * 10, y: GY - 18, vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 20, life: 1.4, heart: true });
      if (t > nextFirework) {
        nextFirework = t + (state === "done" ? 0.9 : 0.35);
        burst(cam + 20 + Math.random() * (VW - 40), 18 + Math.random() * 35, ["#ffd75a", "#ff8a65", "#f48fb1", "#ffffff", "#d23c3c"], 18, 45);
      }
      if (state === "celebrate" && celebT > 3.4) showResult();
    }

    if (train) { train.sx -= 230 * dt; if (train.sx < -300) { train = null; trainDone = true; } }

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
    yHist.push(pl.y); if (yHist.length > 90) yHist.shift();
    if (invuln > 0) invuln -= dt;
    night = clamp01(((cam + PX) / COURSE - 0.76) / 0.18);

    if (state === "run" || state === "arrive") collide(prevFeet);

    for (const p of fx) {
      if (p.fly) { p.t += dt; p.life = p.t < p.dur ? 1 : 0; continue; }
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.g) p.vy += p.g * dt;
    }
    fx = fx.filter((p) => p.life > 0);
    for (const p of popups) { p.life -= dt; p.y -= 18 * dt; }
    popups = popups.filter((p) => p.life > 0);
  }

  function openGate(line) {
    gate.phase = "open"; gate.t = 0;
    talk("cousin", line, { now: true });
    burst(COURSE + 8, GY - 14, ["#f48fb1", "#ffd75a", "#ffffff"], 16, 40);
  }

  function collide(prevFeet) {
    const px = cam + playerX();
    const box = { x: px + 3, y: pl.y - 13, w: 7, h: 13 };
    const riding = power.ride > 0;
    for (const e of ents) {
      if (e.x > Math.max(px + 48, cam + VW)) break;
      if (e.done || (e.x + 46 < px && e.type !== "cameo")) continue;
      switch (e.type) {
        case "cameo":
          if (!e.said && e.x < cam + VW - 16) { e.said = true; e.talking = talk(e.kind, e.say, { name: e.name }); }
          break;
        case "heart": case "lixi": {
          const ib = e.type === "heart" ? { x: e.x, y: e.y, w: 7, h: 6 } : { x: e.x, y: e.y, w: 6, h: 7 };
          if (!hit(box, ib)) break;
          e.done = true;
          if (e.type === "heart") { stats.hearts++; popup(e.x, e.y, "+" + PTS.heart, "#ffd75a"); }
          else { stats.lixi++; popup(e.x, e.y, "+" + PTS.lixi, "#ffd75a"); burst(e.x + 3, e.y + 3, ["#ffd75a", "#d23c3c"], 8, 30); }
          break;
        }
        case "item":
          if (!hit(box, { x: e.x, y: e.y, w: 8, h: 8 })) break;
          e.done = true;
          stats.items.push(e.kind);
          { const img = hud.tray.querySelector(`[data-k="${e.kind}"]`); if (img) img.classList.add("got"); }
          popup(e.x, e.y - 2, "+" + PTS.item, "#ffd75a");
          say(ITEMS[e.kind].name + "!", { x: e.x + 4, y: e.y - 3, cls: "label", rise: true, life: 1.1 });
          burst(e.x + 4, e.y + 4, ["#ffd75a", "#ffffff", "#d23c3c"], 12, 35);
          if (stats.items.length === ITEM_ORDER.length) talk(null, `🎉 Đủ lễ! +${PTS.fullSet}`, { dur: 2 });
          break;
        case "power":
          if (!hit(box, { x: e.x, y: e.y, w: 8, h: 8 })) break;
          e.done = true;
          if (e.kind === "nonla") { power.shield = true; say("Có nón lá che rồi!", { follow: "groom", life: 1.5 }); }
          else if (e.kind === "grab") { power.ride = 5; say("Grab đây! 🛵", { follow: "groom", life: 1.5 }); }
          burst(e.x + 4, e.y + 4, ["#ffffff", "#ffd75a"], 10, 30);
          break;
        case "friend":
          if (!hit(box, { x: e.x + 2, y: GY - 16, w: 8, h: 16 })) break;
          e.done = true;
          if (followers < MAX_FRIENDS) followers++;
          stats.friends++;
          popup(e.x, GY - 22, "+" + PTS.friend, "#ffd75a");
          talk("friend", pick(FRIEND_LINES));
          break;
        case "slime": {
          const hop = slimeHop(e), sb = { x: e.x + 1, y: GY - 7 - hop, w: 8, h: 7 };
          if (!hit(box, sb)) break;
          if (riding || (pl.vy > 0 && prevFeet <= sb.y + 4)) {
            e.done = true; stats.slimes++;
            if (!riding) { pl.vy = -210; pl.onGround = false; pl.jumps = 1; }
            popup(e.x, sb.y - 4, "+" + PTS.slime, "#ffd75a");
            say(SLIME_KINDS[e.kind].label, { x: e.x + 5, y: sb.y - 6, cls: "label", rise: true, life: 0.9 });
            burst(e.x + 5, sb.y + 4, ["#86d46a", "#ffffff", SLIME_KINDS[e.kind].map.l], 12, 50);
          } else if (invuln <= 0) takeHit(e);
          break;
        }
        default: {
          if (e.hitOnce) break;
          if (!hit(box, { x: e.x + 2, y: GY - e.h + 1, w: e.w - 4, h: e.h - 1 })) break;
          if (riding) { // the Grab bike just bumps things aside
            e.done = true;
            burst(e.x + e.w / 2, GY - e.h / 2, ["#ffffff", "#ffd75a", "#c9ccd4"], 14, 55);
            if (Math.random() < 0.5) say("Bíp bíp!", { follow: "groom", life: 0.8 });
          } else if (invuln <= 0) takeHit(e);
        }
      }
    }
  }

  function takeHit(e) {
    e.hitOnce = true;
    if (power.shield) {
      power.shield = false; invuln = 0.8;
      say("Hú hồn! Nón lá đỡ rồi 😅", { follow: "groom", life: 1.4 });
      fx.push({ x: cam + playerX() + 2, y: pl.y - 18, vx: -40, vy: -60, life: 0.9, g: 120, hat: true });
      return;
    }
    stats.hits++;
    invuln = 1.2;
    speedMul = 0.45;
    popup(cam + playerX(), pl.y - 22, String(PTS.hit), "#ff5a5a");
    burst(cam + playerX() + 6, pl.y - 8, ["#ffffff", "#ffd75a"], 8, 35);
    say(e.type === "puddle" ? "Ướt hết giày rồi!" : pick(OUCH), { follow: "groom", life: 1.1 });
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
  }

  // Hoa sữa petals and lá bàng drifting down (November in Hà Nội)
  function updateAmbient(dt) {
    if (state === "closed") return;
    const z = zoneAt(cam + PX).id;
    const rate = z === 1 ? 7 : 2.5;
    if (ambient.length < 40 && Math.random() < dt * rate) {
      const leaf = z !== 1 && Math.random() < 0.4;
      ambient.push({ x: Math.random() * (VW + 40), y: -4, vy: 10 + Math.random() * 10, ph: Math.random() * 6, c: leaf ? pick(["#d9622b", "#e07b39", "#c9a03a"]) : "#fffbe8", s: leaf ? 2 : 1 });
    }
    for (const a of ambient) { a.y += a.vy * dt; a.x -= (18 + Math.sin(t * 2 + a.ph) * 10) * dt; }
    ambient = ambient.filter((a) => a.y < GY + 4 && a.x > -6);
  }

  // ---------- Render ----------
  function drawCharacter(spr, x, y, alpha) {
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    lights = [];
    drawSky(t);
    drawSkyline();
    drawLake(t);
    drawHouses();
    if (night > 0) { ctx.globalAlpha = 0.3 * night; R(0, 0, VW, GY - 2, "#1d1440"); ctx.globalAlpha = 1; }
    drawLights();
    drawLakeFront(t);
    drawWires(t);
    drawLights();
    drawTrain();
    drawGround();
    const gx = Math.round(COURSE - cam);
    if (gx < VW + 90) { drawGate(gx, t); drawLights(); }

    // background lane: cameos cheering on the sidewalk
    for (const e of ents) {
      if (e.type !== "cameo") continue;
      const x = Math.round(e.x - cam);
      if (x < -16 || x > VW + 4) continue;
      const bob = Math.sin(t * 6 + e.x) > 0.6 ? -1 : 0;
      if (e.kind === "fan") {
        R(x + 10, GY - 30, 1, 22, "#6b4226");
        parts(x, GY, [[4, -36, 14, 7, "#ffffff"]]);
        ctx.drawImage(SPR.heart, x + 8, GY - 35);
        ctx.drawImage(SPR.fan, x, GY - 15 + bob);
      } else ctx.drawImage(SPR.auntie, x, GY - 17 + bob);
    }

    for (const e of ents) {
      const x = Math.round(e.x - cam);
      if (x > VW + 4) break;
      if (x < -46 || e.done || e.type === "cameo") continue;
      switch (e.type) {
        case "heart": {
          const spr = zoneAt(e.x).id === 1 ? SPR.hoasua : SPR.heart;
          ctx.drawImage(spr, x, Math.round(e.y + Math.sin(t * 4 + e.x) * 1));
          break;
        }
        case "lixi": ctx.drawImage(SPR.lixi, x, Math.round(e.y + Math.sin(t * 3 + e.x) * 1.5)); break;
        case "item": {
          const y = Math.round(e.y + Math.sin(t * 3 + e.x) * 1.5);
          ctx.globalAlpha = 0.35; disc(x + 4, y + 4, 6, "#fff3c4"); ctx.globalAlpha = 1;
          ctx.drawImage(SPR.items[e.kind], x, y);
          break;
        }
        case "power": {
          const y = Math.round(e.y + Math.sin(t * 4 + e.x) * 1.5);
          ctx.globalAlpha = 0.35; disc(x + 4, y + 3, 6, "#ffffff"); ctx.globalAlpha = 1;
          if (e.kind === "nonla") ctx.drawImage(SPR.nonla, x - 2, y + 1);
          else ctx.drawImage(SPR.helmet, x, y);
          break;
        }
        case "friend": {
          const wave = Math.floor(t * 4 + e.x) % 2;
          ctx.drawImage(wave ? SPR.friendA : SPR.friendB, x, GY - 16);
          break;
        }
        case "slime": {
          const hop = slimeHop(e), sp = SPR.slimes[e.kind], y = Math.round(GY - 8 - hop);
          if (e.kind === "manom") ctx.globalAlpha = 0.85;
          ctx.drawImage(hop > 0.5 ? sp.a : sp.b, x, y);
          ctx.globalAlpha = 1;
          if (e.kind === "ketxe") { R(x + 3, y - 2, 4, 2, "#3b7dd8"); R(x + 2, y - 1, 6, 1, "#2a5ba8"); }
          else if (e.kind === "muaphun") {
            R(x + 2, y - 6, 6, 2, "#ffffff"); R(x + 3, y - 7, 4, 1, "#ffffff");
            R(x + 3, y - 3 + Math.floor((t * 12) % 3), 1, 1, "#5a8fd6"); R(x + 6, y - 3 + Math.floor((t * 12 + 1) % 3), 1, 1, "#5a8fd6");
          } else { R(x - 1, y + 3 + Math.floor((t * 6) % 3), 1, 1, "#9fd3e0"); R(x + 10, y + 2 + Math.floor((t * 6 + 1) % 3), 1, 1, "#9fd3e0"); }
          break;
        }
        default: DRAW[e.type](x, e, t);
      }
    }

    // the bride's family waiting at the gate
    if (gx < VW + 90) {
      const happy = state === "celebrate" || state === "done";
      const hop = (k) => (happy ? Math.round(-Math.abs(Math.sin(hopT * 7 + k)) * 3) : 0);
      ctx.drawImage(SPR.bride, gx + BRIDE_X, GY - 18 + hop(0));
      if (gate.alpha > 0) {
        const block = state !== "gate" || gate.phase !== "open";
        const ch = gate.phase === "open" ? Math.round(-Math.abs(Math.sin(gate.t * 14)) * 3) : 0;
        COUSIN_X.forEach((cx) => drawCharacter(block ? SPR.cousinBlock : SPR.cousin, gx + cx, GY - 17 + ch, gate.alpha));
      }
      if (state === "gate" && gate.phase === "flatter") { // nịnh meter
        R(gx - 6, GY - 46, 30, 5, PAL.k); R(gx - 5, GY - 45, 28, 3, "#5a2a2a");
        R(gx - 5, GY - 45, Math.round(28 * gate.meter), 3, "#f48fb1");
      }
    }

    // the procession (đoàn nhà trai) behind the groom
    const px = Math.round(playerX());
    const moving = state === "run" || state === "arrive" || state === "enter";
    for (let i = followers - 1; i >= 0; i--) {
      const fxp = Math.min(px, gx + BLOCK_X) - 11 * (i + 1);
      const hy = yHist[Math.max(0, yHist.length - 1 - (i + 1) * 5)] || GY;
      const fr = moving && Math.floor(t * 10 + i) % 2 ? SPR.friendA : SPR.friendB;
      ctx.drawImage(fr, fxp, Math.round(hy - 16));
    }

    // the groom
    let spr;
    if (!pl.onGround) spr = SPR.jump;
    else if (!moving) spr = SPR.runB;
    else spr = Math.floor(t * 10) % 2 ? SPR.runA : SPR.runB;
    const gh = state === "celebrate" || state === "done" ? Math.round(-Math.abs(Math.sin(hopT * 7 + 1)) * 3) : 0;
    const gy = Math.round(pl.y - 16 + gh);
    if (!(invuln > 0 && Math.floor(t * 16) % 2)) {
      if (power.ride > 0) { // on a Grab bike
        if (power.ride > 1 || Math.floor(t * 8) % 2) {
          flipped(px - 7, 24, (ox) => drawBike(ox, { color: "#00b14f", load: "none" }));
          ctx.drawImage(SPR.groomTop, px, gy - 2);
          ctx.drawImage(SPR.helmet, px + 2, gy - 4);
        } else ctx.drawImage(spr, px, gy);
      } else ctx.drawImage(spr, px, gy);
      if (power.shield && power.ride <= 0) ctx.drawImage(SPR.nonla, px, gy - 3);
    }

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
      if (p.fly) { // lì xì flying to the cousins
        const k = clamp01(p.t / p.dur);
        ctx.drawImage(SPR.lixi, Math.round(p.x0 + (p.x1 - p.x0) * k - cam), Math.round(p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 14));
        continue;
      }
      const x = Math.round(p.x - cam), y = Math.round(p.y);
      if (p.heart) { ctx.globalAlpha = Math.min(1, p.life); ctx.drawImage(SPR.heart, x, y); ctx.globalAlpha = 1; }
      else if (p.hat) ctx.drawImage(SPR.nonla, x, y);
      else R(x, y, 1, 1, p.c);
    }
    for (const a of ambient) R(Math.round(a.x + Math.sin(t * 3 + a.ph) * 2), Math.round(a.y), a.s, a.s, a.c);
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      drawText(p.text, Math.round(p.x - cam), Math.round(p.y), p.color);
      ctx.globalAlpha = 1;
    }
    placeBubbles();
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
    const ah = Math.max(150, window.innerHeight - 200);
    let s = Math.min(aw / 180, ah / H, 3);
    if (s >= 2) s = Math.floor(s);
    VW = Math.max(180, Math.min(300, Math.floor(aw / s)));
    canvas.width = VW; canvas.height = H;
    canvas.style.width = VW * s + "px";
    canvas.style.height = H * s + "px";
    scale = s;
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- Open / close / input ----------
  function setMsg(html, light) { msgEl.innerHTML = html; msgEl.hidden = !html; msgEl.classList.toggle("light", !!light); }

  const START_MSG = '<b>Chạm để bắt đầu</b><span>Chạm để nhảy · chạm thêm lần nữa trên không để nhảy cao hơn<br>' +
    "Nhảy lên slime · gom đủ 5 lễ vật · nhặt lì xì để qua cổng nhà gái!</span>";

  function openGame() {
    overlay.hidden = false;
    document.body.classList.add("game-open");
    resultEl.hidden = true;
    fit();
    reset();
    state = "idle";
    setMsg(START_MSG);
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function closeGame() {
    overlay.hidden = true;
    document.body.classList.remove("game-open");
    cancelAnimationFrame(raf);
    state = "closed";
    clearBubbles(); clearDialog(); setHint("");
    refreshMini();
  }

  function onTap() {
    if (state === "idle") { state = "run"; setMsg(""); talk("groom", "Đi rước dâu thôi!"); return; }
    if (state === "paused") { state = "run"; setMsg(""); last = performance.now(); return; }
    if (state === "gate" && gate.phase === "flatter") {
      gate.meter = Math.min(1, gate.meter + 0.1);
      fx.push({ x: cam + walkX + 6 + (Math.random() - 0.5) * 8, y: GY - 18, vx: (Math.random() - 0.5) * 20, vy: -40, life: 0.9, heart: true });
      if (t - gate.lastTalk > 1.1) { gate.lastTalk = t; say(pick(COMPLIMENTS), { follow: "groom", life: 1.3 }); }
      if (gate.meter >= 1) { gate.bonus = "flatter"; setHint(""); openGate("Thôi được rồi, mời vào!"); }
      return;
    }
    if (state === "run" || state === "arrive" || state === "enter") jump();
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

  function bonusRows() {
    const rows = [];
    rows.push(gate.bonus === "lixi" ? ["Mở cổng bằng lì xì", PTS.gateLixi] : ["Nịnh qua cổng thành công", PTS.gateFlatter]);
    rows.push(["Rước được cô dâu", PTS.finish]);
    if (stats.hits === 0) rows.push(["Không vấp lần nào!", PTS.perfect]);
    return rows;
  }

  function showResult() {
    state = "done";
    clearDialog();
    const n = stats.items.length;
    const rows = [
      [`Slime hạ gục × ${stats.slimes}`, stats.slimes * PTS.slime],
      [`Tim & hoa sữa × ${stats.hearts}`, stats.hearts * PTS.heart],
      [`Lì xì × ${stats.lixi}`, stats.lixi * PTS.lixi],
      [`Lễ vật ${n}/${ITEM_ORDER.length}`, n * PTS.item],
    ];
    if (n === ITEM_ORDER.length) rows.push(["Đủ lễ!", PTS.fullSet]);
    rows.push([`Đội bê tráp × ${stats.friends}`, stats.friends * PTS.friend]);
    rows.push([`Vấp ngã × ${stats.hits}`, stats.hits * PTS.hit]);
    rows.push(...bonusRows());
    const score = Math.max(0, rows.reduce((s, r) => s + r[1], 0));
    const prevBest = Number(store.get("ruocdau_best")) || 0;
    const isBest = score > prevBest;
    if (isBest) store.set("ruocdau_best", score);

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
    $("grAgain").onclick = () => { resultEl.hidden = true; reset(); state = "idle"; setMsg(START_MSG); };
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
    pctx.drawImage(pvFrame % 2 ? SPR.friendA : SPR.friendB, 0, g - 16);
    pctx.drawImage(pvFrame % 2 ? SPR.runA : SPR.runB, 13, g - 16 - jumpY);
    pctx.drawImage(pvFrame % 4 < 2 ? SPR.slimes.ketxe.a : SPR.slimes.ketxe.b, 34, g - 8);
    pctx.drawImage(SPR.heart, 34, g - 22 + (pvFrame % 4 < 2 ? 0 : 1));
    pctx.drawImage(SPR.bride, w - 16, g - 18);
  }
  new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      clearInterval(pvTimer);
      if (en.isIntersecting) { drawPreview(); pvTimer = setInterval(drawPreview, 140); refreshMini(); }
    });
  }).observe(pv);

  setHint("");
  hud.groom.style.backgroundImage = `url(${SPR.runB.toDataURL()})`;
  hud.tray.innerHTML = ITEM_ORDER.map((k) => `<img src="${SPR.items[k].toDataURL()}" data-k="${k}" alt="${ITEMS[k].name}" title="${ITEMS[k].name}">`).join("");
  buildBackground();
  drawPreview();

  if (/[?&]debug\b/.test(location.search)) {
    window.__ruocDau = {
      get state() { return state; }, get stats() { return stats; }, get cam() { return cam; }, get pl() { return pl; },
      get ents() { return ents; }, get px() { return PX; }, get gate() { return gate; }, get followers() { return followers; },
      get power() { return power; }, get train() { return train; }, tap: onTap, open: openGame,
    };
  }
})();
