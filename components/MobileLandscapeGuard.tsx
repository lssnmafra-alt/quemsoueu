export default function MobileLandscapeGuard() {
  return (
    <div className="mobile-landscape-guard" aria-hidden="false">
      <div className="mobile-landscape-card" role="dialog" aria-label="Vire o telefone para jogar">
        <div className="mobile-landscape-phone">
          <div className="mobile-landscape-phone-screen" />
        </div>
        <p className="mobile-landscape-eyebrow">Modo de jogo</p>
        <h2>Vire o telefone</h2>
        <p className="mobile-landscape-text">Para jogar melhor, use o celular na horizontal.</p>
        <div className="mobile-landscape-arrow">↻</div>
      </div>
    </div>
  );
}
