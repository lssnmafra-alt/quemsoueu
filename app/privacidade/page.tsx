import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacidade, Cookies e Cache | Quem Sou Eu?',
  description: 'Termos de privacidade, cookies, cache local e publicidade do jogo Quem Sou Eu?.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f6ff] p-4 text-indigo-950 md:p-8 party-grid-bg">
      <div className="mx-auto max-w-4xl rounded-[32px] border-4 border-indigo-100 bg-white p-6 shadow-xl md:p-10">
        <Link href="/lobby" className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-indigo-500 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border-2 border-indigo-100 bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-500">Quem Sou Eu?</p>
            <h1 className="font-display text-3xl font-black leading-tight md:text-5xl">Privacidade, cookies e cache</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">Última atualização: 22/06/2026</p>
          </div>
        </div>

        <div className="space-y-7 text-sm font-semibold leading-relaxed text-slate-600">
          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">1. O que armazenamos no navegador</h2>
            <p>
              O jogo pode usar localStorage, cache do navegador e tecnologias semelhantes para guardar informações necessárias ao funcionamento do jogo, como login de convidado, nickname, perfil, avatar, preferências de música, controle de inatividade, tela de carregamento e configurações temporárias da partida.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">2. Por que usamos cache/localStorage</h2>
            <p>
              Usamos cache para deixar o jogo mais rápido, reduzir travamentos no primeiro carregamento, manter suas preferências e evitar que músicas, imagens e vídeos sejam baixados novamente sem necessidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">3. Publicidade Google AdSense</h2>
            <p>
              O site usa Google AdSense para exibir anúncios. O Google e seus parceiros podem usar cookies, identificadores de dispositivo, armazenamento local e dados de navegação para medir anúncios, evitar fraude, limitar frequência e personalizar publicidade quando permitido.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">4. Controle de inatividade</h2>
            <p>
              O jogo registra o último momento de atividade para saber se o jogador ficou muito tempo inativo. Esse registro é usado para decidir quando mostrar uma pausa publicitária ao retornar, sem exibir anúncios repetidamente enquanto o jogador está ativo.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">5. Como limpar seus dados locais</h2>
            <p>
              Você pode limpar cookies, cache e dados do site nas configurações do navegador. Ao fazer isso, preferências locais, login de convidado, controle de anúncios e configurações salvas no dispositivo podem ser removidos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-indigo-950">6. Observação</h2>
            <p>
              Este jogo pode mudar suas funções ao longo do desenvolvimento. Se adicionarmos novas formas de armazenamento, publicidade ou análise, esta página poderá ser atualizada.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
