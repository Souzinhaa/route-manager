import React from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Otimização Inteligente',
    desc: 'Algoritmo TSP calcula a sequência de paradas que minimiza distância e tempo de entrega.',
  },
  {
    icon: '📄',
    title: 'Importação de NFe',
    desc: 'Envie XMLs, PDFs ou imagens de Nota Fiscal. Endereços extraídos automaticamente via IA.',
  },
  {
    icon: '⛽',
    title: 'Custo Total da Rota',
    desc: 'Calcule combustível e pedágios estimados antes de sair. Controle total sobre sua frota.',
  },
  {
    icon: '🚛',
    title: 'Multi-veículo',
    desc: 'Suporte a moto, veículo leve e caminhão com cálculo de eixos para pedágio.',
  },
  {
    icon: '📍',
    title: 'CEP Inteligente',
    desc: 'Digite o CEP e preenchemos o endereço completo via ViaCEP. Zero digitação desnecessária.',
  },
  {
    icon: '⚡',
    title: 'Prioridade de Entrega',
    desc: 'Fixe a ordem de paradas críticas. O restante é otimizado automaticamente pelo sistema.',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido e gratuito. Sem cartão de crédito. Pronto para usar em menos de 1 minuto.',
  },
  {
    num: '2',
    title: 'Adicione seus destinos',
    desc: 'Importe de NFe ou adicione endereços por CEP. Defina origem, chegada e prioridades de entrega.',
  },
  {
    num: '3',
    title: 'Otimize e entregue',
    desc: 'Gere a rota ideal com um clique e abra diretamente no Google Maps. Simples assim.',
  },
]

function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            ⚡ SaaS de Logística &amp; Roteirização
          </div>
          <h1 className="hero-title">
            Otimize suas rotas{' '}
            <span className="accent">em segundos</span>
          </h1>
          <p className="hero-subtitle">
            Reduza custos, aumente entregas e gerencie tudo em um só lugar.
            Plataforma inteligente para frotas de qualquer tamanho.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-hero-primary">
              Começar grátis →
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item">
            <div className="stat-number"><span>+</span>40<span>%</span></div>
            <div className="stat-desc">Redução de km rodados</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><span>−</span>30<span>%</span></div>
            <div className="stat-desc">Custo com combustível</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">&lt;1<span>min</span></div>
            <div className="stat-desc">Para gerar uma rota</div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="features-inner">
          <div className="section-label">Funcionalidades</div>
          <h2 className="section-title">Tudo para entregar mais rápido</h2>
          <p className="section-subtitle">
            Ferramentas orientadas a dados que se adaptam ao seu negócio,
            do autônomo à pequena frota.
          </p>
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
          <div className="section-label">Como funciona</div>
          <h2 className="section-title">Em 3 passos simples</h2>
          <p className="section-subtitle">
            Sem configuração complexa. Interface clean, resultado imediato.
          </p>
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
          <h2 className="cta-title">Pronto para otimizar suas entregas?</h2>
          <p className="cta-subtitle">
            Crie sua conta gratuitamente e comece a economizar tempo e combustível hoje mesmo.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="btn-cta-white">
              Começar grátis
            </Link>
            <Link to="/login" className="btn-cta-outline">
              Fazer login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-simple">
        © {new Date().getFullYear()} Roteirizador · Logística inteligente para o Brasil
      </footer>
    </>
  )
}

export default Home
