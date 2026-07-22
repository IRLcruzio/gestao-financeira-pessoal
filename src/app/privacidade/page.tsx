export const metadata = {
  title: "Política de Privacidade — Gestão Financeira Pessoal",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-6 py-12 text-ink">
      <h1 className="mb-6 text-xl font-medium tracking-tightish">Política de Privacidade</h1>

      <div className="space-y-5 text-sm leading-relaxed text-ink-muted">
        <p>
          A <strong className="text-ink">Gestão Financeira Pessoal</strong> é uma aplicação de uso
          pessoal, criada e utilizada por um grupo fechado e restrito de pessoas (não é um serviço
          comercial público).
        </p>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Que dados guardamos</h2>
          <p>
            Nome, email, categorias de despesas, rendimentos, despesas, subscrições, contribuições
            de investimento e, quando o utilizador liga voluntariamente essas contas, dados de
            portfólio (Trading212) e de transações bancárias (via Open Banking).
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Como usamos os dados</h2>
          <p>
            Exclusivamente para mostrar ao próprio utilizador o seu resumo financeiro dentro da
            aplicação. Não vendemos, partilhamos ou usamos os dados para publicidade.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Onde ficam guardados</h2>
          <p>
            Os dados ficam alojados no Supabase (base de dados), com acesso restrito a cada
            utilizador através de segurança ao nível de linha (Row Level Security) — cada pessoa só
            vê os seus próprios dados.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Ligações bancárias (Open Banking)</h2>
          <p>
            Quando um utilizador liga a sua conta bancária, os dados de transações são obtidos via
            Enable Banking, com o consentimento explícito do utilizador, dado diretamente ao seu
            próprio banco. O utilizador pode revogar esse consentimento a qualquer momento junto do
            seu banco.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Eliminação de dados</h2>
          <p>
            Qualquer utilizador pode pedir a eliminação completa da sua conta e dados a qualquer
            momento, contactando o responsável pela aplicação.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Contacto</h2>
          <p>afonsocruzio17@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
