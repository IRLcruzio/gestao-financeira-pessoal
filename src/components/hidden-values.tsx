"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const HiddenContext = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: false,
  toggle: () => {},
});

const STORAGE_KEY = "valores-escondidos";

export function HiddenValuesProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return <HiddenContext.Provider value={{ hidden, toggle }}>{children}</HiddenContext.Provider>;
}

export function useHiddenValues() {
  return useContext(HiddenContext);
}

/** Envolve qualquer valor monetário — mostra "••••" quando o modo privado está ativo */
export function Money({ children }: { children: React.ReactNode }) {
  const { hidden } = useHiddenValues();
  return <span className={hidden ? "blur-sm select-none" : ""}>{hidden ? "•••••" : children}</span>;
}

/** Botão de olho para alternar o modo privado — colocar no topo de cada página */
export function HideToggleButton() {
  const { hidden, toggle } = useHiddenValues();
  return (
    <button
      onClick={toggle}
      title={hidden ? "Mostrar valores" : "Esconder valores"}
      className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition hover:bg-bg-hover hover:text-gold"
    >
      {hidden ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
    </button>
  );
}
