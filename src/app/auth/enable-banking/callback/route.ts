import { createClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/enable-banking";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [stateUserId, encodedBankName, encodedReturnTo] = (state ?? "").split("::");
  const bankName = encodedBankName ? decodeURIComponent(encodedBankName) : "Banco";
  const returnTo = encodedReturnTo ? decodeURIComponent(encodedReturnTo) : "/definicoes";

  if (error) {
    redirect(`${returnTo}?banco_erro=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    redirect(`${returnTo}?banco_erro=Ligação inválida ou incompleta.`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateUserId) {
    redirect(`${returnTo}?banco_erro=Sessão inválida. Tenta ligar o banco novamente.`);
  }

  try {
    const session = await createSession(code!);

    const rows = session.accounts.map((acc, index) => {
      const suffix = session.accounts.length > 1 ? ` (conta ${index + 1})` : "";
      return {
        user_id: user!.id,
        bank_name: `${bankName}${suffix}`,
        status: "active" as const,
        requisition_id: session.session_id,
        account_uid: acc.uid,
        connected_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      await supabase.from("bank_connections").insert(rows);
    }

    redirect(`${returnTo}?banco_sucesso=1`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido ao ligar o banco.";
    redirect(`${returnTo}?banco_erro=${encodeURIComponent(message)}`);
  }
}
