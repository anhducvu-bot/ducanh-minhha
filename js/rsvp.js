/* RSVP → Google Apps Script Web App → Google Sheet (see apps-script/Code.gs). */
(function () {
  const W = window.WEDDING;
  const section = document.getElementById("xac-nhan");
  const form = document.getElementById("rsvpForm");
  const status = document.getElementById("rsvpStatus");

  if (W.rsvp === false) {
    section.hidden = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!W.sheetEndpoint) {
      status.textContent = "RSVP chưa được kết nối — xem README để cài Google Sheet.";
      return;
    }
    const name = form.elements.name.value.trim();
    if (!name) {
      status.textContent = "Vui lòng nhập tên của bạn.";
      form.elements.name.focus();
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    status.textContent = "Đang gửi...";

    const data = new FormData(form);
    data.append("type", "rsvp");
    data.append("guestLink", new URLSearchParams(location.search).get("to") || "");

    try {
      // no-cors: Apps Script doesn't return CORS headers; the request still arrives.
      await fetch(W.sheetEndpoint, { method: "POST", mode: "no-cors", body: data });
      form.classList.add("done");
      try { localStorage.setItem("guestName", name); } catch (_) {} // prefill for the game leaderboard
      status.textContent =
        data.get("attending") === "Có"
          ? "Cảm ơn bạn! Hẹn gặp bạn trong ngày vui 💕"
          : "Cảm ơn bạn đã phản hồi. Chúng mình rất trân quý sự quan tâm của bạn!";
    } catch (err) {
      console.error(err);
      status.textContent = "Gửi không thành công, vui lòng thử lại.";
      btn.disabled = false;
    }
  });
})();
