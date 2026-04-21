import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Support both single vote and weekly votes
    if (body.votes && Array.isArray(body.votes)) {
      // Weekly votes: [{ student_id, data, tipo }]
      const results = [];
      for (const vote of body.votes) {
        const { data, error } = await supabase
          .from('daily_votes')
          .upsert(
            { student_id: vote.student_id, data: vote.data, tipo: vote.tipo },
            { onConflict: 'student_id,data' }
          )
          .select()
          .single();

        if (error) {
          results.push({ data: vote.data, error: error.message });
        } else {
          results.push({ data: vote.data, success: true, vote: data });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    // Single vote (legacy)
    const { student_id, tipo } = body;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_votes')
      .upsert(
        { student_id, data: today, tipo },
        { onConflict: 'student_id,data' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, vote: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get('student_id');
    const data = searchParams.get('data');

    if (!student_id || !data) {
      return NextResponse.json({ error: 'student_id e data obrigatórios' }, { status: 400 });
    }

    await supabase
      .from('daily_votes')
      .delete()
      .eq('student_id', student_id)
      .eq('data', data);

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get('student_id');
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
    const week = searchParams.get('week'); // "2024-01-15" start of week

    // Get votes for entire week
    if (student_id && week) {
      const weekStart = new Date(week);
      const dates: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const { data: votes } = await supabase
        .from('daily_votes')
        .select('*')
        .eq('student_id', student_id)
        .in('data', dates);

      return NextResponse.json({ votes: votes || [], dates });
    }

    if (student_id) {
      const { data: vote } = await supabase
        .from('daily_votes')
        .select('*')
        .eq('student_id', student_id)
        .eq('data', data)
        .single();

      return NextResponse.json({ vote });
    }

    // Admin: get all votes for a date
    const { data: votes, count } = await supabase
      .from('daily_votes')
      .select('*, students(nome, curso)', { count: 'exact' })
      .eq('data', data);

    return NextResponse.json({ votes, count });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
