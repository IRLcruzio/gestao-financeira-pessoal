"use client";

import { useEffect, useRef, useState } from "react";
import { verifyPinAction } from "@/app/(app)/definicoes/actions";

const SESSION_KEY = "pin-desbloqueado";

export default function PinGate({
  pinEnabled,
  children,
}: {
  pinEnabled: boolean;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(pinEnabled);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pinEnabled) {
      setLocked(false);
      return;
    }
    const unlocked = sessionStorage.getItem(SESSION_KEY) === "1";
    setLocked(!unlocked);
  }, [pinEnabled]);

  useEffect(() => {
    if (locked) inputRef.current?.focus();
  }, [locked]);

  async function handleSubmit(value: string) {
    setError(null);
    setLoading(true);
    const res = await verifyPinAction(value);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setDigits("");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
    setLocked(false);
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-6 flex h-10 w-10 items-end justify-center gap-1">
          <span className="h-4 w-2 rounded-sm bg-gold/70" />
          <span className="h-7 w-2 rounded-sm bg-gold" />
          <span className="h-10 w-2 rounded-sm bg-gold-bright" />
        </div>
        <p className="mb-6 text-sm text-ink-muted">Introduz o teu PIN para continuar</p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={digits}
          disabled={loading}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setDigits(v);
            if (v.length === 6) handleSubmit(v);
          }}
          className="w-full rounded border border-border bg-bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-gold"
          placeholder="——————"
        />

        {error && <p className="mt-4 text-sm text-negative">{error}</p>}
        {loading && <p className="mt-4 text-sm text-ink-faint">A verificar…</p>}
      </div>
    </div>
  );
}
