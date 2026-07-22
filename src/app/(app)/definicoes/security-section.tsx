"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setPinAction, removePinAction } from "./actions";
import { Card } from "@/components/ui";

export default function SecuritySection({ pinEnabled }: { pinEnabled: boolean }) {
  const supabase = createClient();

  // --- PIN ---
  const [hasPin, setHasPin] = useState(pinEnabled);
  const [pinValue, setPinValue] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setPinSaving(true);
    setPinMessage(null);
    const res = await setPinAction(pinValue);
    setPinSaving(false);
    if (res.error) {
      setPinMessage(res.error);
      return;
    }
    setHasPin(true);
    setPinValue("");
    setPinMessage("PIN ativado.");
  }

  async function handleRemovePin() {
    setPinSaving(true);
    await removePinAction();
    setPinSaving(false);
    setHasPin(false);
    setPinMessage("PIN desativado.");
    sessionStorage.removeItem("pin-desbloqueado");
  }

  // --- TOTP (2FA) ---
  const [factors, setFactors] = useState<{ id: string; status: string }[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [totpMessage, setTotpMessage] = useState<string | null>(null);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []).map((f) => ({ id: f.id, status: f.status })));
  }

  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setEnrolling(true);
    setTotpMessage(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setTotpMessage(error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFactorId) return;
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (challengeError) {
      setTotpMessage(challengeError.message);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code,
    });
    if (error) {
      setTotpMessage("Código inválido. Tenta novamente.");
      return;
    }
    setEnrolling(false);
    setQrCode(null);
    setCode("");
    setTotpMessage("Autenticação em duas etapas ativada.");
    loadFactors();
  }

  async function removeFactor(factorId: string) {
    await supabase.auth.mfa.unenroll({ factorId });
    setTotpMessage("Autenticação em duas etapas desativada.");
    loadFactors();
  }

  const activeFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-sm font-medium text-ink">PIN de acesso rápido</h2>
        <p className="mb-4 text-xs text-ink-muted">
          Pedido sempre que abres a app, além do login. 6 dígitos.
        </p>

        {hasPin ? (
          <button
            onClick={handleRemovePin}
            disabled={pinSaving}
            className="rounded border border-negative/40 px-3 py-1.5 text-xs text-negative transition hover:bg-negative/10 disabled:opacity-50"
          >
            Desativar PIN
          </button>
        ) : (
          <form onSubmit={handleSetPin} className="flex items-end gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-ink-muted">Novo PIN (6 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-32 rounded border border-border bg-bg-surface px-3.5 py-2.5 text-center text-sm tracking-widest text-ink outline-none focus:border-gold"
                placeholder="••••••"
              />
            </div>
            <button
              type="submit"
              disabled={pinSaving || pinValue.length !== 6}
              className="rounded bg-gold px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
            >
              Ativar
            </button>
          </form>
        )}
        {pinMessage && <p className="mt-3 text-xs text-ink-muted">{pinMessage}</p>}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-medium text-ink">Autenticação em duas etapas</h2>
        <p className="mb-4 text-xs text-ink-muted">
          Usa uma app autenticadora (Google Authenticator, Authy, etc.) para confirmar a tua
          identidade no login, além da password.
        </p>

        {activeFactor ? (
          <button
            onClick={() => removeFactor(activeFactor.id)}
            className="rounded border border-negative/40 px-3 py-1.5 text-xs text-negative transition hover:bg-negative/10"
          >
            Desativar 2FA
          </button>
        ) : !enrolling ? (
          <button
            onClick={startEnroll}
            className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright"
          >
            Ativar 2FA
          </button>
        ) : (
          <div>
            {qrCode && (
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR code 2FA" className="h-40 w-40 rounded bg-white p-2" />
                <div>
                  <p className="mb-1 text-xs text-ink-muted">
                    Digitaliza este código na tua app autenticadora, ou insere manualmente:
                  </p>
                  <p className="figure rounded bg-bg-raised px-2 py-1 text-xs text-gold">{secret}</p>
                </div>
              </div>
            )}
            <form onSubmit={confirmEnroll} className="flex items-end gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-ink-muted">Código da app</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  className="w-32 rounded border border-border bg-bg-surface px-3.5 py-2.5 text-center text-sm tracking-widest text-ink outline-none focus:border-gold"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-gold px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright"
              >
                Confirmar
              </button>
            </form>
          </div>
        )}
        {totpMessage && <p className="mt-3 text-xs text-ink-muted">{totpMessage}</p>}
      </Card>
    </div>
  );
}
