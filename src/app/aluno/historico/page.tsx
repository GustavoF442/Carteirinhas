'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import { formatDateTime } from '@/lib/utils';
interface BoardingRecord {
  id: string;
  horario: string;
  trips: {
    data: string;
    horario_saida: string | null;
    routes: { origem: string; destino: string };
    buses: { placa: string; modelo: string };
  };
}

export default function HistoricoPage() {
  const [boardings, setBoardings] = useState<BoardingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!student) { setLoading(false); return; }

        const { data } = await supabase
          .from('boardings')
          .select('*, trips(data, horario_saida, routes(origem, destino), buses(placa, modelo))')
          .eq('student_id', student.id)
          .order('horario', { ascending: false })
          .limit(50);

        setBoardings(data || []);
      } catch (_err) {
        console.error('Error loading boardings:', _err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Embarques</h1>

      {boardings.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">Nenhum embarque registrado ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {boardings.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {b.trips?.horario_saida && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Saída: {b.trips.horario_saida.slice(0, 5)}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {b.trips?.buses?.placa} - {b.trips?.buses?.modelo}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {b.trips?.routes?.origem} → {b.trips?.routes?.destino}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(b.horario)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
