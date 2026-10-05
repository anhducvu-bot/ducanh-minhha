/*
 * ============================================================
 *  WEDDING CONFIG — edit this file to customize the invitation.
 *  Everything couple-specific lives here; no need to touch HTML.
 * ============================================================
 */
window.WEDDING = {
  groom: {
    name: "Đức Anh",            // shown in script font
    shortName: "Đức Anh",
  },
  bride: {
    name: "Minh Hà",
    shortName: "Minh Hà",
  },

  // Parents — shown in the "Nhà Trai / Nhà Gái" section
  groomFamily: {
    father: "Ông. Vũ Tự Cường",
    mother: "Bà. Phạm Thanh Nga",
    address: "Hà Nội",
  },
  brideFamily: {
    father: "Ông. Nguyễn Bội Hồng Minh",
    mother: "Bà. Nguyễn Mai Hương",
    address: "Hà Nội",
  },

  // Reception date/time, local time (YYYY-MM-DDTHH:mm)
  date: "2026-11-28T11:30",
  // Lunar date text (Âm lịch) — write it yourself, e.g. from a lunar calendar
  lunarDate: "Tức ngày 20 tháng 10 năm Bính Ngọ",

  venue: {
    name: "Promes Center",
    hall: "Tầng 3",               // TODO: replace with the hall name (Marigold / Camellia / Peony) once known
    address: "122–124 Xuân Thủy, Cầu Giấy, Hà Nội",
    // "Chỉ đường" button link (Google Maps)
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Promes+Center+122+Xu%C3%A2n+Th%E1%BB%A7y+C%E1%BA%A7u+Gi%E1%BA%A5y+H%C3%A0+N%E1%BB%99i",
    // Optional embedded map: Google Maps → Share → Embed a map → copy the src="..." URL. Leave "" to hide.
    mapEmbed: "",
  },

  // Default guest greeting; personalize with a link like  ?to=Anh%20Minh
  defaultGuest: "Quý khách",

  timeline: [
    // DRAFT — adjust once the real schedule is known
    { time: "10:30", title: "Đón khách & chụp ảnh" },
    { time: "11:30", title: "Lễ thành hôn" },
    { time: "12:00", title: "Khai tiệc" },
    { time: "12:45", title: "Giao lưu & âm nhạc" },
    { time: "13:30", title: "Tiễn khách" },
  ],

  // Photos (put files in assets/photos/). First one is used on the cover.
  coverPhoto: "assets/photos/cover.jpeg",
  photos: [
    "assets/photos/1.jpeg",
    "assets/photos/2.jpeg",
    "assets/photos/3.jpeg",
    "assets/photos/4.jpeg",
    "assets/photos/5.jpeg",
  ],

  // Background music — only plays when the guest taps the music button.
  // YouTube:  { youtube: "<link>", start: <seconds> }
  // MP3 file: { file: "assets/music/song.mp3", start: <seconds> }   ·   "" = hide the button
  music: {
    youtube: "https://www.youtube.com/watch?v=l_uzEREOKfo", // Thế Giới Của Anh
    start: 60,
  },

  // Google Sheet connection — used by BOTH the RSVP form and the game leaderboard.
  // Paste your Google Apps Script Web App URL here (see README). "" = not connected yet.
  sheetEndpoint: "",

  rsvp: true, // false = hide the RSVP section

  // Mini game "Rước Dâu" (pixel runner). false = hide it.
  game: {
    enabled: true,
    leaderboard: true, // top scores saved to the Google Sheet above
  },

  thankYou:
    "Sự hiện diện của quý vị chính là món quà ý nghĩa nhất đối với chúng tôi. " +
    "Rất mong được cùng quý vị chia sẻ niềm hạnh phúc trong ngày trọng đại này.",
};
