'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import type { Driver } from '@/lib/types';

const navItems = [
  { label: 'Viagens', href: '/motorista', icon: 'trip' },
  { label: 'Scanner QR', href: '/motorista/scanner', icon: 'scan' },
];

export default function MotoristaLayout({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('drivers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setDriver(data);
        }
      } catch (_err) {
        console.error('Error loading driver:', _err);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Painel do Motorista" userName={driver?.nome} />
      <div className="flex">
        <Sidebar items={navItems} />
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
