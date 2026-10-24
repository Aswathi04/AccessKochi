"use client";
// Email-code sign-in (Supabase OTP); the same form signs up new emails. The email template must include {{ .Token }} (see SETUP.md).
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { useSettings } from "@/lib/settings";
import { Card, PrimaryButton } from "./ui";

const COOLDOWN = 60; // seconds between codes; protects the Gmail SMTP sending limit

export function AuthForm() {
  const { t } = useSettings();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async () => {
    setBusy(true); setError(null);
    const { error } = await browserClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message); else { setSent(true); setWait(COOLDOWN); }
  };
  const verify = async () => {
    setBusy(true); setError(null);
    const { error } = await browserClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-medium">{t("signin_title")}</h1>
      <p className="mt-1 text-muted">{t("signin_d")}</p>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (sent) verify(); else send(); }}>
        {!sent ? (
          <>
            <label className="block text-sm font-medium" htmlFor="auth-email">{t("email")}</label>
            <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line px-4 text-lg" />
          </>
        ) : (
          <>
            <p role="status">{t("code_sent")} <strong className="break-all">{email.trim()}</strong></p>
            <label className="block text-sm font-medium" htmlFor="auth-code">{t("code_label")}</label>
            <input id="auth-code" inputMode="numeric" autoComplete="one-time-code" required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="min-h-12 w-full rounded-xl border border-line px-4 text-2xl tracking-widest" />
          </>
        )}
        {error && <p className="text-bad" role="alert">{error}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={busy || !email || (sent && code.length < 6)}>
          {busy ? t("wait") : sent ? t("verify") : t("send_code")}
        </PrimaryButton>
        {sent && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="min-h-11 text-sm font-medium text-brand" onClick={() => { setSent(false); setCode(""); setError(null); }}>{t("edit_email")}</button>
            <button type="button" className="min-h-11 text-sm font-medium text-brand disabled:text-muted" disabled={busy || wait > 0} onClick={send}>
              {wait > 0 ? `${t("resend_in")} ${wait}s` : t("resend")}
            </button>
          </div>
        )}
      </form>
    </Card>
  );
}
