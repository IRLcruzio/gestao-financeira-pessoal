export const metadata = {
  title: "Termos de Utilização — Gestão Financeira Pessoal",
};

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-6 py-12 text-ink">
      <h1 className="mb-6 text-xl font-medium tracking-tightish">Termos de Utilização</h1>

      <div className="space-y-5 text-sm leading-relaxed text-ink-muted">
        <p>
          A <strong className="text-ink">Gestão Financeira Pessoal</strong> é uma aplicação de uso
          pessoal e privado, criada para um grupo fechado e restrito de pessoas. Não é um produto
          comercial disponível ao público em geral.
        </p>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Utilização</h2>
          <p>
            A aplicação destina-se exclusivamente a ajudar o utilizador a organizar e visualizar a
            sua própria informação financeira (rendimentos, despesas, subscrições, investimentos e,
            opcionalmente, dados bancários e de corretora ligados voluntariamente pelo utilizador).
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Sem aconselhamento financeiro</h2>
          <p>
            A aplicação não fornece aconselhamento financeiro, fiscal ou de investimento. Serve
            apenas como ferramenta de organização pessoal.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Responsabilidade</h2>
          <p>
            A aplicação é fornecida "tal como está", sem garantias, e é mantida de forma pessoal e
            não profissional. O utilizador é responsável por verificar a exatidão dos dados
            apresentados antes de tomar decisões com base neles.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Ligações a terceiros</h2>
          <p>
            Ao ligar contas externas (banco via Open Banking, corretora Trading212), o utilizador
            autoriza explicitamente essa ligação e pode revogá-la a qualquer momento junto do
            respetivo serviço.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-sm font-medium text-ink">Alterações</h2>
          <p>
            Estes termos podem ser atualizados à medida que a aplicação evolui. A utilização
            continuada implica a aceitação dos termos em vigor.
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
