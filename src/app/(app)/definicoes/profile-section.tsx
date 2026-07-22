"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction, updateAvatarUrlAction } from "./actions";
import { Card } from "@/components/ui";

export default function ProfileSection({
  userId,
  initialFullName,
  initialCountry,
  initialAvatarUrl,
}: {
  userId: string;
  initialFullName: string;
  initialCountry: string;
  initialAvatarUrl: string | null;
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(initialFullName);
  const [country, setCountry] = useState(initialCountry);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setMessage(`Erro ao enviar imagem: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    await updateAvatarUrlAction(publicUrl);
    setAvatarUrl(publicUrl);
    setUploading(false);
    setMessage("Foto atualizada.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("full_name", fullName);
    formData.set("country", country);
    const res = await updateProfileAction(formData);
    setSaving(false);
    setMessage(res.error ? res.error : "Perfil atualizado.");
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-ink">Perfil</h2>

      <div className="mb-5 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-raised text-lg text-gold">
            {(fullName || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <label className="cursor-pointer rounded border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:border-gold hover:text-gold">
          {uploading ? "A enviar…" : "Trocar foto"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-ink-muted">Nome</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold"
            placeholder="O teu nome"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-ink-muted">País</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold"
          >
            <option value="PT">Portugal</option>
            <option value="ES">Espanha</option>
            <option value="FR">França</option>
            <option value="DE">Alemanha</option>
            <option value="OTHER">Outro</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-faint">
            Usado para mostrar os bancos certos na ligação bancária (Fase 5).
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
        {message && <p className="text-xs text-ink-muted">{message}</p>}
      </form>
    </Card>
  );
}
