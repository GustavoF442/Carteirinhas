import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Código não fornecido' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find student by qr_token — exact, case-insensitive, or partial (first N chars)
    let student = null;
    let studentErr = null;

    // Try exact match first
    const { data: s1, error: e1 } = await supabase
      .from('students')
      .select('id, user_id, email, nome, ativo')
      .eq('qr_token', code)
      .maybeSingle();

    if (s1) {
      student = s1;
      studentErr = e1;
    } else {
      // Try case-insensitive partial match (token starts with code)
      const { data: s2, error: e2 } = await supabase
        .from('students')
        .select('id, user_id, email, nome, ativo')
        .ilike('qr_token', `${code}%`)
        .maybeSingle();
      student = s2;
      studentErr = e2;
    }

    if (studentErr || !student) {
      return NextResponse.json(
        { error: 'Código não encontrado. Verifique e tente novamente.' },
        { status: 404 }
      );
    }

    if (!student.ativo) {
      return NextResponse.json(
        { error: 'Carteirinha desativada. Procure a administração.' },
        { status: 403 }
      );
    }

    // Set a known temporary password, sign the user in, then restore
    const tempPassword = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Update password to temp value
    const { error: updateErr } = await supabase.auth.admin.updateUserById(student.user_id, {
      password: tempPassword,
    });

    if (updateErr) {
      console.error('Barcode login - update password error:', updateErr);
      return NextResponse.json({ error: 'Erro ao autenticar. Tente login por email.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: student.email,
      temp_password: tempPassword,
      student_id: student.id,
      nome: student.nome,
    });
  } catch (_error) {
    console.error('Barcode login error:', _error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
