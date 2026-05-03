import React from 'react'
import { Link } from 'react-router-dom'

export default function PoliticaDePrivacidade() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem)' }}>
      <Link to="/register" style={{ color: 'var(--text-2)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '2rem' }}>
        ← Voltar
      </Link>

      <h1 style={{ color: 'var(--text-1)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '0.5rem' }}>
        Política de Privacidade
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
        Última atualização: maio de 2025 · Conforme a LGPD (Lei nº 13.709/2018)
      </p>

      {[
        {
          title: '1. Controlador dos Dados',
          body: 'O Roteirizador é o controlador dos seus dados pessoais. Contato do encarregado (DPO): contato@roteirizador.app',
        },
        {
          title: '2. Dados Coletados',
          body: 'Coletamos: nome completo, endereço de e-mail, CPF ou CNPJ, endereços de entrega informados nas rotas, dados de pagamento (processados pelo Asaas — não armazenamos dados de cartão), IP e data/hora do consentimento.',
        },
        {
          title: '3. Finalidade e Base Legal',
          body: 'Seus dados são usados para: criação e gerenciamento de conta (execução de contrato), processamento de pagamentos (execução de contrato), prevenção de fraudes e múltiplos cadastros (legítimo interesse e cumprimento de obrigação legal), conformidade fiscal (obrigação legal). Base legal principal: Art. 7º, incisos V e II da LGPD.',
        },
        {
          title: '4. Compartilhamento de Dados',
          body: 'Compartilhamos dados apenas com: Asaas (processador de pagamentos), provedores de infraestrutura (Render, Neon, Vercel) sob obrigação contratual de sigilo. Não vendemos dados a terceiros.',
        },
        {
          title: '5. Retenção',
          body: 'Dados de conta são mantidos enquanto a conta estiver ativa. Após exclusão, mantemos dados fiscais pelo prazo legal (5 anos). Dados de rotas são excluídos em até 90 dias após encerramento da conta.',
        },
        {
          title: '6. Seus Direitos (LGPD Art. 18)',
          body: 'Você pode a qualquer momento: acessar seus dados, corrigir dados incorretos, solicitar exclusão da conta e dados, revogar consentimento, solicitar portabilidade. Para exercer qualquer direito, envie e-mail para contato@roteirizador.app.',
        },
        {
          title: '7. Cookies',
          body: 'Utilizamos cookies de sessão (httpOnly) para autenticação. Não utilizamos cookies de rastreamento ou publicidade.',
        },
        {
          title: '8. Segurança',
          body: 'Senhas são armazenadas com bcrypt. Comunicação via HTTPS. Tokens de sessão com expiração automática.',
        },
        {
          title: '9. Alterações',
          body: 'Notificaremos por e-mail em caso de mudanças relevantes nesta política.',
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--text-1)', fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{title}</h2>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.92rem', whiteSpace: 'pre-line' }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
