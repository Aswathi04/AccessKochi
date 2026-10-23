# AccessKochi: starter guide

Get the app running on the laptop in about 10 minutes.

## 1. Install

1. Install **Node.js 20 or newer** from https://nodejs.org (LTS).
2. Unzip `accesskochi.zip` and open the `accesskochi` folder in **VS Code** (File > Open Folder).
3. Open the terminal in VS Code (View > Terminal) and run:

```bash
npm install
npm test        # 29 tests should pass
npm run dev     # starts the app
```

4. Open **http://localhost:3000** in Chrome.

## 2. Keys

`.env.local` is already in the folder with the Neysa endpoint and key filled in. Add the others when you have them:

| Key | Used for | Needed for the demo? |
| --- | --- | --- |
| `NEYSA_API_KEY` | Agent (understands requests, writes the summary) and photo reading | Yes (already filled) |
| `SARVAM_API_KEY` | Malayalam voice, first choice | Yes, for voice |
| `GEMINI_API_KEY` | Voice backup | Optional |
| `OPENAI_API_KEY` | Backup for agent, photos and English voice | Optional |
| `SERPAPI_API_KEY` | Real Google venues (not wired yet) | No |

After editing `.env.local`, stop the server (Ctrl+C) and run `npm run dev` again.

**Never commit `.env.local` or paste keys into screenshots.** It's already git-ignored.

## 3. Check everything is connected

Open **http://localhost:3000/api/health**. You want to see:

- `neysa.reachable: true`
- `neysa_model_matches: true` (if `false`, copy one of the ids in `neysa.models` into `NEYSA_MODEL` in `.env.local`)
- `asr.sarvam: true` once the Sarvam key is in

## 4. Click through the demo

1. **Home:** pick Malayalam or English, enter a name, pick **"I use a wheelchair"**, pick Kakkanad, then tap **Start planning**.
2. **Plan your day:** tap the first example chip ("Wedding at the Kakkanad auditorium, then home by metro").
   - Stop 1: Kakkanad Grand Convention Centre: **Doesn't work for you**, "no lift to the Dining hall (floor 1)", toilet **unconfirmed, call ahead**.
   - Stop 2: Edappally Metro Station: **Works for you**, lift working.
3. Tap **View details** on stop 1: the verdict, host vs visitor columns, the separate **Google says** box.
4. Go back and try the second chip (hospital, lunch, metro). Kaloor Coffee House appears under **Skipped, and why**.
5. **Voice:** tap **Speak**, say the wedding request in Malayalam, tap **Stop**.
6. **Photo:** on any venue page, under **Help verify this place**, choose Ramp, Reference "None", take a photo, then **Read photo**: confidence **Low**. Try again with an A4 sheet in frame and Reference "A4 sheet": **Medium**.
7. **Browse:** the venue list ranked for the profile, with the "show places that don't work for me" toggle.

## Useful links while running

- http://localhost:3000/api/venues?profile=wheelchair
- http://localhost:3000/api/venues/v04?profile=wheelchair
- add `&companion=with_companion` to see the "possible with help" rule

## If something breaks

| Problem | Fix |
| --- | --- |
| `npm` not found | Install Node.js, then reopen VS Code |
| Port 3000 busy | `npm run dev -- -p 3001` |
| Plan works but says "parsed: keywords" | Neysa isn't answering: check `/api/health`. The app still works without it. |
| Photo reading error | Check `/api/health`; make sure `NEYSA_MODEL` matches; photos must be under 8 MB |
| Voice says "Couldn't hear that" | Allow the microphone in Chrome; check `SARVAM_API_KEY`; type instead |
| Mic doesn't work on a phone over Wi-Fi | Browsers only allow the mic on `localhost` or HTTPS. Demo from the laptop. |
