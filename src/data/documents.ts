// Documents a host can upload (agreed list: docs/host-dashboard-plan.md, section 4).
// tier "audit": checklist sections it covers become audit-track evidence.
// tier "doc": answers in the sections it covers count as backed (like a photo). Never shown as "certified".
export type DocKind = "access_audit" | "aic_audit" | "building_permit" | "occupancy_cert" | "completion_cert" | "lift_licence" | "fire_noc";

export interface DocKindInfo {
  label: string;
  label_ml: string;
  tier: "audit" | "doc";
  check: string; // what the admin checks
  sections?: string[]; // fixed sections; otherwise the host picks
  needsExpiry?: boolean;
}

export const DOC_KINDS: Record<DocKind, DocKindInfo> = {
  access_audit: {
    label: "Access audit report (HG chapter 8 format)", label_ml: "ആക്സസ് ഓഡിറ്റ് റിപ്പോർട്ട് (HG അധ്യായം 8)", tier: "audit",
    check: "Auditor's name and registration, audit date and scope. The sections the host ticked are really covered in the report.",
  },
  aic_audit: {
    label: "Accessible India Campaign audit (government buildings)", label_ml: "സുഗമ്യ ഭാരത് അഭിയാൻ ഓഡിറ്റ് (സർക്കാർ കെട്ടിടങ്ങൾ)", tier: "audit",
    check: "Same as an access audit: auditor, date, scope.",
  },
  building_permit: {
    label: "Approved building plan and permit", label_ml: "അംഗീകൃത കെട്ടിട പ്ലാനും പെർമിറ്റും", tier: "doc",
    check: "Permit and survey numbers; the address matches the venue. Proves designed dimensions only.",
  },
  occupancy_cert: {
    label: "Occupancy certificate", label_ml: "ഒക്യുപൻസി സർട്ടിഫിക്കറ്റ്", tier: "doc",
    check: "Issue date and address. Under RPwD Act s.44 an occupancy certificate needs the accessibility rules to be met.",
  },
  completion_cert: {
    label: "Architect or engineer completion certificate", label_ml: "ആർക്കിടെക്റ്റ്/എഞ്ചിനീയർ പൂർത്തീകരണ സർട്ടിഫിക്കറ്റ്", tier: "doc",
    check: "Architect or engineer registration number; built as approved.",
  },
  lift_licence: {
    label: "Lift licence and latest annual inspection (Electrical Inspectorate)", label_ml: "ലിഫ്റ്റ് ലൈസൻസും വാർഷിക പരിശോധനയും (ഇലക്ട്രിക്കൽ ഇൻസ്പെക്ടറേറ്റ്)", tier: "doc",
    check: "Licence number, last inspection date, expiry.", sections: ["lift"], needsExpiry: true,
  },
  fire_noc: {
    label: "Fire NOC", label_ml: "ഫയർ NOC", tier: "doc",
    check: "Expiry date; venue name and address match.", sections: ["info"], needsExpiry: true,
  },
};

export const NOT_ACCEPTED = "Not accepted: self-made certificates or stickers, paid badges without an audit, trade licence or GST (those only prove ownership).";
export const NOT_ACCEPTED_ML = "സ്വീകരിക്കില്ല: സ്വയം തയ്യാറാക്കിയ സർട്ടിഫിക്കറ്റുകൾ, സ്റ്റിക്കറുകൾ, ഓഡിറ്റില്ലാത്ത പണം നൽകി വാങ്ങുന്ന ബാഡ്ജുകൾ, ട്രേഡ് ലൈസൻസ്/GST (അവ ഉടമസ്ഥത മാത്രം തെളിയിക്കുന്നു).";
