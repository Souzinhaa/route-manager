import React from 'react'
import { Link } from 'react-router-dom'

export default function TermosDeUso() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem)' }}>
      <Link to="/register" style={{ color: 'var(--text-2)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '2rem' }}>
        ← Voltar
      </Link>

      <h1 style={{ color: 'var(--text-1)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '0.5rem' }}>
        Termos de Uso
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
        Última atualização: maio de 2025
      </p>

      {[
        {
          title: '1. Aceitação dos Termos',
          body: 'Ao criar uma conta no Roteirizador, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.',
        },
        {
          title: '2. Descrição do Serviço',
          body: 'O Roteirizador é uma plataforma de otimização de rotas de entrega. Oferecemos planos gratuitos (trial) e pagos, com diferentes limites de uso.',
        },
        {
          title: '3. Cadastro e Conta',
          body: 'Você é responsável por manter suas credenciais seguras. É proibido criar múltiplas contas para contornar limites do trial. Um CPF/CNPJ pode ser vinculado a apenas uma conta.',
        },
        {
          title: '4. Uso Aceitável',
          body: 'É proibido usar o serviço para fins ilegais, fazer engenharia reversa, sobrecarregar nossa infraestrutura ou revender acesso sem autorização.',
        },
        {
          title: '5. Pagamentos',
          body: 'Planos pagos são cobrados mensalmente via PIX, boleto ou cartão de crédito, processados pelo Asaas. O cancelamento encerra a cobrança no próximo ciclo.',
        },
        {
          title: '6. Propriedade Intelectual',
          body: 'Todo o código, design e conteúdo do Roteirizador são de nossa propriedade. Seus dados de rotas permanecem seus.',
        },
        {
          title: '7. Limitação de Responsabilidade',
          body: 'O serviço é oferecido "como está". Não garantimos 100% de disponibilidade. Não nos responsabilizamos por perdas decorrentes do uso do serviço.',
        },
        {
          title: '8. Alterações',
          body: 'Podemos atualizar estes termos. Notificaremos por email em caso de mudanças relevantes.',
        },
        {
          title: '9. Contato',
          body: 'Dúvidas: contato@roteirizador.app',
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--text-1)', fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{title}</h2>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.92rem' }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
