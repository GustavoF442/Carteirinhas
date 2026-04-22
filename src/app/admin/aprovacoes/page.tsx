'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCPF, formatDate } from '@/lib/utils';
import type { Student } from '@/lib/types';

export default function AdminAprovacoes() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [actionMsg, setActionMsg] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (_err) {
      console.error('Error loading students:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleApprove = async (student: Student) => {
    await fetch('/api/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, aprovado: true, ativo: true }),
    });
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'registration_approved', student_email: student.email, student_name: student.nome }),
    }).catch(() => {});
    setActionMsg(`${student.nome} aprovado(a) com sucesso!`);
    setTimeout(() => setActionMsg(''), 3000);
    loadStudents();
  };

  const handleReject = async (student: Student) => {
    if (!confirm(`Rejeitar o cadastro de ${student.nome}?`)) return;
    await fetch('/api/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, aprovado: false, ativo: false }),
    });
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'registration_rejected', student_email: student.email, student_name: student.nome }),
    }).catch(() => {});
    setActionMsg(`${student.nome} rejeitado(a).`);
    setTimeout(() => setActionMsg(''), 3000);
    loadStudents();
  };

  const filtered = students.filter(s => {
    if (filter === 'pending') return !s.aprovado && !s.ativo;
    if (filter === 'approved') return s.aprovado === true;
    if (filter === 'rejected') return s.aprovado === false && s.ativo === false && s.created_at;
    return true;
  });

  const pendingCount = students.filter(s => !s.aprovado && !s.ativo).length;
  const approvedCount = students.filter(s => s.aprovado === true).length;
  const rejectedCount = students.filter(s => s.aprovado === false && s.ativo === false).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Aprovações de Cadastro</h1>

      {actionMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {actionMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setFilter('pending')}
        >
          Pendentes ({pendingCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'approved' ? 'primary' : 'secondary'}
          onClick={() => setFilter('approved')}
        >
          Aprovados ({approvedCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'rejected' ? 'primary' : 'secondary'}
          onClick={() => setFilter('rejected')}
        >
          Rejeitados ({rejectedCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Todos ({students.length})
        </Button>
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            {filter === 'pending' ? 'Nenhum cadastro pendente de aprovação.' : 'Nenhum registro encontrado.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const isPending = !student.aprovado && !student.ativo;
            const isApproved = student.aprovado === true;

            return (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Photo + Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {student.foto_url ? (
                        <img src={student.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{student.nome}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          isApproved
                            ? 'bg-green-100 text-green-700'
                            : isPending
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {isApproved ? 'Aprovado' : isPending ? 'Pendente' : 'Rejeitado'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{student.email}</p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        <span>CPF: {formatCPF(student.cpf)}</span>
                        <span>{student.curso} — {student.universidade}</span>
                        {student.created_at && <span>Cadastro: {formatDate(student.created_at)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleApprove(student)}>
                        Aprovar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleReject(student)}>
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {isApproved && (
                    <div className="flex-shrink-0">
                      <span className="text-sm text-green-600 font-medium">✓ Ativo</span>
                    </div>
                  )}
                  {!isApproved && !isPending && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="secondary" onClick={() => handleApprove(student)}>
                        Reaprovar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
