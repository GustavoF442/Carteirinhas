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

    return NextResponse.json({ students: students || [] });
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
