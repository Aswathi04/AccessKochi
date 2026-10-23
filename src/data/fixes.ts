// Suggested fixes for host insights, matched against the matcher's reason text.
// Costs are rough assumed ranges (Kerala, 2026), not quotes: the UI says so. Edit here, not in code.
export interface Fix { match: RegExp; fix: string; fix_ml: string; cost: string; rank: number } // rank: 1 = cheapest

export const FIXES: Fix[] = [
  { match: /ramp blocked/, fix: "Keep the ramp clear and unlocked (staff routine)", fix_ml: "റാമ്പ് തടസ്സമില്ലാതെയും തുറന്നും സൂക്ഷിക്കുക", cost: "Free", rank: 0 },
  { match: /lift not working/, fix: "Repair the lift, and set its live status while it is down", fix_ml: "ലിഫ്റ്റ് നന്നാക്കുക; കേടായിരിക്കുമ്പോൾ ലൈവ് സ്റ്റാറ്റസ് ഇടുക", cost: "Varies", rank: 0 },
  { match: /raised doorstep/, fix: "Bevel or remove the raised doorstep (12 mm max)", fix_ml: "വാതിൽപ്പടി ചരിച്ചോ മാറ്റിയോ 12 mm-ൽ താഴെയാക്കുക", cost: "₹1,000–5,000", rank: 1 },
  { match: /parking/, fix: "Mark an accessible bay, 3600 mm wide, within 30 m of the entrance", fix_ml: "പ്രവേശനത്തിന് 30 m-നുള്ളിൽ 3600 mm വീതിയുള്ള പാർക്കിംഗ് അടയാളപ്പെടുത്തുക", cost: "₹2,000–10,000", rank: 1 },
  { match: /grab bar/, fix: "Fit grab bars on both sides of the WC", fix_ml: "WC-യുടെ ഇരുവശത്തും ഗ്രാബ് ബാറുകൾ ഘടിപ്പിക്കുക", cost: "₹3,000–12,000", rank: 1 },
  { match: /seats about every|seating in queues|armrests/, fix: "Add seats with backrests and armrests along the route and in queues", fix_ml: "വഴിയിലും ക്യൂവിലും കൈവരിയുള്ള ഇരിപ്പിടങ്ങൾ വയ്ക്കുക", cost: "₹3,000–15,000 per seat", rank: 1 },
  { match: /space beside the WC/, fix: "Clear 900 mm beside the WC (move the bin or basin)", fix_ml: "WC-യുടെ അരികിൽ 900 mm ഒഴിവാക്കുക", cost: "₹0–20,000", rank: 1 },
  { match: /ramp has no handrails|handrail on one side/, fix: "Fit handrails on both sides of the ramp, 750–900 mm high", fix_ml: "റാമ്പിന്റെ ഇരുവശത്തും 750–900 mm ഉയരത്തിൽ കൈവരി", cost: "₹8,000–30,000", rank: 2 },
  { match: /slippery|loose surface/, fix: "Non-slip surface on the ramp", fix_ml: "റാമ്പിൽ വഴുക്കാത്ത പ്രതലം", cost: "₹5,000–25,000", rank: 2 },
  { match: /toilet door/, fix: "Rehang the toilet door to open outward or slide, 900 mm clear", fix_ml: "ശൗചാലയ വാതിൽ പുറത്തേക്ക് തുറക്കുന്നതോ സ്ലൈഡിംഗോ ആക്കുക, 900 mm", cost: "₹5,000–25,000", rank: 2 },
  { match: /Indian-style WC/, fix: "Install a western WC, seat 450–480 mm", fix_ml: "450–480 mm ഉയരമുള്ള വെസ്റ്റേൺ WC സ്ഥാപിക്കുക", cost: "₹8,000–25,000", rank: 2 },
  { match: /steps on the path from the drop-off/, fix: "Kerb ramp or ramp on the approach path", fix_ml: "വരുന്ന വഴിയിൽ റാമ്പ്", cost: "₹10,000–60,000", rank: 2 },
  { match: /step\(s\) at the entrance/, fix: "Ramp beside the entrance steps (1:12 or gentler, handrails both sides)", fix_ml: "പ്രവേശന പടികൾക്കരികിൽ റാമ്പ് (1:12 അല്ലെങ്കിൽ കുറഞ്ഞ ചരിവ്, ഇരുവശവും കൈവരി)", cost: "₹8,000–25,000 portable; ₹25,000–1,50,000 built", rank: 3 },
  { match: /entrance door about/, fix: "Widen the entrance door to 900 mm clear", fix_ml: "പ്രവേശന വാതിൽ 900 mm ആക്കി വീതികൂട്ടുക", cost: "₹15,000–60,000", rank: 3 },
  { match: /revolving|turnstile/, fix: "Add a 900 mm swing door beside it", fix_ml: "അരികിൽ 900 mm സാധാരണ വാതിൽ", cost: "₹20,000–80,000", rank: 3 },
  { match: /surface on the approach|monsoon/, fix: "Repave the approach with a firm, non-slip surface and fix drainage", fix_ml: "വഴി ഉറച്ച, വഴുക്കാത്ത പ്രതലമാക്കുക; വെള്ളക്കെട്ട് മാറ്റുക", cost: "₹20,000–1,50,000", rank: 3 },
  { match: /ramp about 1:|ramp run about/, fix: "Rebuild the ramp to a gentler slope, or add landings (HG Table 3.4)", fix_ml: "റാമ്പിന്റെ ചരിവ് കുറയ്ക്കുക, അല്ലെങ്കിൽ ഇടയ്ക്ക് ലാൻഡിംഗ് (HG പട്ടിക 3.4)", cost: "₹40,000–2,00,000", rank: 4 },
  { match: /toilet about .* mm/, fix: "Enlarge the accessible toilet to 2200 × 2000 mm", fix_ml: "ശൗചാലയം 2200 × 2000 mm ആക്കി വലുതാക്കുക", cost: "₹1,00,000–3,00,000", rank: 4 },
  { match: /no accessible toilet/, fix: "Build an accessible toilet (HG 2200 × 2000 mm)", fix_ml: "പ്രവേശനക്ഷമമായ ശൗചാലയം നിർമ്മിക്കുക (HG 2200 × 2000 mm)", cost: "₹1,50,000–4,00,000", rank: 4 },
  { match: /no lift|lift car|lift door/, fix: "Lift or platform lift to the upper floors", fix_ml: "മുകൾ നിലകളിലേക്ക് ലിഫ്റ്റ്/പ്ലാറ്റ്ഫോം ലിഫ്റ്റ്", cost: "₹6,00,000–20,00,000", rank: 5 },
];
