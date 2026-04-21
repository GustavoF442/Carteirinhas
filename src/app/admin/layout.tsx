'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'Alunos', href: '/admin/alunos', icon: 'users' },
  { label: 'Motoristas', href: '/admin/motoristas', icon: 'driver' },
  { label: 'Ônibus', href: '/admin/onibus', icon: 'bus' },
  { label: 'Trajetos', href: '/admin/trajetos', icon: 'route' },
  { label: 'Viagens', href: '/admin/viagens', icon: 'trip' },
  { label: 'Relatórios', href: '/admin/relatorios', icon: 'report' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.nome || user.email || 'Admin');
        }
      } catch (_err) {
        console.error('Error loading admin:', _err);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Painel Administrativo" userName={userName} />
      <div className="flex">
        <Sidebar items={navItems} />
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
