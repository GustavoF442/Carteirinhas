'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Route, RouteStop } from '@/lib/types';

interface RouteForm {
  origem: string;
  destino: string;
  descricao: string;
  paradas: RouteStop[];
}

const emptyForm: RouteForm = { origem: '', destino: '', descricao: '', paradas: [] };

export default function AdminTrajetos() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RouteForm>(emptyForm);
  const [newParada, setNewParada] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (_err) {
      console.error('Error loading routes:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadRoutes(); }, []);

  const addParada = () => {
    if (!newParada.trim()) return;
    setForm(prev => ({
      ...prev,
      paradas: [...prev.paradas, { nome: newParada.trim(), ordem: prev.paradas.length + 1 }],
    }));
    setNewParada('');
  };

  const removeParada = (index: number) => {
    setForm(prev => ({
      ...prev,
      paradas: prev.paradas.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 })),
    }));
  };

  const moveParada = (index: number, direction: 'up' | 'down') => {
    const newParadas = [...form.paradas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newParadas.length) return;
    [newParadas[index], newParadas[targetIndex]] = [newParadas[targetIndex], newParadas[index]];
    setForm(prev => ({
      ...prev,
      paradas: newParadas.map((p, i) => ({ ...p, ordem: i + 1 })),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, paradas: form.paradas.length > 0 ? form.paradas : [] };

    if (editingId) {
      await fetch('/api/routes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) });
    } else {
      await fetch('/api/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    loadRoutes();
  };

  const openEdit = (route: Route) => {
    setForm({
      origem: route.origem,
      destino: route.destino,
      descricao: route.descricao || '',
      paradas: route.paradas || [],
    });
    setEditingId(route.id);
    setShowModal(true);
  };

  const toggleActive = async (route: Route) => {
    await fetch('/api/routes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: route.id, ativo: !route.ativo }) });
    loadRoutes();
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
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Trajetos</h1>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowModal(true); }}>
          Novo Trajeto
        </Button>
      </div>

      <div className="space-y-4">
        {routes.map((route) => (
          <Card key={route.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {route.origem} → {route.destino}
                </h3>
                {route.descricao && (
                  <p className="text-sm text-gray-500 mt-1">{route.descricao}</p>
                )}
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                route.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {route.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {/* Visual route timeline */}
            {(route.paradas && route.paradas.length > 0) && (
              <div className="ml-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700">{route.origem}</span>
                </div>
                {route.paradas.map((parada, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-px h-5 bg-gray-300 ml-[5px]" />
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 -ml-[3px]" />
                    <span className="text-gray-600">{parada.nome}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-px h-5 bg-gray-300 ml-[5px]" />
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 -ml-[1px]" />
                  <span className="font-medium text-gray-700">{route.destino}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openEdit(route)}>Editar</Button>
              <Button
                variant={route.ativo ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => toggleActive(route)}
              >
                {route.ativo ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {routes.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">Nenhum trajeto cadastrado.</p>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Editar Trajeto' : 'Novo Trajeto'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Origem (ponto de saída)"
              placeholder="Ex: Rodoviária SJB"
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value })}
              required
            />
            <Input
              label="Destino Final"
              placeholder="Ex: UNIFEBE"
              value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value })}
              required
            />
          </div>
          <Input
            label="Descrição"
            placeholder="Ex: Ônibus 1 - Rodoviária até UNIFEBE"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />

          {/* Paradas / Stops builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paradas Intermediárias
            </label>

            {/* Visual timeline of stops */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 text-sm mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="font-medium text-green-700">{form.origem || 'Origem'}</span>
              </div>
              {form.paradas.map((parada, i) => (
                <div key={i} className="flex items-center gap-2 text-sm group">
                  <div className="w-px h-6 bg-gray-300 ml-[5px]" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 -ml-[3px]" />
                  <span className="text-gray-700 flex-1">{parada.nome}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button onClick={() => moveParada(i, 'up')} className="p-0.5 text-gray-400 hover:text-gray-700" disabled={i === 0}>↑</button>
                    <button onClick={() => moveParada(i, 'down')} className="p-0.5 text-gray-400 hover:text-gray-700" disabled={i === form.paradas.length - 1}>↓</button>
                    <button onClick={() => removeParada(i)} className="p-0.5 text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm mt-1">
                <div className="w-px h-6 bg-gray-300 ml-[5px]" />
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 -ml-[1px]" />
                <span className="font-medium text-red-700">{form.destino || 'Destino'}</span>
              </div>
            </div>

            {/* Add stop input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da parada (ex: Posto Delta, Via Scarpa...)"
                value={newParada}
                onChange={(e) => setNewParada(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParada())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2744] focus:border-transparent outline-none"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addParada}>
                + Parada
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full">
            {editingId ? 'Salvar Alterações' : 'Cadastrar Trajeto'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
