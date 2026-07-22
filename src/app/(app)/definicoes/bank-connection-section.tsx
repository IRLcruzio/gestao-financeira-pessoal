"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { listBanksAction, connectBankAction, disconnectBankAction } from "./bank-actions";
import { Card } from "@/components/ui";

type Aspsp = { name: string; country: string; logo?: string };
type Connection = { id: string; bank_name: string; status: string; connected_at: string | null };

export default function BankConnectionSection({
  initialConnections,
  country,
}: {
  initialConnections: Connection[];
  country: string;
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState(initialConnections);
  const [banks, setBanks] = useState<Aspsp[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("banco_erro") ? decodeURIComponent(searchParams.get("banco_erro")!) : null
  );
  const [success] = useState(searchParams.get("banco_sucesso") === "1");

  async function handleDisconnect(id: string) {
    setDisconnectingId(id);
    const res = await disconnectBankAction(id);
    setDisconnectingId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConnections((prev) => prev.filter((c) => c.id !== id));
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

  async function handleConnect() {
    if (!selectedBank) return;
    setConnecting(true);
    setError(null);
    const bank = banks.find((b) => `${b.name}|${b.country}` === selectedBank);
    if (!bank) {
      setConnecting(false);
      setError("Escolhe um banco da lista.");
      return;
    }
    const res = await connectBankAction(bank.name, bank.country);
    setConnecting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.url) window.location.href = res.url;
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-medium text-ink">Ligação bancária automática</h2>
      <p className="mb-4 text-xs text-ink-muted">
        Liga a tua conta bancária via Enable Banking para importar transações automaticamente (em
        alternativa ao CSV/PDF manual).
      </p>

      {success && (
        <p className="mb-3 rounded border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
          Banco ligado com sucesso!
        </p>
      )}
      {error && (
        <p className="mb-3 rounded border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
          {error}
        </p>
      )}

      {connections.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded bg-bg-raised px-3 py-2 text-sm">
              <span className="text-ink">{c.bank_name}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${c.status === "active" ? "text-positive" : "text-ink-faint"}`}>
                  {c.status === "active" ? "Ativo" : c.status}
                </span>
                <button
                  onClick={() => handleDisconnect(c.id)}
                  disabled={disconnectingId === c.id}
                  className="text-xs text-ink-faint transition hover:text-negative disabled:opacity-50"
                >
                  {disconnectingId === c.id ? "A desligar…" : "Desligar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {banks.length === 0 ? (
        <button
          onClick={loadBanks}
          disabled={loadingBanks}
          className="rounded border border-border px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {loadingBanks ? "A carregar bancos…" : "Ver bancos disponíveis"}
        </button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-ink-muted">Escolhe o teu banco</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full rounded border border-border bg-bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-gold"
            >
              <option value="">Selecionar…</option>
              {banks.map((b) => (
                <option key={`${b.name}|${b.country}`} value={`${b.name}|${b.country}`}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting || !selectedBank}
            className="rounded bg-gold px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
          >
            {connecting ? "A ligar…" : "Ligar banco"}
          </button>
        </div>
      )}
    </Card>
  );
}
