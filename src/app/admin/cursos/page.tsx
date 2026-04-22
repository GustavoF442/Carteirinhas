'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Course {
  id: string;
  nome: string;
  universidade: string;
  ativo: boolean;
  created_at: string;
}

export default function AdminCursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const [newCurso, setNewCurso] = useState('');
  const [newUni, setNewUni] = useState('UNIFEBE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (_err) {
      console.error('Error loading courses:', _err);
    }
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, []);

  const handleAdd = async () => {
    if (!newCurso.trim()) return;
    setSaving(true);
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newCurso.trim(), universidade: newUni.trim() || 'UNIFEBE' }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewCurso('');
      showMsg('Curso adicionado!', 'success');
      loadCourses();
    } else {
      showMsg(data.error || 'Erro ao adicionar', 'error');
    }
    setSaving(false);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch('/api/courses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nome: editName.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      showMsg('Curso atualizado!', 'success');
      loadCourses();
    } else {
      showMsg('Erro ao atualizar', 'error');
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Excluir o curso "${course.nome}"?`)) return;
    const res = await fetch(`/api/courses?id=${course.id}`, { method: 'DELETE' });
    if (res.ok) {
      showMsg('Curso excluído!', 'success');
      loadCourses();
    } else {
      showMsg('Erro ao excluir', 'error');
    }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestão de Cursos</h1>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          msgType === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Add new course */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Adicionar Novo Curso</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              label="Nome do Curso"
              placeholder="Ex: Direito"
              value={newCurso}
              onChange={(e) => setNewCurso(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="sm:w-48">
            <Input
              label="Instituição"
              placeholder="UNIFEBE"
              value={newUni}
              onChange={(e) => setNewUni(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} loading={saving}>
              Adicionar
            </Button>
          </div>
        </div>
      </Card>

      {/* Course list */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Cursos Cadastrados ({courses.length})</h2>
        {courses.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            Nenhum curso cadastrado ainda. Adicione os cursos acima para que os alunos possam selecioná-los no cadastro.
          </p>
        ) : (
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {editingId === course.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(course.id)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(course.id)}>Salvar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{course.nome}</p>
                      <p className="text-xs text-gray-500">{course.universidade}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setEditingId(course.id); setEditName(course.nome); }}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(course)}>
                        Excluir
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
