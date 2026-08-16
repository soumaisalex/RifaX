export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="hero-card">
        <div>
          <span className="eyebrow">RIFA X</span>
          <h1>Rifas online, simples e transparentes.</h1>
          <p>Crie sua rifa, acompanhe pedidos e pagamentos e deixe seus participantes escolherem os números pelo celular.</p>
          <div className="home-actions">
            <a className="button primary" href="/admin/login">Entrar no painel</a>
            <a className="button secondary" href="/super-admin">Super Admin</a>
          </div>
        </div>
        <div className="feature-grid">
          <article><strong>01</strong><span>Criar e publicar rifas</span></article>
          <article><strong>02</strong><span>Reservar números</span></article>
          <article><strong>03</strong><span>Pix e QR Code</span></article>
          <article><strong>04</strong><span>Pedidos e confirmações</span></article>
        </div>
      </section>
    </main>
  );
}
