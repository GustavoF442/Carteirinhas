'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import type { Student } from '@/lib/types';

const navItems = [
  { label: 'Carteirinha', href: '/aluno', icon: 'card' },
  { label: 'Votação Semanal', href: '/aluno/votacao', icon: 'vote' },
  { label: 'Histórico', href: '/aluno/historico', icon: 'history' },
  { label: 'Meu Perfil', href: '/aluno/perfil', icon: 'user' },
];

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);

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
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Transporte Universitário" userName={student?.nome} />
      <div className="flex">
        <Sidebar items={navItems} />
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
