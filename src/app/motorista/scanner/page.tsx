'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import QRScanner from '@/components/QRScanner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ScanResponse, Trip } from '@/lib/types';

interface BoardingEntry {
  id: string;
  nome: string;
  curso: string;
  foto_url: string | null;
  horario: string;
}

interface CachedStudent {
  id: string;
  nome: string;
  curso: string;
  universidade: string;
  foto_url: string | null;
  qr_token: string;
  ativo: boolean;
}

export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    }>
      <ScannerContent />
    </Suspense>
  );
}

function ScannerContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get('trip_id');

  const [scanning, setScanning] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [boardings, setBoardings] = useState<BoardingEntry[]>([]);
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(44);
  const [localCache, setLocalCache] = useState<Map<string, CachedStudent>>(new Map());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Load trip and cache students locally
  useEffect(() => {
    if (!tripId) return;

    const load = async () => {
      try {
        const supabase = createClient();

        // Load trip info
        const { data: tripData } = await supabase
          .from('trips')
          .select('*, buses(*), drivers(*), routes(*)')
          .eq('id', tripId)
          .maybeSingle();

        if (tripData) {
          setTrip(tripData as Trip);
          setCapacity(tripData.buses?.capacidade || 44);
        }

        // Load existing boardings for this trip
        const { data: existingBoardings } = await supabase
          .from('boardings')
          .select('*, students(nome, curso, foto_url)')
          .eq('trip_id', tripId)
          .order('horario', { ascending: false });

        if (existingBoardings) {
          setCount(existingBoardings.length);
          setBoardings(
            existingBoardings.map((b) => {
              const s = b.students as Record<string, string> | null;
              return {
                id: b.id as string,
                nome: s?.nome || '',
                curso: s?.curso || '',
                foto_url: s?.foto_url || null,
                horario: b.horario as string,
              };
            })
          );
        }

        // Cache all active students for local validation
        const { data: students } = await supabase
          .from('students')
          .select('id, nome, curso, universidade, foto_url, qr_token, ativo')
          .eq('ativo', true);

        if (students) {
          const cache = new Map<string, CachedStudent>();
          students.forEach((s) => cache.set(s.qr_token, s as CachedStudent));
          setLocalCache(cache);
        }
      } catch (_err) {
        console.error('Error loading scanner data:', _err);
      }
    };

    load();
  }, [tripId]);

  const handleScan = useCallback(async (token: string) => {
    if (!tripId) return;

    // Quick local validation
    const cached = localCache.get(token);
    if (!cached) {
      setFeedback({ type: 'error', message: 'QR Code não reconhecido' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    // Call API for authoritative registration
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token, trip_id: tripId }),
      });

      const data: ScanResponse = await res.json();
      setLastScan(data);
      setCount(data.contador_atual);

      if (data.success) {
        setBoardings(prev => [{
          id: '',
          nome: data.nome || '',
          curso: data.curso || '',
          foto_url: data.foto_url || null,
          horario: new Date().toISOString(),
        }, ...prev]);

        setFeedback({ type: 'success', message: `${data.nome} embarcou!` });

        if (data.alerta_superlotacao) {
          setTimeout(() => {
            setFeedback({ type: 'warning', message: `ATENÇÃO: Capacidade atingida (${data.contador_atual}/${data.capacidade})` });
          }, 1500);
        }
      } else {
        setFeedback({
          type: data.message?.includes('já embarcou') ? 'warning' : 'error',
          message: data.message || 'Erro no scan',
        });
      }
    } catch (_err) {
      setFeedback({ type: 'error', message: 'Erro de conexão. Tente novamente.' });
    }

    setTimeout(() => setFeedback(null), 3000);
  }, [tripId, localCache]);

  const handleRemoveBoarding = async (boardingId: string, nome: string) => {
    if (!boardingId) return;
    if (!confirm(`Remover carteirinha de ${nome}? Ele(a) não está mais no ônibus.`)) return;
    
    try {
      const res = await fetch(`/api/trips?boarding_id=${boardingId}`, { method: 'DELETE' });
      if (res.ok) {
        setBoardings(prev => prev.filter(b => b.id !== boardingId));
        setCount(prev => Math.max(0, prev - 1));
        setFeedback({ type: 'warning', message: `${nome} removido(a) do embarque` });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (_err) {
      setFeedback({ type: 'error', message: 'Erro ao remover embarque' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  if (!tripId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Nenhuma viagem selecionada.</p>
        <Button onClick={() => window.location.href = '/motorista'}>
          Ver Viagens
        </Button>
      </div>
    );
  }

  const feedbackColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Trip Info */}
      {trip && (
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {trip.routes?.origem} → {trip.routes?.destino}
            </h1>
            <p className="text-sm text-gray-500">
              {trip.buses?.placa}{trip.horario_saida ? ` • Saída: ${trip.horario_saida.slice(0, 5)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${count >= capacity ? 'text-red-600' : 'text-[#1a2744]'}`}>
              {count}/{capacity}
            </p>
            <p className="text-xs text-gray-500">passageiros</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${
            count >= capacity ? 'bg-red-500' : count >= capacity * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min((count / capacity) * 100, 100)}%` }}
        />
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`mb-4 p-4 rounded-xl text-white font-medium text-center animate-pulse ${feedbackColors[feedback.type]}`}>
          {feedback.message}
        </div>
      )}

      {/* Last scan result */}
      {lastScan && lastScan.nome && (
        <Card className="mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
              {lastScan.foto_url ? (
                <img src={lastScan.foto_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{lastScan.nome}</p>
              <p className="text-sm text-gray-500">{lastScan.curso}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Scanner */}
      <div className="mb-6">
        {!scanning ? (
          <Button onClick={() => setScanning(true)} className="w-full" size="lg">
            Abrir Scanner
          </Button>
        ) : (
          <div className="space-y-4">
            <QRScanner onScan={handleScan} active={scanning} />
            <Button variant="danger" onClick={() => setScanning(false)} className="w-full">
              Fechar Scanner
            </Button>
          </div>
        )}
      </div>

      {/* Recent boardings */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Embarques ({boardings.length})
        </h2>
        <div className="space-y-2">
          {boardings.map((b, i) => (
            <div key={b.id || i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.nome}</p>
                  <p className="text-xs text-gray-500">{b.curso}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(b.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {b.id && (
                  <button
                    onClick={() => handleRemoveBoarding(b.id, b.nome)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover carteirinha"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
