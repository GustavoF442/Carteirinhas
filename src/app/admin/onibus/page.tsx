'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Bus } from '@/lib/types';

export default function AdminOnibus() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ placa: '', modelo: '', capacidade: '44' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadBuses = async () => {
    try {
      const res = await fetch('/api/buses');
      const data = await res.json();
      setBuses(data.buses || []);
    } catch (_err) {
      console.error('Error loading buses:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadBuses(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { placa: form.placa, modelo: form.modelo, capacidade: parseInt(form.capacidade) };

    if (editingId) {
      await fetch('/api/buses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) });
    } else {
      await fetch('/api/buses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setShowModal(false);
    setForm({ placa: '', modelo: '', capacidade: '44' });
    setEditingId(null);
    setSaving(false);
    loadBuses();
  };

  const openEdit = (bus: Bus) => {
    setForm({ placa: bus.placa, modelo: bus.modelo, capacidade: String(bus.capacidade) });
    setEditingId(bus.id);
    setShowModal(true);
  };

  const toggleActive = async (bus: Bus) => {
    await fetch('/api/buses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bus.id, ativo: !bus.ativo }) });
    loadBuses();
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
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Ônibus</h1>
        <Button onClick={() => { setEditingId(null); setForm({ placa: '', modelo: '', capacidade: '44' }); setShowModal(true); }}>
          Novo Ônibus
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buses.map((bus) => (
          <Card key={bus.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{bus.placa}</h3>
                <p className="text-sm text-gray-500 mt-1">{bus.modelo}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Capacidade: <span className="font-semibold">{bus.capacidade}</span> lugares
                </p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                bus.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {bus.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openEdit(bus)}>Editar</Button>
              <Button
                variant={bus.ativo ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => toggleActive(bus)}
              >
                {bus.ativo ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {buses.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">Nenhum ônibus cadastrado.</p>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Editar Ônibus' : 'Novo Ônibus'}
      >
        <div className="space-y-4">
          <Input
            label="Placa"
            placeholder="ABC-1234"
            value={form.placa}
            onChange={(e) => setForm({ ...form, placa: e.target.value })}
            required
          />
          <Input
            label="Modelo"
            placeholder="Ex: Mercedes Benz OF 1519"
            value={form.modelo}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
            required
          />
          <Input
            label="Capacidade"
            type="number"
            placeholder="44"
            value={form.capacidade}
            onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
            required
          />
          <Button onClick={handleSave} loading={saving} className="w-full">
            {editingId ? 'Salvar Alterações' : 'Cadastrar Ônibus'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
