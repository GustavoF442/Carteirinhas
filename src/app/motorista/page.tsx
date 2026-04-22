'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { Trip } from '@/lib/types';

export default function MotoristaViagens() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!driver) { setLoading(false); return; }

        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('trips')
          .select('*, buses(*), drivers(*), routes(*), boardings(count)')
          .eq('driver_id', driver.id)
          .gte('data', today)
          .order('data', { ascending: true });

        setTrips((data as Trip[]) || []);
      } catch (_err) {
        console.error('Error loading trips:', _err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleStartTrip = async (tripId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('trips')
      .update({ status: 'active', horario_inicio: new Date().toISOString() })
      .eq('id', tripId);

    if (!error) {
      setTrips(prev =>
        prev.map(t => t.id === tripId ? { ...t, status: 'active', horario_inicio: new Date().toISOString() } : t)
      );
    }
  };

  const handleEndTrip = async (tripId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('trips')
      .update({ status: 'completed', horario_fim: new Date().toISOString() })
      .eq('id', tripId);

    if (!error) {
      setTrips(prev =>
        prev.map(t => t.id === tripId ? { ...t, status: 'completed', horario_fim: new Date().toISOString() } : t)
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabel: Record<string, string> = {
    scheduled: 'Agendada',
    active: 'Em Andamento',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Minhas Viagens</h1>

      {trips.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">Nenhuma viagem agendada.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const boardingCount = ((trip.boardings as unknown as {count: number}[])?.[0]?.count) || 0;
            const capacity = trip.buses?.capacidade || 44;

            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[trip.status]}`}>
                        {statusLabel[trip.status]}
                      </span>
                      {trip.horario_saida && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Saída: {trip.horario_saida.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">
                      {trip.routes?.origem} → {trip.routes?.destino}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(trip.data)}</span>
                      <span>{trip.buses?.placa} - {trip.buses?.modelo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Passageiros: {boardingCount}/{capacity}
                      </span>
                      {boardingCount >= capacity && (
                        <span className="text-xs text-red-600 font-semibold">LOTADO</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {trip.status === 'scheduled' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.location.href = `/motorista/scanner?trip_id=${trip.id}`}
                        >
                          Scanner
                        </Button>
                        <Button onClick={() => handleStartTrip(trip.id)} size="sm">
                          Iniciar Viagem
                        </Button>
                      </>
                    )}
                    {trip.status === 'active' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.location.href = `/motorista/scanner?trip_id=${trip.id}`}
                        >
                          Scanner
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleEndTrip(trip.id)}>
                          Encerrar Viagem
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
