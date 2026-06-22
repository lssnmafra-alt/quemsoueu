'use client';

type LoadingArenaProps = {
  label?: string;
};

export default function LoadingArena({ label = 'Carregando Quem Sou Eu...' }: LoadingArenaProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#120824] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(18,8,36,0.68) 0%, rgba(32,10,58,0.82) 55%, rgba(9,6,22,0.94) 100%), url('/api/branding/loading')",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.16),_transparent_38%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-black/25 p-6 text-center shadow-2xl backdrop-blur-md md:p-8">
          <img
            src="/api/branding/logo"
            alt="Quem Sou Eu?"
            className="mx-auto mb-6 h-auto w-full max-w-[340px] object-contain drop-shadow-[0_10px_34px_rgba(0,0,0,0.55)]"
          />

          <p className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-white/85">
            {label}
          </p>

          <div className="mx-auto w-full max-w-md">
            <div className="h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
              <div className="loading-shine h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300" />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-fuchsia-300 [animation-delay:180ms]" />
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 [animation-delay:360ms]" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loading-shine {
          animation: loading-shine 1.55s ease-in-out infinite;
          width: 35%;
        }

        @keyframes loading-shine {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(110%);
          }
          100% {
            transform: translateX(310%);
          }
        }
      `}</style>
    </div>
  );
}
