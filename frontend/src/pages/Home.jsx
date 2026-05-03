import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ── SVG Icon Components ── */
const IconRoute = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="5" r="2" fill="currentColor" stroke="none" opacity=".4"/>
    <circle cx="19" cy="19" r="2" fill="currentColor" stroke="none" opacity=".4"/>
    <path d="M5 7v5a6 6 0 0 0 6 6h2"/>
    <path d="M15 5h4v4"/>
    <path d="M19 5 9 15"/>
  </svg>
)

const IconDocument = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
)

const IconCost = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

const IconTruck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

const IconPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconList = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="10" y1="6" x2="21" y2="6"/>
    <line x1="10" y1="12" x2="21" y2="12"/>
    <line x1="10" y1="18" x2="21" y2="18"/>
    <path d="M4 6h1v4"/>
    <path d="M4 10h2"/>
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
  </svg>
)

const IconCheck = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
)

const IconTrend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const IconShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

/* ── Data ── */
const FEATURES = [
  {
    Icon: IconRoute,
    title: 'Otimização TSP',
    desc: 'Algoritmo Traveling Salesman calcula a sequência ideal de paradas em milissegundos.',
  },
  {
    Icon: IconDocument,
    title: 'NFe → Endereços',
    desc: 'Envie XMLs, PDFs ou fotos. Extração automática via parser inteligente + ViaCEP.',
  },
  {
    Icon: IconCost,
    title: 'Custo em Tempo Real',
    desc: 'Combustível, pedágios por eixo e ROI estimado antes de sair da base.',
  },
  {
    Icon: IconTruck,
    title: 'Multi-frota',
    desc: 'Moto, leve ou pesado. Cálculo de eixos automático para tarifa de pedágio correta.',
  },
  {
    Icon: IconPin,
    title: 'CEP Auto-complete',
    desc: 'Digite só o CEP. Endereço completo via ViaCEP em segundo plano. Zero atrito.',
  },
  {
    Icon: IconList,
    title: 'Prioridades Mistas',
    desc: 'Fixe paradas críticas em ordem manual. Resto otimizado pelo algoritmo automaticamente.',
  },
]

const STEPS = [
  { num: '01', title: 'Crie sua conta', desc: 'Cadastro gratuito em segundos. Sem cartão, sem trial.' },
  { num: '02', title: 'Importe destinos', desc: 'NFe ou CEP. Defina origem, chegada e prioridades.' },
  { num: '03', title: 'Otimize e entregue', desc: 'Rota perfeita em menos de 1s. Abre direto no Maps.' },
]

const TESTIMONIALS = [
  {
    text: 'Reduzimos 35% do custo com combustível no primeiro mês. A importação de NFe economiza 2 horas por dia da nossa equipe operacional.',
    name: 'Rafael Mendes',
    role: 'Gerente de Operações · Distribuidora Paulista',
    initials: 'RM',
  },
  {
    text: 'Gerenciamos 8 entregadores simultaneamente. A otimização de rotas pagou o plano logo no primeiro dia de uso. Impressionante.',
    name: 'Ana Paula Silva',
    role: 'Sócia-Proprietária · APS Express',
    initials: 'AS',
  },
  {
    text: 'Integrei os XMLs de NFe e o sistema montou todas as rotas automaticamente. Parece mágica, mas é algoritmo mesmo.',
    name: 'Lucas Ferreira',
    role: 'Coordenador Logístico · LojaFácil',
    initials: 'LF',
  },
]

const PRICING_PREVIEW = [
  {
    key: 'basic',
    name: 'Basic',
    price: 39,
    features: ['1 rota por dia', 'Até 100 paradas', 'Importação NFe', 'CEP automático', 'Histórico de rotas'],
    popular: false,
  },
  {
    key: 'delivery',
    name: 'Delivery',
    price: 149,
    features: ['5 rotas por dia', 'Até 150 paradas', 'Importação NFe', 'CEP automático', 'Multi-veículo'],
    popular: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 299,
    features: ['10 rotas por dia', 'Até 200 paradas', 'Importação NFe', 'Suporte prioritário', 'Multi-veículo'],
    popular: false,
  },
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
                <IconArrow />
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                Acessar conta
              </Link>
            </div>
            <div className="hero-trust">
              <span className="hero-trust-item">
                <span className="check-icon"><IconCheck /></span>
                Sem cartão
              </span>
              <span className="hero-trust-item">
                <span className="check-icon"><IconCheck /></span>
                Setup em 1 min
              </span>
              <span className="hero-trust-item">
                <span className="check-icon"><IconCheck /></span>
                Cancele quando quiser
              </span>
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
              <div className="icon">
                <IconTrend />
              </div>
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
                <div className="feature-icon-wrap">
                  <f.Icon />
                </div>
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

      {/* ── Testimonials ── */}
      <section className="testimonials-section">
        <div className="testimonials-inner">
          <div className="section-header section-header--center">
            <div className="section-label">Depoimentos</div>
            <h2 className="section-title">Quem usa, não volta atrás</h2>
            <p className="section-subtitle">
              Frotas de todo o Brasil já otimizam suas entregas com o Roteirizador.
            </p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars" aria-label="Avaliação 5 estrelas">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <span key={si}><IconStar /></span>
                  ))}
                </div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" aria-hidden="true">{t.initials}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="pricing-preview-section">
        <div className="pricing-preview-inner">
          <div className="section-header section-header--center">
            <div className="section-label">Planos &amp; Preços</div>
            <h2 className="section-title">Planos que cabem no orçamento</h2>
            <p className="section-subtitle">
              Comece com 3 dias grátis. Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
          <div className="pricing-preview-grid">
            {PRICING_PREVIEW.map(plan => (
              <div key={plan.key} className={`price-preview-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && (
                  <div className="price-plan-popular">Mais popular</div>
                )}
                <div className="price-plan-name">{plan.name}</div>
                <div className="price-plan-amount">
                  <span className="price-plan-currency">R$</span>
                  <span className="price-plan-value">{plan.price}</span>
                  <span className="price-plan-period">/mês</span>
                </div>
                <ul className="price-plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="price-plan-feature">
                      <span className="price-plan-feature-check">
                        <IconCheck size={14} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/register?plan=${plan.key}`}
                  className={plan.popular ? 'btn-hero-primary' : 'btn-hero-secondary'}
                  style={{ justifyContent: 'center', fontSize: '0.875rem', padding: '10px 20px' }}
                >
                  {plan.popular ? 'Escolher Delivery' : `Escolher ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/plans" className="btn-hero-secondary" style={{ display: 'inline-flex' }}>
              Ver todos os planos e comparar →
            </Link>
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
      <footer className="footer-enhanced">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">
                Roteiri
                <span style={{ background: 'linear-gradient(135deg, var(--primary-bright), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  zador
                </span>
              </div>
              <p className="footer-brand-tagline">
                Plataforma de otimização de rotas para frotas brasileiras. Reduza custos, aumente entregas.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Produto</div>
              <ul className="footer-links">
                <li><Link to="/register">Criar conta</Link></li>
                <li><Link to="/login">Fazer login</Link></li>
                <li><Link to="/plans">Planos &amp; Preços</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Legal</div>
              <ul className="footer-links">
                <li><Link to="/termos-de-uso">Termos de Uso</Link></li>
                <li><Link to="/politica-de-privacidade">Privacidade &amp; LGPD</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Contato</div>
              <ul className="footer-links">
                <li><a href="mailto:contato@roteirizador.app">contato@roteirizador.app</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Roteirizador · Logística inteligente para o Brasil
            </span>
            <div className="footer-badges">
              <span className="footer-badge">
                <IconShield />
                LGPD
              </span>
              <span className="footer-badge">
                <IconLock />
                SSL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Home
