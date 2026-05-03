import React, { useState, useEffect, Fragment } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { billingService, getToken } from '../services/api'

const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: 39,
    routesPerDay: 1,
    maxWaypoints: 100,
    features: ['1 rota por dia', 'Até 100 paradas', 'Importação NFe', 'CEP automático', 'Histórico de rotas'],
    popular: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 89,
    routesPerDay: 3,
    maxWaypoints: 100,
    features: ['3 rotas por dia', 'Até 100 paradas', 'Importação NFe', 'CEP automático', 'Histórico de rotas'],
    popular: false,
  },
  {
    key: 'delivery',
    name: 'Delivery',
    price: 149,
    routesPerDay: 5,
    maxWaypoints: 150,
    features: ['5 rotas por dia', 'Até 150 paradas', 'Importação NFe', 'CEP automático', 'Histórico de rotas', 'Multi-veículo'],
    popular: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 299,
    routesPerDay: 10,
    maxWaypoints: 200,
    features: ['10 rotas por dia', 'Até 200 paradas', 'Importação NFe', 'CEP automático', 'Histórico de rotas', 'Multi-veículo', 'Suporte prioritário'],
    popular: false,
  },
]

function SubscribeModal({ plan, user, onClose, onSuccess }) {
  const [billingType, setBillingType] = useState('PIX')
  const [cpfCnpj, setCpfCnpj] = useState(user?.cpf_cnpj || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const needsCpf = billingType !== 'CREDIT_CARD'

  const formatCpfCnpj = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11)
      return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  const handleSubmit = async () => {
    const digits = cpfCnpj.replace(/\D/g, '')
    if (needsCpf && digits.length !== 11 && digits.length !== 14) {
      setError('CPF (11 dígitos) ou CNPJ (14 dígitos) obrigatório para PIX e Boleto.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await billingService.subscribe(plan.key, billingType, needsCpf ? cpfCnpj.replace(/\D/g, '') : undefined)
      if (res.data.payment_url) {
        window.open(res.data.payment_url, '_blank')
      }
      onSuccess()
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      // Se 401, redireciona pro login
      if (status === 401) {
        navigate('/login')
        return
      }

      setError(detail || 'Erro ao processar assinatura. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: 'clamp(1.25rem, 5vw, 2rem)', maxWidth: 440, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <h2 style={{ color: 'var(--text-1)', marginBottom: 4, fontSize: '1.3rem' }}>
          Assinar plano {plan.name}
        </h2>
        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          R$ {plan.price}/mês · Cancele quando quiser
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Forma de pagamento
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['PIX', 'CREDIT_CARD', 'BOLETO'].map(bt => (
              <button
                key={bt}
                type="button"
                onClick={() => setBillingType(bt)}
                style={{
                  flex: '1 1 70px', minWidth: 0, padding: '0.6rem 0.4rem',
                  border: `1.5px solid ${billingType === bt ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 8, background: billingType === bt ? 'rgba(37,99,235,0.12)' : 'transparent',
                  color: billingType === bt ? 'var(--primary-light)' : 'var(--text-2)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {bt === 'PIX' ? 'PIX' : bt === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
              </button>
            ))}
          </div>
        </div>

        {needsCpf && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CPF ou CNPJ
            </label>
            <input
              type="text"
              value={cpfCnpj}
              onChange={e => setCpfCnpj(formatCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              inputMode="numeric"
              maxLength={18}
              style={{
                width: '100%', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)',
                fontSize: '0.9rem', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', marginBottom: '0.75rem' }}
        >
          {loading ? 'Processando...' : `Confirmar assinatura — R$ ${plan.price}/mês`}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Cancelar
        </button>

        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '1rem', textAlign: 'center' }}>
          Pagamento processado com segurança pelo Asaas. Você será redirecionado para concluir o pagamento.
        </p>
      </div>
    </div>
  )
}

function Plans({ user }) {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [localUser, setLocalUser] = useState(user)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isWelcome = params.get('welcome') === '1'
  const isLoggedIn = !!getToken() || !!user

  useEffect(() => {
    setLocalUser(user)
  }, [user])

  const handleSelectPlan = (plan) => {
    if (!isLoggedIn || !user) {
      navigate(`/register?plan=${plan.key}`)
      return
    }
    setSelectedPlan(plan)
  }

  const handleSuccess = () => {
    setSelectedPlan(null)
    setSubscribed(true)
  }

  return (
    <>
      {/* Welcome banner */}
      {isWelcome && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.1))',
          borderBottom: '1px solid rgba(37,99,235,0.2)',
          padding: '0.85rem 1rem', textAlign: 'center',
        }}>
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
            Conta criada! Você tem <strong style={{ color: '#34d399' }}>3 dias grátis</strong> para testar.
            Assine agora e não perca o acesso.
          </span>
        </div>
      )}

      {subscribed && (
        <div style={{
          background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid rgba(16,185,129,0.25)',
          padding: '0.85rem 1rem', textAlign: 'center',
        }}>
          <span style={{ color: '#34d399', fontWeight: 600 }}>
            Assinatura iniciada! Complete o pagamento na janela que abriu.
            Após confirmação, seu plano será ativado.{' '}
            <Link to="/dashboard" style={{ color: '#34d399', textDecoration: 'underline' }}>Ir para o painel →</Link>
          </span>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.25rem, 4vw, 3rem) clamp(1rem, 4vw, 1.5rem) clamp(2rem, 5vw, 4rem)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 3.5rem)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 100, padding: '0.35rem 1rem', marginBottom: '1.25rem',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Planos & Preços
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem', lineHeight: 1.2 }}>
            Escolha o plano{' '}
            <span style={{ background: 'linear-gradient(135deg, #2563EB, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              certo para você
            </span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
            Comece com 3 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        {/* Trial card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.06))',
          border: '1px solid rgba(37,99,235,0.25)', borderRadius: 16,
          padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 2rem)', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
              Trial Gratuito — 3 dias
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              1 rota/dia · 50 paradas · Acesso completo à plataforma
            </div>
          </div>
          {!isLoggedIn && (
            <Link to="/register" style={{
              padding: '0.7rem 1.5rem', background: 'var(--primary)', color: 'white',
              borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
              whiteSpace: 'nowrap', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.9'}
            onMouseLeave={e => e.target.style.opacity = '1'}>
              Começar grátis →
            </Link>
          )}
          {isLoggedIn && localUser?.plan === 'tester' && (
            <Link to="/dashboard" style={{
              padding: '0.7rem 1.5rem', background: 'rgba(52,211,153,0.15)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.35)', borderRadius: 8, fontSize: '0.9rem',
              fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(52,211,153,0.25)'; e.target.style.borderColor = 'rgba(52,211,153,0.5)' }}
            onMouseLeave={e => { e.target.style.background = 'rgba(52,211,153,0.15)'; e.target.style.borderColor = 'rgba(52,211,153,0.35)' }}>
              ✓ Ir para painel
            </Link>
          )}
        </div>

        {/* Plan cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1.25rem)',
        }}>
          {PLANS.map(plan => (
            <div
              key={plan.key}
              style={{
                background: plan.popular ? 'linear-gradient(160deg, rgba(37,99,235,0.12), rgba(37,99,235,0.04))' : 'var(--card)',
                border: `1.5px solid ${plan.popular ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`,
                borderRadius: 16, padding: 'clamp(1.25rem, 3vw, 1.75rem) clamp(1rem, 3vw, 1.5rem)',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translate(-50%, -50%)',
                  background: 'var(--primary)', color: 'white',
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 1rem',
                  borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  Mais popular
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500 }}>R$</span>
                  <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>/mês</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex', gap: 10, marginBottom: '0.75rem',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.75rem',
                }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '1.2rem' }}>{plan.routesPerDay}</div>
                    <div style={{ color: 'var(--text-2)', fontSize: '0.7rem' }}>rota(s)/dia</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '1.2rem' }}>{plan.maxWaypoints}</div>
                    <div style={{ color: 'var(--text-2)', fontSize: '0.7rem' }}>paradas</div>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                      <span style={{ color: '#34d399', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 'auto' }}>
                {isLoggedIn && localUser?.plan === plan.key && localUser?.plan_status === 'active' ? (
                  <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 600, padding: '0.7rem', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, fontSize: '0.9rem' }}>
                    ✓ Plano atual
                  </div>
                ) : (
                  <button
                    className={plan.popular ? 'btn-primary' : ''}
                    onClick={() => handleSelectPlan(plan)}
                    style={!plan.popular ? {
                      width: '100%', padding: '0.7rem', background: 'transparent',
                      border: '1.5px solid var(--border)', borderRadius: 8,
                      color: 'var(--text-1)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                      transition: 'border-color 0.15s',
                    } : { width: '100%' }}
                    onMouseEnter={e => !plan.popular && (e.target.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => !plan.popular && (e.target.style.borderColor = 'var(--border)')}
                  >
                    {isLoggedIn ? 'Assinar agora' : 'Começar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 'clamp(1rem, 3vw, 1.75rem) clamp(1rem, 3vw, 2rem)', marginTop: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
              Enterprise
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              Rotas ilimitadas · Paradas ilimitadas · Suporte dedicado · Preço sob consulta
            </div>
          </div>
          <a
            href="mailto:contato@roteirizador.app"
            style={{
              padding: '0.65rem 1.5rem', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-1)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            Falar com vendas →
          </a>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 'clamp(2rem, 5vw, 3.5rem)' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--text-1)', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 700, marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
            Perguntas frequentes
          </h2>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { q: 'Preciso de cartão para o trial?', a: 'Não. Crie sua conta e use gratuitamente por 3 dias, sem informar dados de pagamento.' },
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Cancele quando quiser pelo painel, sem multa e sem burocracia.' },
              { q: 'O que acontece ao fim do trial?', a: 'Seu acesso é pausado. Escolha um plano para continuar. Seus dados ficam preservados.' },
              { q: 'Quais formas de pagamento aceitas?', a: 'PIX, cartão de crédito e boleto bancário, processados pelo Asaas.' },
              { q: 'Posso trocar de plano?', a: 'Sim. Faça upgrade ou downgrade a qualquer momento. A mudança é imediata.' },
            ].map(({ q, a }, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 'clamp(1rem, 3vw, 1.25rem) clamp(1rem, 3vw, 1.5rem)' }}>
                <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 6 }}>{q}</div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedPlan && (
        <SubscribeModal
          plan={selectedPlan}
          user={localUser}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}

export default Plans
