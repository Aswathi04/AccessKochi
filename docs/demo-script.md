# Demo script

All venues are **demo data** (fictional names, dummy accessibility details; metro station names are real). Results below are for the default start, **Edappally**. Scenarios A–F are checked by `tests/demo.test.ts`.

## Before you start
1. Open `/api/health`: the AI (Neysa) and voice (Sarvam) must show as configured. Without the AI, Malayalam falls back to keyword matching, which is weaker.
2. Profile tab: **I use a wheelchair**, starting area **Edappally**.
3. Plan tab. To start a new conversation, tap **New plan**. Until then, each message adds to the same trip.

## Hero (3 minutes)
| Say | What happens |
|---|---|
| *What theatres can I go to near Edappally?* (or *ഇടപ്പള്ളിയിൽ ഏതൊക്കെ തിയേറ്ററുകളിൽ പോകാം?*) | **Edappally Cineplex** works for you; other options Kakkanad Infopark Screens (works) and Kaloor Cinemas (mostly works). Skips Palarivattom Star Talkies: 4 steps, no ramp. Asks "Anything else you'd like to do on this trip?" |
| *Grocery shopping too* (or *പലചരക്ക് സാധനങ്ങളും വാങ്ങണം*, or tap the chip) | Cineplex + **Edappally Daily Supermarket**, about 0.2 km apart, both work. Skips Edappally Corner Stores (one step, narrow door), though it is closer. |

## More to try
| # | Say or do | What happens |
|---|---|---|
| 1 | *Edappally to the General Hospital, lunch nearby, home by metro* / *ഇടപ്പള്ളിയിൽ നിന്ന് ജനറൽ ആശുപത്രി, പിന്നെ അടുത്ത് ഊണ്, മെട്രോയിൽ വീട്ടിലേക്ക്* | Hospital, MG Road Bistro, MG Road Metro: all work. Skips Kaloor Coffee House (3 steps). |
| 2 | *Wedding reception, which hall works for me?* / *കല്യാണത്തിന് ഏത് ഓഡിറ്റോറിയം പറ്റും?* | Vyttila Pearl works; Palarivattom Royal Hall as another option. Skips Kakkanad Grand: no lift to the dining hall. |
| 3 | Ask #2's Kakkanad hall directly, then switch the profile to **crutches** and ask again: *Wedding at the Kakkanad auditorium, then home by metro* | Wheelchair: problems (dining hall upstairs, no lift). Crutches: mostly works. |
| 4 | *Shopping at a mall, then dinner on MG Road, home by metro* | Lake Mall, MG Road Bistro, MG Road Metro: all work. |
| 5 | *കാക്കനാട് ബിരിയാണി കഴിക്കണം, പിന്നെ കളക്ടറേറ്റിൽ പോകണം* (profile **low stamina**) | Kakkanad Biryani Point and the District Office both work. |
| 6 | *കലൂരിൽ സിനിമ കാണണം* | Kaloor Cinemas mostly works: 400 m walk from the drop-off. |
| 7 | *Check-up at Kakkanad Medical Centre* | Host says the ramp is fine, a visitor's tilt reading says 1:8: the app shows both and offers Call. |
| 8 | *I need to renew my Aadhaar at the Kaloor Akshaya centre* | Step-free entrance, but the counter is upstairs with no lift. |
| 9 | *Mosque in Kaloor* | Unconfirmed, call ahead. The app does not guess. |
| 10 | *Water metro from Vyttila* | Mostly works: ramp slippery when wet. |
| 11 | *Temple in Thrippunithura*: wheelchair, then low stamina | Problems (2 steps, no ramp), then mostly works (handrail). |
| 12 | Host: switch **Lift out of order** on at Periyar General Hospital, then ask #1 again | "Lift not working" appears straight away. Then open the host's **Insights** tab. |
| 13 | Venue page → **Help verify**: ramp photo, no reference, then with an A4 sheet | Confidence Low, then Medium. Photos can come from the camera or the gallery. |
| 14 | Browse → "show places that don't work for me" | Hidden places appear, each with its reason. |
| 15 | Header → **മലയാളം** | The whole app, host pages included, switches language. |

## Avoid
- Places that fail everywhere (Marine Drive shopping): true, but a negative demo.
- Saying a venue's name when you mean a type ("Tea & Snacks"): the AI then treats it as your destination.

## Demo venues
| ID | Name | Type | Area | Wheelchair | Crutches | Low stamina | Main reason (wheelchair) |
|---|---|---|---|---|---|---|---|
| v01 | Periyar General Hospital | hospital | Ernakulam North | ✅ works | ✅ works | ✅ works |  |
| v02 | Kakkanad Medical Centre | hospital | Kakkanad | ❌ problems | ❌ problems | ✅ works | ramp about 1:8, steeper than 1:12 |
| v03 | Edappally Family Clinic | hospital | Edappally | ❔ unconfirmed | 🟡 mostly | 🟡 mostly | unconfirmed: accessible toilet |
| v04 | Kakkanad Grand Convention Centre | auditorium | Kakkanad | ❌ problems | 🟡 mostly | 🟡 mostly | no lift to the Dining hall (floor 1) |
| v05 | Vyttila Pearl Auditorium | auditorium | Vyttila | ✅ works | ✅ works | ✅ works |  |
| v06 | Palarivattom Royal Hall | auditorium | Palarivattom | 🟡 mostly | ✅ works | ✅ works | toilet door opens inward |
| v07 | Kaloor Coffee House | restaurant | Kaloor | ❌ problems | ❌ problems | 🟡 mostly | 3 step(s) at the entrance, no ramp |
| v08 | Vyttila Spice Kitchen | restaurant | Vyttila | ❔ unconfirmed | 🟡 mostly | 🟡 mostly | unconfirmed: accessible toilet |
| v09 | Kakkanad Biryani Point | restaurant | Kakkanad | ✅ works | ✅ works | ✅ works |  |
| v10 | MG Road Bistro | restaurant | MG Road | ✅ works | ✅ works | ✅ works | unconfirmed: doorstep height, entrance door width |
| v11 | Edappally Tea & Snacks | restaurant | Edappally | ❌ problems | ❌ problems | 🟡 mostly | 1 step(s) at the entrance, no ramp |
| v12 | Edappally Lake Mall | mall | Edappally | ✅ works | ✅ works | ✅ works |  |
| v13 | Marine Drive Shopping Arcade | mall | Marine Drive | ❌ problems | ❌ problems | ❌ problems | lift not working (reported 2026-10-18) |
| v14 | Kadavanthra Fresh Mart | grocery | Kadavanthra | ❌ problems | 🟡 mostly | 🟡 mostly | 2 step(s) at the entrance, no ramp |
| v15 | Kaloor Cinemas | theatre | Kaloor | 🟡 mostly | 🟡 mostly | 🟡 mostly | 400 m from the drop-off to the entrance (your limit 300 m) |
| v16 | Edappally Metro Station | metro | Edappally | ✅ works | ✅ works | ✅ works |  |
| v17 | Vyttila Metro Station | metro | Vyttila | ✅ works | ✅ works | ✅ works |  |
| v18 | Palarivattom Metro Station | metro | Palarivattom | ❔ unconfirmed | 🟡 mostly | 🟡 mostly | unconfirmed: whether the lift is working, lift size |
| v19 | MG Road Metro Station | metro | MG Road | ✅ works | ✅ works | ✅ works |  |
| v20 | Vyttila Water Metro Terminal | water metro | Vyttila | 🟡 mostly | 🟡 mostly | ✅ works | ramp surface slippery when wet |
| v21 | District Office Complex, Kakkanad | government | Kakkanad | ❌ problems | ❌ problems | ✅ works | ramp blocked or locked |
| v22 | Edappally Village Office | government | Edappally | ❌ problems | ❌ problems | 🟡 mostly | 3 step(s) at the entrance, no ramp |
| v23 | Akshaya Centre, Kaloor | government | Kaloor | ❌ problems | 🟡 mostly | 🟡 mostly | no lift to the Service counter (floor 1) |
| v24 | Thrippunithura Devi Temple | worship | Thrippunithura | ❌ problems | 🟡 mostly | 🟡 mostly | 2 step(s) at the entrance, no ramp |
| v25 | St. Mary's Heritage Church, Fort Kochi | worship | Fort Kochi | ❌ problems | 🟡 mostly | 🟡 mostly | raised doorstep about 75 mm (max 12 mm) |
| v26 | Kaloor Juma Masjid | worship | Kaloor | ❔ unconfirmed | 🟡 mostly | 🟡 mostly | unconfirmed: accessible toilet |
| v27 | Fort Kochi Heritage Homestay | tourism | Fort Kochi | ❌ problems | ❌ problems | 🟡 mostly | 3 step(s) at the entrance, no ramp |
| v28 | Marine Drive Walkway Café | restaurant | Marine Drive | ❌ problems | ❌ problems | 🟡 mostly | 2 step(s) at the entrance, no ramp |
| v29 | Edappally Cineplex | theatre | Edappally | ✅ works | ✅ works | ✅ works |  |
| v30 | Palarivattom Star Talkies | theatre | Palarivattom | ❌ problems | ❌ problems | 🟡 mostly | 4 step(s) at the entrance, no ramp |
| v31 | Kakkanad Infopark Screens | theatre | Kakkanad | ✅ works | ✅ works | ✅ works |  |
| v32 | Edappally Daily Supermarket | grocery | Edappally | ✅ works | ✅ works | ✅ works |  |
| v33 | Edappally Corner Stores | grocery | Edappally | ❌ problems | ❌ problems | 🟡 mostly | 1 step(s) at the entrance, no ramp |
| v34 | Palarivattom FreshCart | grocery | Palarivattom | ✅ works | ✅ works | ✅ works |  |
