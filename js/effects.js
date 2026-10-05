/* Music + hearts.
   - Tapping "Mở thiệp" sends up a wave of hearts and, if config.music.autoplay is on,
     starts the music (that tap is what lets phones play sound).
   - The music button stops / restarts it; the heart button sends more hearts. */
(function () {
  const W = window.WEDDING;
  const audio = document.getElementById("bgMusic");
  const musicBtn = document.getElementById("musicBtn");
  const heartBtn = document.getElementById("heartBtn");
  const layer = document.getElementById("heartsLayer");

  // ---------- Music ----------
  // config.music can be:  "path.mp3"  |  { file, start, autoplay }  |  { youtube, start, autoplay }
  const music = typeof W.music === "string" ? { file: W.music } : W.music || {};
  const start = Number(music.start) || 0;
  const setPlaying = (on) => {
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.setAttribute("aria-label", on ? "Tắt nhạc" : "Bật nhạc");
    musicBtn.title = on ? "Tắt nhạc" : "Bật nhạc";
  };
  const fail = (err) => {
    setPlaying(false);
    window.showToast && window.showToast("Không phát được nhạc 😢");
    console.warn("Music failed to play:", err);
  };

  // Each player exposes: play(quiet), pause(), playing(), audible()
  let player = null;
  if (music.youtube) player = setupYouTube(youtubeId(music.youtube));
  else if (music.file) player = setupAudioFile(music.file);
  else musicBtn.hidden = true;

  let userPaused = false;
  if (player) {
    musicBtn.addEventListener("click", () => {
      if (player.playing()) { userPaused = true; player.pause(); }
      else { userPaused = false; player.play(); }
    });
  }

  // "Mở thiệp": welcome hearts + start the music
  document.getElementById("openBtn").addEventListener("click", () => {
    burst(24);
    setTimeout(() => burst(16), 900);
    if (!player || !music.autoplay) return;
    player.play(true);
    // If the phone blocked it (e.g. the player was still loading), try once more
    // on the guest's next tap — unless they've already used the music button.
    const retry = (e) => {
      ["click", "touchend"].forEach((t) => document.removeEventListener(t, retry, true));
      if (e.target.closest && e.target.closest("#musicBtn")) return;
      if (!userPaused && !player.audible()) player.play(true);
    };
    setTimeout(() => ["click", "touchend"].forEach((t) => document.addEventListener(t, retry, true)), 0);
  });

  function setupAudioFile(src) {
    audio.src = src;
    let started = false;
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("ended", () => { audio.currentTime = start; audio.play(); });
    return {
      play(quiet) {
        if (!started && start) audio.currentTime = start;
        started = true;
        audio.play().catch((err) => (quiet ? console.warn("Autoplay blocked:", err) : fail(err)));
      },
      pause() { audio.pause(); },
      playing() { return !audio.paused; },
      audible() { return !audio.paused; },
    };
  }

  function youtubeId(url) {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : String(url);
  }

  // YouTube IFrame Player API. The player is created up front (hidden) so a tap
  // can call playVideo() directly — phones require that it happens inside the tap.
  function setupYouTube(videoId) {
    let yt = null, ready = false, wantPlay = false;
    const host = document.createElement("div");
    host.className = "yt-host";
    host.innerHTML = '<div id="ytPlayer"></div>';
    document.body.appendChild(host);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      prev && prev();
      yt = new YT.Player("ytPlayer", {
        width: 200, height: 200, videoId,
        playerVars: { start, playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
        events: {
          onReady: () => { ready = true; if (wantPlay) yt.playVideo(); },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) { yt.seekTo(start, true); yt.playVideo(); }
          },
          onError: (e) => fail("YouTube error " + e.data),
        },
      });
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => fail("Could not load YouTube");
    document.head.appendChild(s);

    const state = () => (ready ? yt.getPlayerState() : -1);
    return {
      play() { wantPlay = true; if (ready) yt.playVideo(); else setPlaying(true); },
      pause() { wantPlay = false; if (ready) yt.pauseVideo(); setPlaying(false); },
      playing() { return ready ? [YT.PlayerState.PLAYING, YT.PlayerState.BUFFERING].includes(state()) : wantPlay; },
      audible() { return ready && state() === YT.PlayerState.PLAYING; },
    };
  }

  // ---------- Hearts ----------
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#8e1b1b", "#b23a3a", "#d4546b", "#e88a9a", "#b8924a"];
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const MAX_HEARTS = 120;

  function spawnHeart() {
    if (layer.childElementCount >= MAX_HEARTS) return;
    const h = document.createElement("div");
    h.className = "heart";
    h.innerHTML = HEART;
    const size = 14 + Math.random() * 22;
    h.style.left = Math.random() * 100 + "%";
    h.style.setProperty("--size", size + "px");
    h.style.setProperty("--dur", 4 + Math.random() * 4 + "s");
    h.style.setProperty("--sway", 10 + Math.random() * 30 + "px");
    h.style.setProperty("--color", COLORS[(Math.random() * COLORS.length) | 0]);
    h.addEventListener("animationend", (e) => { if (e.target === h) h.remove(); });
    layer.appendChild(h);
  }

  function burst(n) {
    const count = reduced ? Math.min(n, 3) : n;
    for (let i = 0; i < count; i++) setTimeout(spawnHeart, i * 70);
  }

  // Tap = one burst. Press & hold = continuous stream while held.
  let holdTimer = null, streamTimer = null;
  const startHold = (e) => {
    if (e.button > 0) return;
    heartBtn.setAttribute("aria-pressed", "true");
    burst(12);
    holdTimer = setTimeout(() => {
      streamTimer = setInterval(() => burst(3), 180);
    }, 400);
  };
  const endHold = () => {
    clearTimeout(holdTimer);
    clearInterval(streamTimer);
    holdTimer = streamTimer = null;
    heartBtn.setAttribute("aria-pressed", "false");
  };
  heartBtn.addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) => heartBtn.addEventListener(t, endHold));
  heartBtn.addEventListener("contextmenu", (e) => e.preventDefault());
  // Keyboard users
  heartBtn.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); burst(12); }
  });
})();
