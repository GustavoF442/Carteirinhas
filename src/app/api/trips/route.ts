import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('data');
    const driverId = searchParams.get('driver_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('trips')
      .select('*, buses(*), drivers(*), routes(*), boardings(count)')
      .order('data', { ascending: false })
      .limit(50);

    if (date) query = query.eq('data', date);
    if (driverId) query = query.eq('driver_id', driverId);
    if (status) query = query.eq('status', status);

    const { data: trips, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trips: trips || [] });
  } catch (_error) {
    return NextResponse.json({ trips: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('trips')
      .insert(body)
      .select('*, buses(*), drivers(*), routes(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('audit_log').insert({
      action: 'trip_created',
      table_name: 'trips',
      record_id: data.id,
      details: { data: data.data, horario_saida: data.horario_saida },
    });

    return NextResponse.json({ trip: data });
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
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select('*, buses(*), drivers(*), routes(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trip: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardingId = searchParams.get('boarding_id');
    
    if (!boardingId) {
      return NextResponse.json({ error: 'boarding_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('boardings')
      .delete()
      .eq('id', boardingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
