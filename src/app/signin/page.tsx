"use client";
// Sign in or sign up (same step). Afterwards: back to ?next= if given, else /start picks the dashboard.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Card } from "@/components/ui";
import { hostConfigured, useHostSession } from "@/lib/hostClient";
import { useSettings } from "@/lib/settings";

function SignIn() {
  const { t } = useSettings();
  const { session } = useHostSession();
  const router = useRouter();
  const next = useSearchParams().get("next");
  // Only same-site paths, so a crafted link can't send people elsewhere after sign-in.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/start";
  useEffect(() => { if (session) router.replace(target); }, [session, router, target]);

  if (!hostConfigured) return <Card><p>{t("not_configured")}</p></Card>;
  return <AuthForm />;
}

export default function SignInPage() {
  return <Suspense><SignIn /></Suspense>;
}
