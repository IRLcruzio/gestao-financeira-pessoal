"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { autoSyncAllBanksAction } from "@/lib/bank-sync";

const INTERVAL_MS = 60_000; // 1 minuto

export default function BankAutoSync() {
  const router = useRouter();
  const busyRef = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await autoSyncAllBanksAction();
        if (res.success && (res.added > 0 || res.removed > 0)) {
          router.refresh();
        }
      } catch {
        // silencioso — tenta outra vez no próximo ciclo
      } finally {
        busyRef.current = false;
      }
    };

    // primeira verificação pouco depois de abrir a app, depois a cada minuto
    const initial = setTimeout(tick, 5_000);
    const interval = setInterval(tick, INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
