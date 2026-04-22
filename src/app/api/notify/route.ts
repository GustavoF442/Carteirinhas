import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendEmail,
  votingReminderHtml,
  votingCompleteHtml,
  registrationApprovedHtml,
  registrationRejectedHtml,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;
    const supabase = createAdminClient();

    if (type === 'voting_reminder') {
      const today = new Date().toISOString().split('T')[0];

      const { data: allStudents } = await supabase
        .from('students')
        .select('id, email, nome')
        .eq('ativo', true)
        .eq('aprovado', true);

      const { data: todayVotes } = await supabase
        .from('daily_votes')
        .select('student_id')
        .eq('data', today);

      const votedIds = new Set((todayVotes || []).map(v => v.student_id));
      const notVoted = (allStudents || []).filter(s => !votedIds.has(s.id));

      if (notVoted.length === 0) {
        return NextResponse.json({ success: true, message: 'Todos já votaram hoje.', count: 0 });
      }

      let sent = 0;
      let failed = 0;
      for (const student of notVoted) {
        const result = await sendEmail(
          student.email,
          'Lembrete: Votação de transporte pendente',
          votingReminderHtml(student.nome),
        );
        if (result.success) sent++;
        else failed++;
      }

      await supabase.from('audit_log').insert({
        action: 'voting_reminder_sent',
        table_name: 'daily_votes',
        record_id: today,
        details: { total_notified: sent, failed, date: today },
      });

      return NextResponse.json({
        success: true,
        message: `Lembrete enviado para ${sent} aluno(s) que ainda não votaram.${failed > 0 ? ` ${failed} falharam.` : ''}`,
        count: sent,
        failed,
        students: notVoted.map(s => ({ nome: s.nome, email: s.email })),
      });
    }

    if (type === 'voting_complete') {
      const { data: students } = await supabase
        .from('students')
        .select('id, email, nome')
        .eq('ativo', true)
        .eq('aprovado', true);

      let sent = 0;
      let failed = 0;
      for (const student of (students || [])) {
        const result = await sendEmail(
          student.email,
          'Votação semanal concluída',
          votingCompleteHtml(student.nome),
        );
        if (result.success) sent++;
        else failed++;
      }

      await supabase.from('audit_log').insert({
        action: 'voting_complete_notification',
        table_name: 'daily_votes',
        record_id: new Date().toISOString().split('T')[0],
        details: { total_notified: sent, failed },
      });

      return NextResponse.json({
        success: true,
        message: `Aviso de votação concluída enviado para ${sent} aluno(s).${failed > 0 ? ` ${failed} falharam.` : ''}`,
        count: sent,
        failed,
      });
    }

    if (type === 'registration_approved') {
      const { student_email, student_name } = body;
      if (!student_email) {
        return NextResponse.json({ error: 'student_email obrigatório' }, { status: 400 });
      }

      const result = await sendEmail(
        student_email,
        'Seu cadastro foi aprovado!',
        registrationApprovedHtml(student_name || 'Estudante'),
      );

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Notificação de aprovação enviada para ${student_email}.`
          : `Falha ao enviar para ${student_email}: ${result.message}`,
      });
    }

    if (type === 'registration_rejected') {
      const { student_email, student_name } = body;
      if (!student_email) {
        return NextResponse.json({ error: 'student_email obrigatório' }, { status: 400 });
      }

      const result = await sendEmail(
        student_email,
        'Atualização sobre seu cadastro',
        registrationRejectedHtml(student_name || 'Estudante'),
      );

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Notificação de rejeição enviada para ${student_email}.`
          : `Falha ao enviar para ${student_email}: ${result.message}`,
      });
    }

    return NextResponse.json({ error: 'Tipo de notificação inválido' }, { status: 400 });
  } catch (_error) {
    console.error('Notification error:', _error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
