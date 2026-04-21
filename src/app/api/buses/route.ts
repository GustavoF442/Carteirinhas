import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: buses } = await supabase
      .from('buses')
      .select('*')
      .order('placa');

    return NextResponse.json({ buses: buses || [] });
  } catch (_error) {
    return NextResponse.json({ buses: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('buses')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bus: data });
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
      .from('buses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bus: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
