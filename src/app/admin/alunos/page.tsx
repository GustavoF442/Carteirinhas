'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { formatCPF, formatDate } from '@/lib/utils';
import type { Student, Route, RouteStop } from '@/lib/types';

export default function AdminAlunos() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '', cpf: '', telefone: '', curso: '', universidade: '',
    matricula: '', endereco: '', email: '', ponto_embarque: '',
  });
  const [editMsg, setEditMsg] = useState('');
  const [allStops, setAllStops] = useState<string[]>([]);

  const loadStudents = async () => {
    try {
      const [studRes, routeRes] = await Promise.all([
        fetch('/api/students').then(r => r.json()),
        fetch('/api/routes').then(r => r.json()),
      ]);
      setStudents(studRes.students || []);

      // Collect all unique stops from routes
      const stops = new Set<string>();
      (routeRes.routes || []).forEach((r: Route) => {
        if (r.ativo) {
          stops.add(r.origem);
          (r.paradas || []).forEach((p: RouteStop) => stops.add(p.nome));
          stops.add(r.destino);
        }
      });
      setAllStops(Array.from(stops).sort());
    } catch (_err) {
      console.error('Error loading students:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const toggleActive = async (student: Student) => {
    await fetch('/api/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, ativo: !student.ativo }),
    });
    loadStudents();
  };

  const openEdit = (student: Student) => {
    setSelected(student);
    setEditing(true);
    setEditMsg('');
    setEditForm({
      nome: student.nome,
      cpf: student.cpf,
      telefone: student.telefone || '',
      curso: student.curso,
      universidade: student.universidade,
      matricula: student.matricula || '',
      endereco: student.endereco || '',
      email: student.email,
      ponto_embarque: student.ponto_embarque || '',
    });
    setShowModal(true);
  };

  const openDetails = (student: Student) => {
    setSelected(student);
    setEditing(false);
    setEditMsg('');
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setEditMsg('');

    const res = await fetch('/api/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        nome: editForm.nome,
        cpf: editForm.cpf,
        telefone: editForm.telefone || null,
        curso: editForm.curso,
        universidade: editForm.universidade,
        matricula: editForm.matricula || null,
        endereco: editForm.endereco || null,
        email: editForm.email,
        ponto_embarque: editForm.ponto_embarque || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setEditMsg('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
    } else {
      setEditMsg('Salvo com sucesso!');
      loadStudents();
      setTimeout(() => {
        setShowModal(false);
        setEditing(false);
      }, 1000);
    }
    setSaving(false);
  };

  const filtered = students.filter(
    (s) =>
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.cpf.includes(search) ||
      s.curso.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Alunos</h1>
        <span className="text-sm text-gray-500">{students.length} cadastrados</span>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar por nome, CPF ou curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">CPF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Curso</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Universidade</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {student.foto_url ? (
                          <img src={student.foto_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                            {student.nome.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.nome}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{student.curso}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{formatCPF(student.cpf)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{student.curso}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{student.universidade}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      student.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {student.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetails(student)}>
                        Detalhes
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(student)}>
                        Editar
                      </Button>
                      <Button
                        variant={student.ativo ? 'danger' : 'primary'}
                        size="sm"
                        onClick={() => toggleActive(student)}
                      >
                        {student.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">Nenhum aluno encontrado.</div>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setSelected(null); setEditing(false); }}
        title={editing ? 'Editar Aluno' : 'Detalhes do Aluno'}
        size="lg"
      >
        {selected && !editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                {selected.foto_url ? (
                  <img src={selected.foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                    {selected.nome.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selected.nome}</h3>
                <p className="text-sm text-gray-500">{selected.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">CPF</p>
                <p className="font-medium">{formatCPF(selected.cpf)}</p>
              </div>
              <div>
                <p className="text-gray-500">Telefone</p>
                <p className="font-medium">{selected.telefone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Curso</p>
                <p className="font-medium">{selected.curso}</p>
              </div>
              <div>
                <p className="text-gray-500">Universidade</p>
                <p className="font-medium">{selected.universidade}</p>
              </div>
              <div>
                <p className="text-gray-500">Matrícula</p>
                <p className="font-medium">{selected.matricula || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Data de Entrada</p>
                <p className="font-medium">{selected.data_entrada ? formatDate(selected.data_entrada) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Endereço</p>
                <p className="font-medium">{selected.endereco || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Ponto de Embarque</p>
                <p className="font-medium">{selected.ponto_embarque || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">QR Token</p>
                <p className="font-mono text-xs">{selected.qr_token.substring(0, 16)}...</p>
              </div>
              <div>
                <p className="text-gray-500">Cadastrado em</p>
                <p className="font-medium">{formatDate(selected.created_at)}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => openEdit(selected)}>Editar Informações</Button>
            </div>
          </div>
        )}

        {selected && editing && (
          <div className="space-y-4">
            <Input label="Nome completo" value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
            <Input label="Email" type="email" value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CPF" value={editForm.cpf}
                onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} />
              <Input label="Telefone" value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Curso" value={editForm.curso}
                onChange={(e) => setEditForm({ ...editForm, curso: e.target.value })} />
              <Input label="Universidade" value={editForm.universidade}
                onChange={(e) => setEditForm({ ...editForm, universidade: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Matrícula" value={editForm.matricula}
                onChange={(e) => setEditForm({ ...editForm, matricula: e.target.value })} />
              <Input label="Endereço" value={editForm.endereco}
                onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })} />
            </div>
            <Select
              label="Ponto de Embarque Padrão"
              placeholder="Selecione o ponto"
              options={allStops.map(s => ({ value: s, label: s }))}
              value={editForm.ponto_embarque}
              onChange={(e) => setEditForm({ ...editForm, ponto_embarque: e.target.value })}
            />

            {editMsg && (
              <div className={`p-3 rounded-lg text-sm ${
                editMsg.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {editMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} loading={saving} className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
