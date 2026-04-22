'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/Card';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { DashboardStats } from '@/lib/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/reports?type=dashboard');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
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

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 capitalize">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Alunos Cadastrados"
          value={stats?.total_alunos || 0}
          color="blue"
        />
        <StatCard
          title="Votaram Hoje"
          value={stats?.votaram_hoje || 0}
          color="green"
        />
        <StatCard
          title="Embarcaram Hoje"
          value={stats?.embarcaram_hoje || 0}
          color="purple"
        />
        <StatCard
          title="Ônibus Ativos"
          value={stats?.total_onibus || 0}
          color="yellow"
        />
        <StatCard
          title="Motoristas Ativos"
          value={stats?.total_motoristas || 0}
          color="red"
        />
        <StatCard
          title="Viagens Hoje"
          value={stats?.viagens_hoje || 0}
          color="blue"
        />
      </div>

      {/* Notification Actions */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notificações</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="secondary"
            loading={notifying}
            onClick={async () => {
              setNotifying(true);
              setNotifyMsg('');
              try {
                const res = await fetch('/api/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'voting_reminder' }),
                });
                const data = await res.json();
                setNotifyMsg(data.message || 'Enviado!');
              } catch { setNotifyMsg('Erro ao enviar.'); }
              setNotifying(false);
            }}
          >
            Lembrar votação pendente
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={notifying}
            onClick={async () => {
              setNotifying(true);
              setNotifyMsg('');
              try {
                const res = await fetch('/api/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'voting_complete' }),
                });
                const data = await res.json();
                setNotifyMsg(data.message || 'Enviado!');
              } catch { setNotifyMsg('Erro ao enviar.'); }
              setNotifying(false);
            }}
          >
            Avisar votação concluída
          </Button>
        </div>
        {notifyMsg && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{notifyMsg}</p>
        )}
      </Card>

      {/* Comparativo voto vs embarque */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voto vs Embarque (Hoje)</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Votaram</span>
                <span className="font-medium">{stats?.votaram_hoje || 0} alunos</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${stats?.total_alunos ? ((stats.votaram_hoje / stats.total_alunos) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Embarcaram</span>
                <span className="font-medium">{stats?.embarcaram_hoje || 0} alunos</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${stats?.total_alunos ? ((stats.embarcaram_hoje / stats.total_alunos) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Rápido</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Taxa de votação</span>
              <span className="text-sm font-bold text-gray-900">
                {stats?.total_alunos
                  ? Math.round((stats.votaram_hoje / stats.total_alunos) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Taxa de embarque</span>
              <span className="text-sm font-bold text-gray-900">
                {stats?.total_alunos
                  ? Math.round((stats.embarcaram_hoje / stats.total_alunos) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Precisão da votação</span>
              <span className="text-sm font-bold text-gray-900">
                {stats?.votaram_hoje
                  ? Math.round((stats.embarcaram_hoje / stats.votaram_hoje) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
