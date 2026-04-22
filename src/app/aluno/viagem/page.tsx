'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface TodayBoarding {
  id: string;
  horario: string;
  ponto_embarque: string | null;
  trip: {
    id: string;
    data: string;
    status: string;
    horario_saida: string | null;
    route_origem: string;
    route_destino: string;
    bus_placa: string;
    bus_modelo: string;
    driver_nome: string;
  } | null;
}

export default function ViagemDoDiaPage() {
  const [studentId, setStudentId] = useState('');
  const [boardings, setBoardings] = useState<TodayBoarding[]>([]);
  const [naoRetorna, setNaoRetorna] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: student } = await supabase
        .from('students')
        .select('id, nao_retorna')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!student) { setLoading(false); return; }
      setStudentId(student.id);
      setNaoRetorna(student.nao_retorna || false);

      // Load today's boardings
      const today = new Date().toISOString().split('T')[0];
      const { data: boardingData } = await supabase
        .from('boardings')
        .select('id, horario, ponto_embarque, trips(id, data, status, horario_saida, routes(origem, destino), buses(placa, modelo), drivers(nome))')
        .eq('student_id', student.id)
        .gte('horario', `${today}T00:00:00`)
        .lte('horario', `${today}T23:59:59`)
        .order('horario', { ascending: false });

      if (boardingData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: TodayBoarding[] = boardingData.map((b: any) => {
          const t = Array.isArray(b.trips) ? b.trips[0] : b.trips;
          const r = t ? (Array.isArray(t.routes) ? t.routes[0] : t.routes) : null;
          const bus = t ? (Array.isArray(t.buses) ? t.buses[0] : t.buses) : null;
          const drv = t ? (Array.isArray(t.drivers) ? t.drivers[0] : t.drivers) : null;
          return {
            id: b.id,
            horario: b.horario,
            ponto_embarque: b.ponto_embarque,
            trip: t ? {
              id: t.id,
              data: t.data,
              status: t.status,
              horario_saida: t.horario_saida,
              route_origem: r?.origem || '',
              route_destino: r?.destino || '',
              bus_placa: bus?.placa || '',
              bus_modelo: bus?.modelo || '',
              driver_nome: drv?.nome || '',
            } : null,
          };
        });
        setBoardings(mapped);
      }
    } catch (_err) {
      console.error('Error loading viagem do dia:', _err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleNaoRetorna = async () => {
    if (!studentId) return;
    setSaving(true);
    const newValue = !naoRetorna;

    const supabase = createClient();
    const { error } = await supabase
      .from('students')
      .update({ nao_retorna: newValue })
      .eq('id', studentId);

    if (!error) {
      setNaoRetorna(newValue);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Viagem do Dia</h1>

      {/* Não retorna toggle */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Aviso de retorno</h2>
            <p className="text-sm text-gray-500 mt-1">
              {naoRetorna
                ? 'Você sinalizou que NÃO voltará no ônibus hoje. O motorista foi avisado.'
                : 'Marque abaixo se não precisar do ônibus na volta hoje.'}
            </p>
          </div>
          <Button
            variant={naoRetorna ? 'danger' : 'secondary'}
            size="sm"
            onClick={toggleNaoRetorna}
            loading={saving}
          >
            {naoRetorna ? 'Cancelar aviso' : 'Não voltarei hoje'}
          </Button>
        </div>
        {naoRetorna && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            O motorista foi notificado que você não retornará hoje. Se mudar de ideia, cancele o aviso acima.
          </div>
        )}
      </Card>

      {/* Today's boardings */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Embarques de Hoje</h2>

      {boardings.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-6">
            Nenhum embarque registrado hoje. Quando o motorista escanear sua carteirinha, a viagem aparecerá aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {boardings.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    b.trip?.status === 'active' ? 'bg-green-100 text-green-700' :
                    b.trip?.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {b.trip?.status === 'active' ? 'Em andamento' :
                     b.trip?.status === 'completed' ? 'Concluída' : 'Agendada'}
                  </span>
                  <span className="text-sm text-gray-500">Embarque: {formatTime(b.horario)}</span>
                </div>
                {b.trip && (
                  <>
                    <p className="font-semibold text-gray-900">
                      {b.trip.route_origem} → {b.trip.route_destino}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                      <span>Ônibus: {b.trip.bus_placa} ({b.trip.bus_modelo})</span>
                      <span>Motorista: {b.trip.driver_nome}</span>
                      {b.ponto_embarque && <span>Ponto: {b.ponto_embarque}</span>}
                      {b.trip.horario_saida && <span>Saída: {b.trip.horario_saida.slice(0, 5)}</span>}
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
