import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Transporte Universitário <noreply@resend.dev>';

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('[EMAIL] RESEND_API_KEY not configured. Skipping email to:', to);
    return { success: false, message: 'Email não configurado' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL] Send error:', error);
      return { success: false, message: error.message };
    }

    console.log('[EMAIL] Sent to', to, '— id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[EMAIL] Exception:', err);
    return { success: false, message: 'Erro ao enviar email' };
  }
}

// --- Email templates ---

export function votingReminderHtml(studentName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a2744, #2a1a3e); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Transporte Universitário</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">Prefeitura de São João Batista</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2744; margin: 0 0 12px;">Olá, ${studentName}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Você ainda <strong>não realizou sua votação de transporte hoje</strong>.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Acesse o sistema e informe se precisará do ônibus amanhã. Sua votação é importante para o planejamento das viagens.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carteirinhas.vercel.app'}/aluno/votacao"
             style="background: #1a2744; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Votar Agora
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Este é um email automático. Não responda.
        </p>
      </div>
    </div>
  `;
}

export function votingCompleteHtml(studentName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a2744, #2a1a3e); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Transporte Universitário</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">Prefeitura de São João Batista</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2744; margin: 0 0 12px;">Olá, ${studentName}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          A <strong>votação semanal de transporte foi concluída</strong>.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          As viagens da próxima semana já estão sendo planejadas com base nos resultados.
          Acompanhe pelo sistema a programação das viagens.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carteirinhas.vercel.app'}/aluno"
             style="background: #1a2744; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Acessar Sistema
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Este é um email automático. Não responda.
        </p>
      </div>
    </div>
  `;
}

export function registrationApprovedHtml(studentName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a2744, #2a1a3e); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Transporte Universitário</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">Prefeitura de São João Batista</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2744; margin: 0 0 12px;">Parabéns, ${studentName}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Seu <strong>cadastro foi aprovado</strong> pelo administrador!
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Agora você pode acessar o sistema de transporte universitário, realizar votações diárias e acompanhar suas viagens.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://carteirinhas.vercel.app'}/login"
             style="background: #16a34a; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Fazer Login
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Este é um email automático. Não responda.
        </p>
      </div>
    </div>
  `;
}

export function registrationRejectedHtml(studentName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a2744, #2a1a3e); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Transporte Universitário</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">Prefeitura de São João Batista</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2744; margin: 0 0 12px;">Olá, ${studentName}</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Infelizmente seu <strong>cadastro não foi aprovado</strong>.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Caso acredite que houve um engano, procure a administração do transporte universitário para mais informações.
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Este é um email automático. Não responda.
        </p>
      </div>
    </div>
  `;
}
