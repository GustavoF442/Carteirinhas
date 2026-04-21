import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const today = new Date().toISOString().split('T')[0];

    if (type === 'dashboard') {
      const [
        { count: totalAlunos },
        { count: votaramHoje },
        { count: embarcaramHoje },
        { count: totalOnibus },
        { count: totalMotoristas },
        { count: viagensHoje },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('daily_votes').select('*', { count: 'exact', head: true }).eq('data', today),
        supabase.from('boardings').select('*, trips!inner(data)', { count: 'exact', head: true }),
        supabase.from('buses').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('data', today),
      ]);

      return NextResponse.json({
        total_alunos: totalAlunos || 0,
        votaram_hoje: votaramHoje || 0,
        embarcaram_hoje: embarcaramHoje || 0,
        total_onibus: totalOnibus || 0,
        total_motoristas: totalMotoristas || 0,
        viagens_hoje: viagensHoje || 0,
      });
    }

    if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: votes } = await supabase
        .from('daily_votes')
        .select('data, tipo')
        .gte('data', weekAgoStr)
        .order('data');

      const { data: boardings } = await supabase
        .from('boardings')
        .select('horario, trips(data)')
        .gte('horario', weekAgo.toISOString());

      return NextResponse.json({ votes, boardings });
    }

    if (type === 'demand') {
      const days = parseInt(searchParams.get('days') || '7');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const { data: votes } = await supabase
        .from('daily_votes')
        .select('data, tipo')
        .gte('data', startStr)
        .order('data');

      // Group by date and calculate averages
      const dayMap: Record<string, number> = {};
      votes?.forEach((v) => {
        dayMap[v.data] = (dayMap[v.data] || 0) + 1;
      });

      const values = Object.values(dayMap);
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      return NextResponse.json({
        daily_counts: dayMap,
        media_diaria: Math.round(avg),
        previsao_amanha: Math.round(avg),
      });
    }

    if (type === 'full') {
      const days = parseInt(searchParams.get('days') || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      // Votes in period
      const { data: votes } = await supabase
        .from('daily_votes')
        .select('data, tipo, student_id, students(nome, curso)')
        .gte('data', startStr)
        .order('data');

      // Boardings in period
      const { data: boardings } = await supabase
        .from('boardings')
        .select('id, student_id, ponto_embarque, horario, trips!inner(data), students(nome, curso)')
        .gte('horario', startDate.toISOString());

      // All active students
      const { data: students } = await supabase
        .from('students')
        .select('id, nome, curso, universidade, ponto_embarque, ativo')
        .eq('ativo', true)
        .order('nome');

      // Group votes by date
      const votesByDate: Record<string, number> = {};
      const naoVaiByDate: Record<string, number> = {};
      votes?.forEach((v: { data: string; tipo: string }) => {
        if (v.tipo === 'nao_vai') {
          naoVaiByDate[v.data] = (naoVaiByDate[v.data] || 0) + 1;
        } else {
          votesByDate[v.data] = (votesByDate[v.data] || 0) + 1;
        }
      });

      // Group boardings by date
      const boardingsByDate: Record<string, number> = {};
      const boardingsByPonto: Record<string, number> = {};
      const boardingsByCurso: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boardings?.forEach((b: any) => {
        const tripData = Array.isArray(b.trips) ? b.trips[0] : b.trips;
        if (tripData?.data) {
          boardingsByDate[tripData.data] = (boardingsByDate[tripData.data] || 0) + 1;
        }
        if (b.ponto_embarque) {
          boardingsByPonto[b.ponto_embarque] = (boardingsByPonto[b.ponto_embarque] || 0) + 1;
        }
        const st = Array.isArray(b.students) ? b.students[0] : b.students;
        if (st?.curso) {
          boardingsByCurso[st.curso] = (boardingsByCurso[st.curso] || 0) + 1;
        }
      });

      // Students by ponto
      const studentsByPonto: Record<string, number> = {};
      students?.forEach((s: { ponto_embarque: string | null }) => {
        if (s.ponto_embarque) {
          studentsByPonto[s.ponto_embarque] = (studentsByPonto[s.ponto_embarque] || 0) + 1;
        }
      });

      // Students by curso
      const studentsByCurso: Record<string, number> = {};
      students?.forEach((s: { curso: string }) => {
        studentsByCurso[s.curso] = (studentsByCurso[s.curso] || 0) + 1;
      });

      // Calculate averages
      const voteValues = Object.values(votesByDate);
      const boardingValues = Object.values(boardingsByDate);
      const mediaVotos = voteValues.length > 0 ? voteValues.reduce((a, b) => a + b, 0) / voteValues.length : 0;
      const mediaEmbarques = boardingValues.length > 0 ? boardingValues.reduce((a, b) => a + b, 0) / boardingValues.length : 0;

      // Voted vs actually boarded comparison
      const dates = new Set([...Object.keys(votesByDate), ...Object.keys(boardingsByDate)]);
      const comparison = Array.from(dates).sort().map(d => ({
        data: d,
        votaram: votesByDate[d] || 0,
        embarcaram: boardingsByDate[d] || 0,
        nao_vai: naoVaiByDate[d] || 0,
      }));

      return NextResponse.json({
        periodo: { inicio: startStr, fim: today, dias: days },
        total_alunos_ativos: students?.length || 0,
        media_votos_dia: Math.round(mediaVotos * 10) / 10,
        media_embarques_dia: Math.round(mediaEmbarques * 10) / 10,
        comparison,
        boardings_by_ponto: boardingsByPonto,
        boardings_by_curso: boardingsByCurso,
        students_by_ponto: studentsByPonto,
        students_by_curso: studentsByCurso,
      });
    }

    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 });
  } catch (_error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
