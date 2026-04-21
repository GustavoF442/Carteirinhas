'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  title: string;
  userName?: string;
  showLogout?: boolean;
}

export default function Header({ title, userName, showLogout = true }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="bg-gradient-to-r from-[#1a2744] to-[#2d1a3e] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="SJB" className="w-9 h-9 rounded-lg object-cover" />
              <div className="hidden sm:block">
                <span className="text-base font-semibold leading-tight block">{title}</span>
                <span className="text-[10px] text-white/50 leading-tight">Prefeitura de São João Batista</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-white/70">Olá, <strong className="text-white">{userName}</strong></span>
            )}
            {showLogout && (
              <button
                onClick={handleLogout}
                className="text-sm bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition-colors"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
