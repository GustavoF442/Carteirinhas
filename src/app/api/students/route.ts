import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (userId) {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return NextResponse.json({ student });
    }

    const { data: students } = await supabase
      .from('students')
      .select('*')
      .order('nome');

    const res = NextResponse.json({ students: students || [] });
    res.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
    return res;
  } catch (_error) {
    return NextResponse.json({ students: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const qr_token = generateQRToken();

    const { data, error } = await supabase
      .from('students')
      .insert({ ...body, qr_token })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('audit_log').insert({
      action: 'student_created',
      table_name: 'students',
      record_id: data.id,
      details: { nome: data.nome },
    });

    return NextResponse.json({ student: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get student info for audit before deleting
    const { data: student } = await supabase
      .from('students')
      .select('id, nome, email, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    // Delete boardings first (foreign key)
    await supabase.from('boardings').delete().eq('student_id', id);

    // Delete daily_votes (foreign key)
    await supabase.from('daily_votes').delete().eq('student_id', id);

    // Delete student record
    const { error } = await supabase.from('students').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete auth user if exists
    if (student.user_id) {
      await supabase.auth.admin.deleteUser(student.user_id).catch(() => {});
    }

    // Audit log
    await supabase.from('audit_log').insert({
      action: 'student_deleted',
      table_name: 'students',
      record_id: id,
      details: { nome: student.nome, email: student.email },
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ student: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
