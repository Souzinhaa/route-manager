import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Otimização TSP',
    desc: 'Algoritmo Traveling Salesman calcula a sequência ideal de paradas em milissegundos.',
  },
  {
    icon: '📄',
    title: 'NFe → Endereços',
    desc: 'Envie XMLs, PDFs ou fotos. Extração automática via parser inteligente + ViaCEP.',
  },
  {
    icon: '⛽',
    title: 'Custo em Tempo Real',
    desc: 'Combustível, pedágios por eixo e ROI estimado antes de sair da base.',
  },
  {
    icon: '🚛',
    title: 'Multi-frota',
    desc: 'Moto, leve ou pesado. Cálculo de eixos automático para tarifa de pedágio correta.',
  },
  {
    icon: '📍',
    title: 'CEP Auto-complete',
    desc: 'Digite só o CEP. Endereço completo via ViaCEP em segundo plano. Zero atrito.',
  },
  {
    icon: '🔢',
    title: 'Prioridades Mistas',
    desc: 'Fixe paradas críticas em ordem manual. Resto otimizado pelo algoritmo automaticamente.',
  },
]

const STEPS = [
  { num: '01', title: 'Crie sua conta', desc: 'Cadastro gratuito em segundos. Sem cartão, sem trial.' },
  { num: '02', title: 'Importe destinos', desc: 'NFe ou CEP. Defina origem, chegada e prioridades.' },
  { num: '03', title: 'Otimize e entregue', desc: 'Rota perfeita em menos de 1s. Abre direto no Maps.' },
]

function Home() {
  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card')
    const onMove = (e) => {
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        card.style.setProperty('--mx', `${x}%`)
        card.style.setProperty('--my', `${y}%`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">
              <span className="dot"></span>
              <span className="pill">NOVO</span>
              <span>Algoritmo TSP + IA de extração</span>
            </div>
            <h1 className="hero-title">
              Otimize suas rotas{' '}
              <span className="accent">em segundos</span>
            </h1>
            <p className="hero-subtitle">
              Reduza custos, aumente entregas e gerencie tudo em um só lugar.
              Plataforma orientada a dados para frotas brasileiras de qualquer tamanho.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-hero-primary">
                Começar grátis
                <span aria-hidden>→</span>
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                Acessar conta
              </Link>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item"><span className="check">✓</span> Sem cartão</span>
              <span className="hero-trust-item"><span className="check">✓</span> Setup em 1 min</span>
              <span className="hero-trust-item"><span className="check">✓</span> Cancele quando quiser</span>
            </div>
          </div>

          {/* Visual mockup */}
          <div className="hero-visual">
            <div className="mockup">
              <div className="mockup-bar">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="url">roteirizador.app/rota/otimizada</span>
              </div>
              <div className="mockup-stops">
                <div className="mockup-stop">
                  <span className="num">1</span>
                  <span className="addr">Av. Paulista, 1000 — Bela Vista</span>
                  <span className="km">2.4 km</span>
                </div>
                <div className="mockup-stop">
                  <span className="num">2</span>
                  <span className="addr">Rua Augusta, 500 — Consolação</span>
                  <span className="km">1.8 km</span>
                </div>
                <div className="mockup-stop">
                  <span className="num">3</span>
                  <span className="addr">Praça da Sé, 100 — Centro</span>
                  <span className="km">3.1 km</span>
                </div>
                <div className="mockup-stop">
                  <span className="num">4</span>
                  <span className="addr">Mercado Municipal — Centro</span>
                  <span className="km">0.9 km</span>
                </div>
              </div>
              <div className="mockup-summary">
                <div>
                  <div className="label">Total otimizado</div>
                  <div className="value">8.2 km · 24 min</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label">Economia</div>
                  <div className="value">−42%</div>
                </div>
              </div>
            </div>
            <div className="mockup-float">
              <div className="icon">↓</div>
              <div className="text">
                <strong>R$ 18,40</strong>
                economia em combustível
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item">
            <div className="stat-number"><span>+</span>40<span>%</span></div>
            <div className="stat-desc">Redução média de km rodados</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><span>−</span>30<span>%</span></div>
            <div className="stat-desc">Custo com combustível</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">&lt;1<span>s</span></div>
            <div className="stat-desc">Para gerar uma rota completa</div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="features-inner">
          <div className="section-header">
            <div className="section-label">Funcionalidades</div>
            <h2 className="section-title">Tudo que sua operação precisa</h2>
            <p className="section-subtitle">
              Construído por quem entende logística. Sem features inúteis, sem curva de aprendizado.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon-wrap">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="how-inner">
          <div className="section-header">
            <div className="section-label">Como funciona</div>
            <h2 className="section-title">Da NFe ao Maps em 3 passos</h2>
            <p className="section-subtitle">
              Sem onboarding chato, sem configuração inicial. Crie e otimize.
            </p>
          </div>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="step">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Comece a economizar combustível hoje</h2>
          <p className="cta-subtitle">
            Crie sua conta gratuitamente e otimize sua primeira rota em menos de 60 segundos.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="btn-cta-white">
              Criar conta grátis →
            </Link>
            <Link to="/login" className="btn-cta-outline">
              Já sou cliente
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-simple">
        © {new Date().getFullYear()} <strong style={{ color: 'var(--text-2)' }}>Roteirizador</strong>{' · '}
        Logística inteligente para o Brasil · <a href="#top">Voltar ao topo</a>
      </footer>
    </>
  )
}

export default Home
