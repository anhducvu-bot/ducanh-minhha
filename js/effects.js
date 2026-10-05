/* Opt-in effects: music toggle + hearts. Nothing happens until the guest taps a button. */
(function () {
  const W = window.WEDDING;
  const audio = document.getElementById("bgMusic");
  const musicBtn = document.getElementById("musicBtn");
  const heartBtn = document.getElementById("heartBtn");
  const layer = document.getElementById("heartsLayer");

  // ---------- Music ----------
  // config.music can be:  "path.mp3"  |  { file, start }  |  { youtube, start }
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

  if (music.youtube) {
    setupYouTube(youtubeId(music.youtube));
  } else if (music.file) {
    setupAudioFile(music.file);
  } else {
    musicBtn.hidden = true;
  }

  function setupAudioFile(src) {
    audio.src = src;
    let started = false;
    musicBtn.addEventListener("click", async () => {
      if (audio.paused) {
        try {
          if (!started && start) audio.currentTime = start;
          await audio.play();
          started = true;
        } catch (err) { fail(err); }
      } else {
        audio.pause();
      }
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("ended", () => { audio.currentTime = start; audio.play(); });
  }

  function youtubeId(url) {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : String(url);
  }

  // YouTube IFrame Player API. The player is created up front (hidden) so the
  // button click can call playVideo() directly — phones require that it happens
  // inside the tap itself.
  function setupYouTube(videoId) {
    let player = null, ready = false, wantPlay = false;
    const host = document.createElement("div");
    host.className = "yt-host";
    host.innerHTML = '<div id="ytPlayer"></div>';
    document.body.appendChild(host);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      prev && prev();
      player = new YT.Player("ytPlayer", {
        width: 200, height: 200, videoId,
        playerVars: { start, playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
        events: {
          onReady: () => { ready = true; if (wantPlay) player.playVideo(); },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) { player.seekTo(start, true); player.playVideo(); }
          },
          onError: (e) => fail("YouTube error " + e.data),
        },
      });
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => fail("Could not load YouTube");
    document.head.appendChild(s);

    musicBtn.addEventListener("click", () => {
      if (!ready) {
        // API still loading — start as soon as it's ready
        wantPlay = !wantPlay;
        setPlaying(wantPlay);
        return;
      }
      const st = player.getPlayerState();
      if (st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING) player.pauseVideo();
      else player.playVideo();
    });
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
