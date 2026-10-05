# Wedding Invitation

A Vietnamese-style digital wedding invitation (thiệp cưới online) that works on both phones and desktops. It's plain HTML, CSS and JavaScript with no build step, and it's hosted for free on GitHub Pages.

**Features:** an opening "Mở thiệp" screen · a Save the Date calendar · Nhà Trai / Nhà Gái families · personalized guest names in the link · solar and lunar dates · venue with directions · photo album with lightbox · timeline · RSVP saved to a Google Sheet · countdown · **music (YouTube or mp3) and floating hearts, which only start when the guest taps them** · **"Rước Dâu" pixel mini game with a leaderboard**.

## 1. Customize

Everything couple-specific is in **`config.js`**: names, parents, date, lunar date, venue, timeline, photos, music and the RSVP link. Edit that file and refresh the page.

- **Photos:** put the files in `assets/photos/` (e.g. `cover.jpg`, `1.jpg`, …) and list them in `config.js` under `coverPhoto` and `photos`. Portrait photos (3:4) look best. Resize them to about 1600px on the long side so the page loads fast on phones.
- **Music:** either a YouTube link `{ youtube: "<link>", start: 60 }` or a file `{ file: "assets/music/song.mp3", start: 0 }` (`start` is in seconds). Set `music: ""` to hide the button.
- **Mini game:** `game: { enabled: true, leaderboard: true }`. Set `enabled: false` to hide it.
- **Colors and fonts:** change the variables at the top of `css/style.css`.

## 2. Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000  and  http://localhost:8000/?to=Anh%20Minh
```

## 3. Personalized guest links

Add `?to=<name>` to the URL. The opening screen and the invitation then show that name:

```
https://anhducvu-bot.github.io/ducanh-minhha/?to=Anh%20Minh
https://anhducvu-bot.github.io/ducanh-minhha/?to=Gia%20đình%20cô%20Lan
```

Without `?to=`, the page shows "Quý khách".

## 4. RSVP + game leaderboard → Google Sheet (free)

1. Create a Google Sheet, then open **Extensions → Apps Script**.
2. Replace the code with the contents of `apps-script/Code.gs` and save.
3. Click **Deploy → New deployment → Web app**. Set *Execute as*: **Me** and *Who has access*: **Anyone**. Click Deploy and authorize.
4. Copy the Web app URL (it ends in `/exec`) into `config.js → sheetEndpoint`.
5. Submit a test RSVP. A new **RSVP** tab appears in the Sheet with the response.
6. Finish the mini game and tap **Lưu điểm**. A **Leaderboard** tab appears, and the top 10 (best score per name) show in the game and on the invitation.

If you change the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same. To remove the RSVP section, set `rsvp: false`. To delete a silly or fake leaderboard entry, just delete its row in the Leaderboard tab.

## 5. Mini game "Rước Dâu"

A pixel runner on a Hà Nội street. Tap anywhere to jump, tap again in the air to double-jump, and land on slimes to defeat them. Jump over motorbikes, phở carts and flower bicycles, collect hearts and lì xì, and reach Minh Hà at the "Vu Quy" gate. The course is the same for everyone, so the leaderboard is fair. Getting hit costs points but never ends the game.

Scoring: slime +100 · heart +20 · lì xì +50 · hit −50 · reaching the bride +1000 · no hits +500.

## 6. Deploy on GitHub Pages (free)

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**, set Source to **Deploy from a branch**, and choose Branch **main**, folder **/ (root)**.
3. Your site will be live at `https://anhducvu-bot.github.io/ducanh-minhha/` after a minute or two.

**After changing config.js, CSS or JS:** bump the `?v=…` number on those files in `index.html` (any new number works). Otherwise phones may keep showing an old saved copy:

```bash
V=$(date +%Y%m%d%H%M); sed -i '' -E "s/\?v=[0-9]+/?v=$V/g" index.html
```

## Files

```
index.html          page structure
config.js           ← edit this
css/style.css       theme + layout
js/main.js          renders content, calendar, gallery, countdown, guest name
js/effects.js       music + hearts buttons (opt-in)
js/rsvp.js          RSVP form submit
js/game.js          "Rước Dâu" pixel runner + leaderboard
js/nav.js           sticky section nav (Thiệp mời · Sự kiện · Album · Xác nhận · Game)
apps-script/Code.gs Google Sheet receiver (RSVP + leaderboard)
assets/photos/      photos (placeholders included)
assets/music/       background song
```
