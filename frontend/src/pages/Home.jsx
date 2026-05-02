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
    desc: 'Envie XMLs, PDFs ou imagens de Nota Fiscal. Endereços extraídos automaticamente.',
  },
  {
    icon: '⛽',
    title: 'Custo Total da Rota',
    desc: 'Calcule combustível e pedágios estimados antes de sair. Ideal para gestão de frota.',
  },
  {
    icon: '🚛',
    title: 'Multi-veículo',
    desc: 'Suporte a moto, veículo leve e caminhão com cálculo de eixos para pedágio.',
  },
  {
    icon: '📍',
    title: 'CEP Inteligente',
    desc: 'Digite o CEP e preenchemos o endereço completo via ViaCEP. Sem digitação desnecessária.',
  },
  {
    icon: '🔢',
    title: 'Prioridade de Entrega',
    desc: 'Fixe a ordem de paradas críticas. O restante é otimizado automaticamente.',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido e gratuito. Sem cartão de crédito. Comece a usar em segundos.',
  },
  {
    num: '2',
    title: 'Adicione seus destinos',
    desc: 'Importe de NFe ou adicione endereços por CEP. Defina origem, chegada e prioridades.',
  },
  {
    num: '3',
    title: 'Otimize e entregue',
    desc: 'Gere a rota ideal com um clique e abra diretamente no Google Maps.',
  },
]

function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            🚀 Roteirizador de Entregas
          </div>
          <h1 className="hero-title">
            Otimize suas rotas e{' '}
            <span className="accent">economize tempo e combustível</span>
          </h1>
          <p className="hero-subtitle">
            Plataforma inteligente para roteirização de entregas. Importe NFes,
            defina paradas e gere a rota perfeita com custo estimado em segundos.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-hero-primary">
              Começar gratuitamente →
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
            <div className="stat-number">1<span>min</span></div>
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
            Ferramentas profissionais de roteirização que se adaptam ao seu negócio,
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
            Sem configuração complexa. Comece a otimizar rotas hoje.
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
            <Link to="/register" className="btn-hero-primary">
              Criar conta gratuita
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Fazer login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-simple">
        © {new Date().getFullYear()} Roteirizador · Feito para logística brasileira
      </footer>
    </>
  )
}

export default Home
