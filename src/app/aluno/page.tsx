'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StudentCard from '@/components/StudentCard';
import type { Student } from '@/lib/types';

export default function AlunoCarteirinha() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setStudent(data);
        }
      } catch (_err) {
        console.error('Error loading student:', _err);
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

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Dados do aluno não encontrados.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Minha Carteirinha</h1>
      <StudentCard student={student} />
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Apresente o QR Code ao motorista no momento do embarque.
        </p>
      </div>
    </div>
  );
}
