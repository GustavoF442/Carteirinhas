'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import type { VoteType } from '@/lib/types';

type DayVote = VoteType | 'nao_vai' | null;

interface WeekVotes {
  [date: string]: DayVote;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

const voteLabels: Record<string, string> = {
  ida_volta: 'Ida e Volta',
  apenas_ida: 'Apenas Ida',
  apenas_volta: 'Apenas Volta',
  nao_vai: 'Não vai',
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDates(monday: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function VotacaoPage() {
  const [studentId, setStudentId] = useState('');
  const [weekVotes, setWeekVotes] = useState<WeekVotes>({});
  const [savedVotes, setSavedVotes] = useState<WeekVotes>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const currentMonday = getMonday(today);
  const monday = new Date(currentMonday);
  monday.setDate(monday.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(monday);
  const todayStr = today.toISOString().split('T')[0];

  const loadWeekVotes = useCallback(async (sid: string, mondayDate: Date) => {
    const weekStr = mondayDate.toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/votes?student_id=${sid}&week=${weekStr}`);
      const data = await res.json();
      const voteMap: WeekVotes = {};
      const dates = getWeekDates(mondayDate);
      dates.forEach(d => { voteMap[d] = null; });
      if (data.votes) {
        for (const v of data.votes) {
          voteMap[v.data] = v.tipo as VoteType;
        }
      }
      setWeekVotes(voteMap);
      setSavedVotes({ ...voteMap });
    } catch (_err) {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
        setStudentId(student.id);
        await loadWeekVotes(student.id, monday);
      } catch (_err) {
        console.error('Error loading votes:', _err);
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      loadWeekVotes(studentId, monday);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const toggleDayVote = (date: string, tipo: VoteType | 'nao_vai') => {
    setWeekVotes(prev => ({
      ...prev,
      [date]: prev[date] === tipo ? null : tipo,
    }));
  };

  const hasChanges = JSON.stringify(weekVotes) !== JSON.stringify(savedVotes);

  const handleSave = async () => {
    if (!studentId) return;
    setSaving(true);
    setSuccess(false);

    const votes = [];
    const deleteDates: string[] = [];

    for (const date of weekDates) {
      const vote = weekVotes[date];
      const saved = savedVotes[date];
      if (vote !== saved) {
        if (vote && vote !== 'nao_vai') {
          votes.push({ student_id: studentId, data: date, tipo: vote });
        } else if (saved && saved !== 'nao_vai') {
          deleteDates.push(date);
        }
        if (vote === 'nao_vai' && saved && saved !== 'nao_vai') {
          deleteDates.push(date);
        }
      }
    }

    try {
      if (votes.length > 0) {
        await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ votes }),
        });
      }

      for (const date of deleteDates) {
        await fetch(`/api/votes?student_id=${studentId}&data=${date}`, {
          method: 'DELETE',
        });
      }

      setSavedVotes({ ...weekVotes });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (_err) {
      // ignore
    }

    setSaving(false);
  };

  const weekLabel = `${formatDateShort(weekDates[0])} - ${formatDateShort(weekDates[4])}`;
  const isCurrentWeek = weekOffset === 0;
  const isPast = (date: string) => date < todayStr;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Votação da Semana</h1>
      <p className="text-gray-500 mb-6">Selecione os dias que você utilizará o transporte (Segunda a Sexta)</p>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl border border-gray-200 p-3">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900">{weekLabel}</p>
          {isCurrentWeek && <p className="text-xs text-blue-600">Semana atual</p>}
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days grid */}
      <div className="space-y-3 mb-6">
        {weekDates.map((date, i) => {
          const vote = weekVotes[date];
          const past = isPast(date);
          const isToday = date === todayStr;

          return (
            <div
              key={date}
              className={`bg-white rounded-xl border p-4 transition-all ${
                isToday ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
              } ${past ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-gray-900">{DAYS[i]}</span>
                  <span className="text-sm text-gray-500 ml-2">{formatDateShort(date)}</span>
                  {isToday && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Hoje
                    </span>
                  )}
                </div>
                {vote && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    vote === 'nao_vai' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {voteLabels[vote]}
                  </span>
                )}
              </div>

              {!past ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['ida_volta', 'apenas_ida', 'apenas_volta'] as VoteType[]).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => toggleDayVote(date, tipo)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        vote === tipo
                          ? 'bg-[#1a2744] text-white border-[#1a2744]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {voteLabels[tipo]}
                    </button>
                  ))}
                  <button
                    onClick={() => toggleDayVote(date, 'nao_vai')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      vote === 'nao_vai'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300'
                    }`}
                  >
                    Não vai
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  {vote ? `Votou: ${voteLabels[vote]}` : 'Não votou'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        loading={saving}
        disabled={!hasChanges}
        className="w-full"
        size="lg"
      >
        Salvar Votação da Semana
      </Button>

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
          Votação salva com sucesso!
        </div>
      )}

      {!hasChanges && !success && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Selecione ou altere os dias para habilitar o salvamento
        </p>
      )}
    </div>
  );
}
