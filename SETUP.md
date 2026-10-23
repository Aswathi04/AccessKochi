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
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Host dashboard (`/host`) and admin queue (`/admin`) | Yes, for the host demo |
| `ADMIN_EMAILS` | Comma-separated emails that can approve venue claims | Yes, for the host demo |

After editing `.env.local`, stop the server (Ctrl+C) and run `npm run dev` again.

**Never commit `.env.local` or paste keys into screenshots.** It's already git-ignored. The service-role key can read and change everything in the database: keep it only in `.env.local`.

### Host dashboard setup (Supabase, once)

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and press **Run**. This creates the tables and the private `host-evidence` file bucket. After pulling an update, run the whole file again: it is safe to re-run and adds anything new (documents, visitor reports, insights, AI photo checks).
3. **Authentication → Sign In / Providers → Email**: keep Email enabled. Turn **Confirm email** on.
4. **Authentication → Emails → Magic Link** template: replace the body so it contains the code, for example `<p>Your AccessKochi code: <strong>{{ .Token }}</strong></p>`. Without `{{ .Token }}`, hosts get a link instead of a 6-digit code.
5. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key into `.env.local`. Put your own email in `ADMIN_EMAILS`.
6. Restart `npm run dev`.

Supabase's built-in email sends only a few emails per hour. That's enough for the demo; add your own SMTP (Authentication → Emails → SMTP settings) before real use.

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
8. **Host:** open the app → **Continue with email** → code → **I run a venue** → claim Periyar General Hospital (v01) with any photo as proof. Use an email that is not in `ADMIN_EMAILS`.
9. **Admin:** sign in with an `ADMIN_EMAILS` address → `/admin` → open the proof → **Approve**.
10. **Live status:** back on the host page, switch on **Lift out of order**. The preview turns red at once; within 15 seconds the hospital shows "Doesn't work for you: lift not working" in plans and on `/venue/v01`.
11. **Insights:** search on Browse as a wheelchair user, then open the host page's **Insights** tab: the skip is counted with its reason, and "Repair the lift" is the top fix. Switch the lift status off again.
12. **Documents:** on the **Documents** tab upload a lift licence with an expiry date. Approve it in `/admin` → **Documents**. The venue page shows it under **Documents on file**, and the host's lift answers count as backed.
13. **Visitor reports:** add a photo on a venue page (Help verify this place). The host sees it on the **Visitor reports** tab and replies; the reply shows on the venue page, and the verdict does not change.

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
