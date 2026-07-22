"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setPinAction } from "@/app/(app)/definicoes/actions";
import { listBanksAction, connectBankAction } from "@/app/(app)/definicoes/bank-actions";
import { saveTrading212KeyAction } from "@/app/(app)/investimentos/actions";
import { completeOnboardingAction } from "./actions";

const STEPS = ["Foto", "PIN", "Banco", "Investimentos"] as const;

type Aspsp = { name: string; country: string };

function WizardInner({ userId, country }: { userId: string; country: string }) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const hasBankReturn = searchParams.get("banco_sucesso") || searchParams.get("banco_erro");
  const [step, setStep] = useState(hasBankReturn ? 2 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("banco_erro") ? decodeURIComponent(searchParams.get("banco_erro")!) : null
  );

  // Foto
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // PIN
  const [pinValue, setPinValue] = useState("");
  const [pinSet, setPinSet] = useState(false);

  // Banco
  const [banks, setBanks] = useState<Aspsp[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [bankConnected] = useState(searchParams.get("banco_sucesso") === "1");

  // Investimentos
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const isLastStep = step === STEPS.length - 1;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(`Erro ao enviar foto: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("user_settings").update({ avatar_url: publicUrl }).eq("user_id", userId);
    setAvatarPreview(publicUrl);
    setUploading(false);
  }

  async function handleSetPin() {
    if (pinValue.length !== 6) return;
    setError(null);
    const res = await setPinAction(pinValue);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPinSet(true);
  }

  async function loadBanks() {
    setLoadingBanks(true);
    setError(null);
    const res = await listBanksAction(country || "PT");
    setLoadingBanks(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBanks(res.aspsps ?? []);
  }

  async function handleConnectBank() {
    if (!selectedBank) return;
    setConnecting(true);
    setError(null);
    const bank = banks.find((b) => `${b.name}|${b.country}` === selectedBank);
    if (!bank) {
      setConnecting(false);
      setError("Escolhe um banco da lista.");
      return;
    }
    const res = await connectBankAction(bank.name, bank.country, "/onboarding");
    setConnecting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.url) window.location.href = res.url;
  }

  async function handleSaveTrading212() {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    setSavingKey(true);
    setError(null);
    const formData = new FormData();
    formData.set("api_key", apiKey);
    formData.set("api_secret", apiSecret);
    const res = await saveTrading212KeyAction(formData);
    setSavingKey(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setKeySaved(true);
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("bank_connection_pref", bankConnected ? "auto" : "skip");
    if (keySaved) formData.set("wants_investment_tracking", "on");

    const res = await completeOnboardingAction(formData);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleNext() {
    if (isLastStep) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-medium tracking-tightish text-ink">Vamos configurar a tua conta</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Passo {step + 1} de {STEPS.length} — {STEPS[step]}
          </p>
          <div className="mt-4 flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 w-8 rounded-full ${i <= step ? "bg-gold" : "bg-border"}`} />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {step === 0 && (
            <div className="text-center">
              <p className="mb-4 text-sm text-ink-muted">Queres adicionar uma foto de perfil?</p>
              <div className="mb-4 flex justify-center">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-raised text-2xl text-gold">
                    ?
                  </div>
                )}
              </div>
              <label className="inline-block cursor-pointer rounded border border-border px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold">
                {uploading ? "A enviar…" : avatarPreview ? "Trocar foto" : "Escolher foto"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <p className="mb-4 text-sm text-ink-muted">
                Queres ativar um PIN de 6 dígitos para desbloqueio rápido da app?
              </p>
              {pinSet ? (
                <p className="text-sm text-positive">PIN ativado ✓</p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-32 rounded border border-border bg-bg-surface px-3.5 py-2.5 text-center text-sm tracking-widest text-ink outline-none focus:border-gold"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={handleSetPin}
                    disabled={pinValue.length !== 6}
                    className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
                  >
                    Ativar PIN
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-3 text-sm text-ink-muted">
                Liga a tua conta bancária para importar transações automaticamente. Vais sair da app
                por momentos para autorizar no login do teu banco.
              </p>
              {bankConnected ? (
                <p className="rounded border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive">
                  Banco ligado com sucesso ✓
                </p>
              ) : banks.length === 0 ? (
                <button
                  type="button"
                  onClick={loadBanks}
                  disabled={loadingBanks}
                  className="rounded border border-border px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  {loadingBanks ? "A carregar bancos…" : "Ver bancos disponíveis"}
                </button>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full rounded border border-border bg-bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-gold"
                  >
                    <option value="">Selecionar banco…</option>
                    {banks.map((b) => (
                      <option key={`${b.name}|${b.country}`} value={`${b.name}|${b.country}`}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleConnectBank}
                    disabled={connecting || !selectedBank}
                    className="w-full rounded bg-gold py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
                  >
                    {connecting ? "A ligar…" : "Ligar banco"}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-3 text-sm text-ink-muted">
                Liga o teu portfólio Trading212, se investires.
              </p>
              {keySaved ? (
                <p className="rounded border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive">
                  Credenciais guardadas ✓
                </p>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Chave da API (API Key)"
                    className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold"
                  />
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Segredo (API Secret)"
                    className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTrading212}
                    disabled={savingKey || !apiKey.trim() || !apiSecret.trim()}
                    className="w-full rounded bg-gold py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
                  >
                    {savingKey ? "A guardar…" : "Ligar Trading212"}
                  </button>
                  <p className="text-xs text-ink-faint">
                    Gera em: Trading212 → Definições → API (Beta) → Generate API Key.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded border border-border px-4 py-2.5 text-sm text-ink-muted transition hover:border-gold hover:text-gold"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 rounded bg-gold py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
            >
              {submitting ? "A concluir…" : isLastStep ? "Concluir" : "Continuar"}
            </button>
          </div>

          {!isLastStep && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="w-full text-center text-xs text-ink-faint transition hover:text-ink-muted"
            >
              Saltar o resto (decido depois nas Definições)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingWizard({ userId, country }: { userId: string; country: string }) {
  return (
    <Suspense fallback={null}>
      <WizardInner userId={userId} country={country} />
    </Suspense>
  );
}
