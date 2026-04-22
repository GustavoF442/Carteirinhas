import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import type { ScanResponse } from '@/lib/types';
import { sanitizeInput, sanitizeForLike } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { qr_token: rawToken, trip_id: rawTripId } = await request.json();

    if (!rawToken || !rawTripId || typeof rawToken !== 'string' || typeof rawTripId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'qr_token e trip_id são obrigatórios' },
        { status: 400 }
      );
    }

    const qr_token = sanitizeInput(rawToken, 200);
    const trip_id = sanitizeInput(rawTripId, 100);

    const supabase = createAdminClient();

    // Lookup by qr_token — exact first, then partial (case-insensitive)
    let student = null;
    const { data: s1 } = await supabase
      .from('students')
      .select('id, nome, curso, universidade, foto_url, ativo, ponto_embarque')
      .eq('qr_token', qr_token)
      .maybeSingle();

    if (s1) {
      student = s1;
    } else {
      const safeToken = sanitizeForLike(qr_token);
      const { data: s2 } = await supabase
        .from('students')
        .select('id, nome, curso, universidade, foto_url, ativo, ponto_embarque')
        .ilike('qr_token', `${safeToken}%`)
        .maybeSingle();
      student = s2;
    }

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'QR Code não encontrado' },
        { status: 404 }
      );
    }

    if (!student.ativo) {
      return NextResponse.json(
        { success: false, message: 'Aluno inativo' },
        { status: 403 }
      );
    }

    // Check for duplicate boarding
    const { data: existingBoarding } = await supabase
      .from('boardings')
      .select('id')
      .eq('trip_id', trip_id)
      .eq('student_id', student.id)
      .single();

    if (existingBoarding) {
      // Get current count even for duplicates
      const { count } = await supabase
        .from('boardings')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip_id);

      const { data: trip } = await supabase
        .from('trips')
        .select('bus_id, buses(capacidade)')
        .eq('id', trip_id)
        .single();

      const capacidade = (trip?.buses as unknown as { capacidade: number } | null)?.capacidade || 44;

      return NextResponse.json({
        success: false,
        message: 'Aluno já embarcou nesta viagem',
        nome: student.nome,
        curso: student.curso,
        universidade: student.universidade,
        foto_url: student.foto_url,
        contador_atual: count || 0,
        capacidade,
        alerta_superlotacao: (count || 0) >= capacidade,
      } as ScanResponse);
    }

    // Register boarding with student's default boarding point
    const { error: boardingError } = await supabase
      .from('boardings')
      .insert({
        trip_id,
        student_id: student.id,
        ponto_embarque: student.ponto_embarque || null,
        horario: new Date().toISOString(),
      });

    if (boardingError) {
      return NextResponse.json(
        { success: false, message: 'Erro ao registrar embarque' },
        { status: 500 }
      );
    }

    // Get updated count
    const { count } = await supabase
      .from('boardings')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', trip_id);

    // Get bus capacity
    const { data: trip } = await supabase
      .from('trips')
      .select('bus_id, buses(capacidade)')
      .eq('id', trip_id)
      .single();

    const capacidade = (trip?.buses as unknown as { capacidade: number } | null)?.capacidade || 44;
    const contador_atual = count || 0;

    // Audit log
    await supabase.from('audit_log').insert({
      action: 'boarding',
      table_name: 'boardings',
      record_id: student.id,
      details: { trip_id, student_nome: student.nome },
    });

    return NextResponse.json({
      success: true,
      nome: student.nome,
      curso: student.curso,
      universidade: student.universidade,
      foto_url: student.foto_url,
      contador_atual,
      capacidade,
      alerta_superlotacao: contador_atual >= capacidade,
    } as ScanResponse);
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
