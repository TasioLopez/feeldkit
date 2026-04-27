"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  nextPath?: string;
  error?: string;
  supabaseConfigured: boolean;
  siteUrl?: string;
};

export function LoginForm({ nextPath, error, supabaseConfigured, siteUrl }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return null;
    }
    return createBrowserClient(url, key);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured.");
      return;
    }
    setStatus("sending");
    setMessage(null);
    const origin = siteUrl?.replace(/\/$/, "") ?? (typeof window !== "undefined" ? window.location.origin : "");
    const safeNext = nextPath?.startsWith("/") ? nextPath : "/dashboard";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (otpError) {
      setStatus("error");
      setMessage(otpError.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  if (!supabaseConfigured || !supabase) {
    return (
      <Alert variant="warning" className="mt-2">
        <AlertTitle>Configuration</AlertTitle>
        <AlertDescription>
          {error === "missing_supabase" || !supabaseConfigured
            ? "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to enable admin sign-in."
            : "Unable to create Supabase client."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Sign-in</AlertTitle>
          <AlertDescription>
            {error === "auth" && "Sign-in failed. Try again."}
            {error === "missing_code" && "Missing authorization code."}
            {error === "missing_supabase" && "Server is missing Supabase configuration."}
            {!["auth", "missing_code", "missing_supabase"].includes(error) && `Error: ${error}`}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Send magic link"
        )}
      </Button>
      {status === "sent" ? (
        <Alert variant="default" className="border-primary/30 bg-primary/5">
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>Open the link we sent to finish signing in. You can close this tab after you are done.</AlertDescription>
        </Alert>
      ) : null}
      {message && status !== "sent" ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
