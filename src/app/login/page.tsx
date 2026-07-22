"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("PT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("erro") === "confirmacao_invalida") {
      setError("O link de confirmação expirou ou já foi usado. Tenta fazer login normalmente, ou cria conta outra vez.");
    }
  }, [searchParams]);

  // --- 2FA (etapa extra depois da password) ---
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // "Lembrar-me": se desligado, a sessão expira ao fechar o browser
    const supabase = createClient({
      cookieOptions: rememberMe ? undefined : { maxAge: undefined },
    });

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setError(traduzErro(error.message));
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setLoading(false);

      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp?.[0];
        if (factor) {
          setTotpFactorId(factor.id);
          setNeedsTotp(true);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } else {
      if (!fullName.trim()) {
        setLoading(false);
        setError("Diz-nos o teu nome.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), country },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      setLoading(false);
      if (error) {
        setError(traduzErro(error.message));
        return;
      }
      setMessage("Conta criada. Verifica o teu email para confirmar o registo.");
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!totpFactorId) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactorId,
    });
    if (challengeError) {
      setLoading(false);
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactorId,
      challengeId: challenge.id,
      code: totpCode,
    });
    setLoading(false);
    if (verifyError) {
      setError("Código inválido. Tenta novamente.");
      setTotpCode("");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (needsTotp) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <p className="mb-6 text-sm text-ink-muted">
            Introduz o código da tua app autenticadora
          </p>
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              className="w-full rounded border border-border bg-bg-surface px-4 py-3 text-center text-xl tracking-[0.4em] text-ink outline-none focus:border-gold"
              placeholder="000000"
            />
            {error && <p className="text-sm text-negative">{error}</p>}
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full rounded bg-gold py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
            >
              {loading ? "A verificar…" : "Confirmar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-end justify-center gap-1 rounded bg-transparent">
            <span className="h-4 w-2 rounded-sm bg-gold/70" />
            <span className="h-7 w-2 rounded-sm bg-gold" />
            <span className="h-10 w-2 rounded-sm bg-gold-bright" />
          </div>
          <h1 className="text-lg font-medium tracking-tightish text-ink">
            Gestão Financeira Pessoal
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === "login" ? "Entra na tua conta" : "Cria a tua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm text-ink-muted">Nome</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-gold"
                  placeholder="Como te chamas?"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-ink-muted">País</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-gold"
                >
                  <option value="PT">Portugal</option>
                  <option value="ES">Espanha</option>
                  <option value="FR">França</option>
                  <option value="DE">Alemanha</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-ink-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-gold"
              placeholder="tu@exemplo.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-muted">Palavra-passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-gold"
              placeholder="••••••••"
            />
          </div>

          {mode === "login" && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-bg-surface accent-gold"
              />
              Lembrar-me neste dispositivo
            </label>
          )}

          {error && (
            <p className="rounded border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gold py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
          >
            {loading ? "A processar…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setMessage(null);
          }}
          className="mt-6 w-full text-center text-sm text-ink-muted transition hover:text-ink"
        >
          {mode === "login" ? (
            <>Ainda não tens conta? <span className="text-gold">Criar conta</span></>
          ) : (
            <>Já tens conta? <span className="text-gold">Entrar</span></>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com este email.";
  if (msg.includes("Password should be at least")) return "A palavra-passe deve ter pelo menos 6 caracteres.";
  return msg;
}
