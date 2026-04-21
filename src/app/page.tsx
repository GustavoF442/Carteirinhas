'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role || user.user_metadata?.role || 'student';

        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'driver') {
          router.push('/motorista');
        } else {
          router.push('/aluno');
        }
      } catch (_err) {
        console.error('Auth check error:', _err);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] via-[#2a1a3e] to-[#8b1a2b]">
      <div className="text-center">
        <img src="/logo.png" alt="Prefeitura de São João Batista" className="w-24 h-24 mx-auto mb-4 rounded-2xl object-cover" />
        <p className="text-white/60 text-sm">Carregando...</p>
      </div>
    </div>
  );
}
