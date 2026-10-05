/* Sticky section nav: tap to jump, underline follows the section being read. */
(function () {
  const nav = document.getElementById("siteNav");
  const links = [...nav.querySelectorAll("a")];

  // Drop tabs whose section is turned off in config (e.g. rsvp: false, game disabled)
  const items = links
    .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
    .filter(({ a, el }) => {
      const ok = el && !el.hidden;
      if (!ok) a.remove();
      return ok;
    });

  items.forEach(({ a, el }) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  let current = null;
  function setActive(item) {
    if (item === current) return;
    if (current) current.a.removeAttribute("aria-current");
    current = item;
    item.a.setAttribute("aria-current", "true");
    // keep the active tab visible when the bar scrolls sideways on narrow phones
    const left = item.a.offsetLeft - (nav.clientWidth - item.a.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  let ticking = false;
  function update() {
    ticking = false;
    const line = nav.offsetHeight + 80;
    let active = items[0];
    for (const it of items) if (it.el.getBoundingClientRect().top <= line) active = it;
    setActive(active);
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
