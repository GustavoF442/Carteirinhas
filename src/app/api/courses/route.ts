import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      // Table might not exist yet — return empty
      console.warn('[COURSES] Table error:', error.message);
      return NextResponse.json({ courses: [] });
    }

    return NextResponse.json({ courses: data || [] });
  } catch (_error) {
    return NextResponse.json({ courses: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, universidade } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do curso é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check for duplicate
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .ilike('nome', nome.trim())
      .eq('universidade', universidade || 'UNIFEBE')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Este curso já existe' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ nome: nome.trim(), universidade: universidade || 'UNIFEBE', ativo: true })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ course: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ course: data });
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
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
