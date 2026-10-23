"use client";
// Email-code sign-in (Supabase OTP). The email template must include {{ .Token }} (see SETUP.md).
import { useState } from "react";
import { browserClient } from "@/lib/supabase";
import { Card, PrimaryButton } from "./ui";

export function HostSignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true); setError(null);
    const { error } = await browserClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message); else setSent(true);
  };
  const verify = async () => {
    setBusy(true); setError(null);
    const { error } = await browserClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Host sign in</h1>
      <p className="mt-1 text-muted">For venue owners and managers. We email you a 6-digit code.</p>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (sent) verify(); else send(); }}>
        <label className="block text-sm font-medium" htmlFor="host-email">Email</label>
        <input id="host-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent}
          className="min-h-12 w-full rounded-xl border border-line px-4 text-lg" />
        {sent && (
          <>
            <label className="block text-sm font-medium" htmlFor="host-code">Code from the email</label>
            <input id="host-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line px-4 text-2xl tracking-widest" />
          </>
        )}
        {error && <p className="text-red-700" role="alert">{error}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={busy || !email || (sent && code.length < 6)}>
          {busy ? "Please wait…" : sent ? "Sign in" : "Email me a code"}
        </PrimaryButton>
        {sent && <button type="button" className="min-h-11 w-full text-sm font-semibold text-brand" onClick={() => { setSent(false); setCode(""); }}>Use a different email</button>}
      </form>
    </Card>
  );
}
