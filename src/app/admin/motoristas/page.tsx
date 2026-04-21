'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Driver } from '@/lib/types';

export default function AdminMotoristas() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    cnh: '',
  });

  const loadDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (_err) {
      console.error('Error loading drivers:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadDrivers(); }, []);

  const toggleActive = async (driver: Driver) => {
    await fetch('/api/drivers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: driver.id, ativo: !driver.ativo }),
    });
    loadDrivers();
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/register-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar motorista');
        setSaving(false);
        return;
      }

      setShowModal(false);
      setForm({ nome: '', email: '', senha: '', telefone: '', cnh: '' });
      loadDrivers();
    } catch (_err) {
      setError('Erro de conexão.');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Motoristas</h1>
        <Button onClick={() => setShowModal(true)}>+ Novo Motorista</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{driver.nome}</h3>
                <p className="text-sm text-gray-500 mt-1">Tel: {driver.telefone || '-'}</p>
                <p className="text-sm text-gray-500">CNH: {driver.cnh || '-'}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                driver.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {driver.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant={driver.ativo ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => toggleActive(driver)}
              >
                {driver.ativo ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">Nenhum motorista cadastrado.</p>
        </Card>
      )}

      {/* Modal para cadastrar motorista */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cadastrar Motorista">
        <form onSubmit={handleAddDriver} className="space-y-4">
          <Input
            label="Nome completo *"
            placeholder="Nome do motorista"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <Input
            label="Email *"
            type="email"
            placeholder="email@motorista.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Senha *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            minLength={6}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
            <Input
              label="CNH"
              placeholder="Nº da CNH"
              value={form.cnh}
              onChange={(e) => setForm({ ...form, cnh: e.target.value })}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
