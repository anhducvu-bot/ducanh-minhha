/*
 * ============================================================
 *  WEDDING CONFIG — edit this file to customize the invitation.
 *  Everything couple-specific lives here; no need to touch HTML.
 * ============================================================
 */
window.WEDDING = {
  groom: {
    name: "Đức Anh",            // shown in script font
  },
  bride: {
    name: "Minh Hà",
  },

  // Parents — shown in the "Nhà Trai / Nhà Gái" section
  groomFamily: {
    father: "Ông Vũ Tự Cường",
    mother: "Bà Phạm Thanh Ngà",
    address: "Hà Nội",
  },
  brideFamily: {
    father: "Ông Nguyễn Bội Hồng Minh",
    mother: "Bà Nguyễn Mai Hương",
    address: "Hà Nội",
  },

  // Reception date/time, local time (YYYY-MM-DDTHH:mm)
  date: "2026-11-28T11:00",
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
    { time: "10:30", title: "Đón khách" },
    { time: "11:00", title: "Lễ thành hôn" },
    { time: "11:15", title: "Khai tiệc" },
    { time: "11:30", title: "Giao lưu" },
  ],

  // Photos (put files in assets/photos/). First one is used on the cover.
  coverPhoto: "assets/photos/cover.jpg",
  coverText: "top", // where the names sit on the cover photo: "top" or "bottom"
  // Each entry is a path, or { src, focus } where focus ("50% 80%" = horizontal, vertical)
  // chooses which part of the photo stays visible when the album crops it.
  photos: [
    "assets/photos/1.jpeg",
    "assets/photos/2.jpeg",
    { src: "assets/photos/e4dd95c6-e6df-4d43-83a2-c9cfc3f591a7.jpeg", focus: "50% 85%" },
    "assets/photos/4.jpeg",
    "assets/photos/40ec6469-097e-46b4-a1e3-f2c947498edb.jpeg",
    { src: "assets/photos/d5e1ceea-3689-44cc-a8f5-9c7bc2ef066d.jpeg", focus: "50% 80%" },
  ],

  // Background music. With autoplay: true it starts when the guest taps "Mở thiệp";
  // the music button stops / restarts it.
  // YouTube:  { youtube: "<link>", start: <seconds>, autoplay: true }
  // MP3 file: { file: "assets/music/song.mp3", start: <seconds>, autoplay: true }   ·   "" = no music
  music: {
    youtube: "https://www.youtube.com/watch?v=iltEHB23BgE", // Thế Giới Của Anh (Piano Version) — LaKi cover
    start: 0,
    autoplay: true,
  },

  // Google Sheet connection for the RSVP form.
  // Paste your Google Apps Script Web App URL here (see README). "" = not connected yet.
  sheetEndpoint: "https://script.google.com/macros/s/AKfycbz-mYpp_JBeA7AaNcBh4NfBQWyNxN2PI3RR2CNFuECvkCGD0WHAFZsFCCdfhg46Gafb/exec",

  rsvp: true, // false = hide the RSVP section

  // Mini game "Rước Dâu" (pixel runner). false = hide it.
  game: {
    enabled: true,
  },

  thankYou:
    "Sự hiện diện của quý vị chính là món quà ý nghĩa nhất đối với chúng tôi. " +
    "Rất mong được cùng quý vị chia sẻ niềm hạnh phúc trong ngày trọng đại này.",
};
