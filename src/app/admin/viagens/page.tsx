'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Trip, Bus, Driver, Route } from '@/lib/types';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekdaysOfMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function getCalendarGrid(year: number, month: number): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let week: (string | null)[] = new Array(first.getDay()).fill(null);

  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(year, month, day);
    week.push(d.toISOString().split('T')[0]);
    if (d.getDay() === 6) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default function AdminViagens() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    bus_id: '',
    driver_id: '',
    route_id: '',
    horario_saida: '06:30',
  });

  const loadData = async () => {
    try {
      const [tripsRes, busesRes, driversRes, routesRes] = await Promise.all([
        fetch('/api/trips').then(r => r.json()),
        fetch('/api/buses').then(r => r.json()),
        fetch('/api/drivers').then(r => r.json()),
        fetch('/api/routes').then(r => r.json()),
      ]);
      setTrips((tripsRes.trips as Trip[]) || []);
      setBuses((busesRes.buses || []).filter((b: Bus) => b.ativo));
      setDrivers((driversRes.drivers || []).filter((d: Driver) => d.ativo));
      setRoutes((routesRes.routes || []).filter((r: Route) => r.ativo));
    } catch (_err) {
      console.error('Error loading trips data:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const monthTrips = trips.filter(t => {
    const d = new Date(t.data + 'T12:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const tripsByDate: Record<string, Trip> = {};
  monthTrips.forEach(t => { tripsByDate[t.data] = t; });

  const handleGenerateMonth = async () => {
    if (!config.bus_id || !config.driver_id || !config.route_id) return;
    setGenerating(true);

    const weekdays = getWeekdaysOfMonth(year, month);
    const existingDates = new Set(monthTrips.map(t => t.data));
    const newDates = weekdays.filter(d => !existingDates.has(d));

    for (const date of newDates) {
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: date,
          bus_id: config.bus_id,
          driver_id: config.driver_id,
          route_id: config.route_id,
          horario_saida: config.horario_saida,
        }),
      });
    }

    setShowConfig(false);
    setGenerating(false);
    loadData();
  };

  const toggleHoliday = async (trip: Trip) => {
    const newFeriado = !trip.feriado;
    const newStatus = newFeriado ? 'cancelled' : 'scheduled';
    await fetch('/api/trips', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trip.id, feriado: newFeriado, status: newStatus }),
    });
    loadData();
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const grid = getCalendarGrid(year, month);
  const todayStr = new Date().toISOString().split('T')[0];

  const statusColor: Record<string, string> = {
    scheduled: 'bg-green-100 border-green-300 text-green-800',
    active: 'bg-blue-100 border-blue-300 text-blue-800',
    completed: 'bg-gray-100 border-gray-300 text-gray-600',
    cancelled: 'bg-red-50 border-red-200 text-red-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Controle Mensal de Viagens</h1>
        <Button onClick={() => setShowConfig(true)}>
          Gerar Mês
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-lg text-gray-900">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-400" /> Agendada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" /> Em andamento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-400" /> Concluída</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Feriado/Cancelada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-dashed border-gray-300" /> Sem viagem</span>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {WEEKDAY_SHORT.map(d => (
                <th key={d} className="text-xs font-medium text-gray-500 py-2 text-center w-[14.28%]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((date, di) => {
                  if (!date) return <td key={di} className="p-1" />;

                  const trip = tripsByDate[date];
                  const isWeekend = di === 0 || di === 6;
                  const isToday = date === todayStr;
                  const isPast = date < todayStr;

                  const dayNum = new Date(date + 'T12:00:00').getDate();

                  return (
                    <td key={di} className="p-1 align-top">
                      <div
                        className={`rounded-lg border p-1.5 min-h-[70px] text-center transition-all cursor-default ${
                          isWeekend
                            ? 'bg-gray-50 border-gray-100'
                            : trip
                              ? `${statusColor[trip.status]} ${trip.feriado ? 'line-through opacity-60' : ''}`
                              : 'bg-white border-dashed border-gray-200'
                        } ${isToday ? 'ring-2 ring-blue-400' : ''} ${isPast && !isToday ? 'opacity-70' : ''}`}
                      >
                        <div className="text-xs font-semibold mb-0.5">{dayNum}</div>
                        {trip && !isWeekend && (
                          <div className="space-y-0.5">
                            {trip.horario_saida && (
                              <div className="text-[10px] font-medium">{trip.horario_saida.slice(0, 5)}</div>
                            )}
                            {trip.feriado ? (
                              <div className="text-[10px] text-red-500 font-medium">Feriado</div>
                            ) : (
                              <div className="text-[10px]">
                                {((trip.boardings as unknown as {count:number}[])?.[0]?.count) || 0} pass.
                              </div>
                            )}
                            {!isPast && trip.status === 'scheduled' && (
                              <button
                                onClick={() => toggleHoliday(trip)}
                                className={`text-[9px] px-1 py-0.5 rounded ${
                                  trip.feriado
                                    ? 'bg-green-200 text-green-700 hover:bg-green-300'
                                    : 'bg-red-200 text-red-700 hover:bg-red-300'
                                } transition-colors`}
                              >
                                {trip.feriado ? 'Reativar' : 'Feriado'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-gray-900">{monthTrips.filter(t => !t.feriado && t.status !== 'cancelled').length}</div>
          <div className="text-xs text-gray-500">Dias com viagem</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-red-600">{monthTrips.filter(t => t.feriado).length}</div>
          <div className="text-xs text-gray-500">Feriados</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-blue-600">{monthTrips.filter(t => t.status === 'completed').length}</div>
          <div className="text-xs text-gray-500">Concluídas</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-green-600">
            {monthTrips[0]?.horario_saida?.slice(0, 5) || '--:--'}
          </div>
          <div className="text-xs text-gray-500">Horário Saída</div>
        </Card>
      </div>

      {/* Generate month modal */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title={`Gerar Viagens — ${MONTH_NAMES[month]} ${year}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Serão criadas viagens para todos os dias úteis (Seg-Sex) de <strong>{MONTH_NAMES[month]}</strong> que ainda não possuem viagem.
            Após gerar, marque os feriados individualmente no calendário.
          </p>
          <Select
            label="Ônibus"
            placeholder="Selecione o ônibus"
            options={buses.map(b => ({ value: b.id, label: `${b.placa} - ${b.modelo} (${b.capacidade} lug.)` }))}
            value={config.bus_id}
            onChange={e => setConfig({ ...config, bus_id: e.target.value })}
            required
          />
          <Select
            label="Motorista"
            placeholder="Selecione o motorista"
            options={drivers.map(d => ({ value: d.id, label: d.nome }))}
            value={config.driver_id}
            onChange={e => setConfig({ ...config, driver_id: e.target.value })}
            required
          />
          <Select
            label="Trajeto"
            placeholder="Selecione o trajeto"
            options={routes.map(r => ({ value: r.id, label: `${r.origem} → ${r.destino}` }))}
            value={config.route_id}
            onChange={e => setConfig({ ...config, route_id: e.target.value })}
            required
          />
          <Input
            label="Horário de Saída do Ponto Inicial"
            type="time"
            value={config.horario_saida}
            onChange={e => setConfig({ ...config, horario_saida: e.target.value })}
            required
          />
          <Button
            onClick={handleGenerateMonth}
            loading={generating}
            className="w-full"
            disabled={!config.bus_id || !config.driver_id || !config.route_id}
          >
            Gerar Viagens do Mês
          </Button>
        </div>
      </Modal>
    </div>
  );
}
