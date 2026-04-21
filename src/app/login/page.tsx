'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type LoginMethod = 'email' | 'carteirinha';

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Barcode code login
  const [barcodeCode, setBarcodeCode] = useState('');

  // Scanner
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<unknown>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const redirectByRole = async (supabase: ReturnType<typeof createClient>, userId: string, userMeta?: Record<string, string>) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const role = profile?.role || userMeta?.role || 'student';

    if (role === 'admin') {
      router.push('/admin');
    } else if (role === 'driver') {
      router.push('/motorista');
    } else {
      router.push('/aluno');
    }
  };

  // Email + password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email ou senha inválidos');
      setLoading(false);
      return;
    }

    if (data.user) {
      await redirectByRole(supabase, data.user.id, data.user.user_metadata as Record<string, string>);
    }
    setLoading(false);
  };

  // Barcode code login
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: barcodeCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código inválido');
        setLoading(false);
        return;
      }

      // Sign in with temporary credentials
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.temp_password,
      });

      if (authError) {
        setError('Erro ao fazer login. Tente novamente.');
        setLoading(false);
        return;
      }

      if (authData.user) {
        await redirectByRole(supabase, authData.user.id, authData.user.user_metadata as Record<string, string>);
      }
    } catch (_err) {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  };

  // Scanner login
  const handleScanResult = async (code: string) => {
    setScanning(false);
    setBarcodeCode(code);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código inválido');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.temp_password,
      });

      if (authError) {
        setError('Erro ao fazer login. Tente novamente.');
        setLoading(false);
        return;
      }

      if (authData.user) {
        await redirectByRole(supabase, authData.user.id, authData.user.user_metadata as Record<string, string>);
      }
    } catch (_err) {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  };

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5ScannerRef.current as { isScanning?: boolean; stop?: () => Promise<void>; clear?: () => void } | null;
      if (scanner?.isScanning) {
        await scanner.stop?.();
      }
      scanner?.clear?.();
    } catch (_e) { /* ignore */ }
    html5ScannerRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scannerId = 'login-qr-reader';

      // Ensure container exists
      if (!document.getElementById(scannerId)) {
        setError('Erro ao inicializar scanner');
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      html5ScannerRef.current = html5QrCode;
      setScanning(true);

      const onSuccess = (decodedText: string) => {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
        html5ScannerRef.current = null;
        setScanning(false);
        handleScanResult(decodedText);
      };
      const scanConfig = { fps: 10, qrbox: { width: 220, height: 220 } };

      try {
        // Try rear camera first
        await html5QrCode.start({ facingMode: 'environment' }, scanConfig, onSuccess, () => {});
      } catch (_rearErr) {
        try {
          // Fallback: front camera
          await html5QrCode.start({ facingMode: 'user' }, scanConfig, onSuccess, () => {});
        } catch (_frontErr) {
          // Fallback: first available camera
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCode.start(devices[0].id, scanConfig, onSuccess, () => {});
          } else {
            throw new Error('Nenhuma câmera encontrada');
          }
        }
      }
    } catch (_err) {
      setCameraAvailable(false);
      setScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (method !== 'carteirinha') {
      stopScanner();
      setCameraAvailable(null);
    }
  }, [method, stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const methodTabs = [
    { key: 'email' as LoginMethod, label: 'Email e Senha', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    )},
    { key: 'carteirinha' as LoginMethod, label: 'Carteirinha', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] via-[#2a1a3e] to-[#8b1a2b] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Prefeitura de São João Batista" className="w-20 h-20 mx-auto mb-4 rounded-2xl object-cover shadow-lg" />
          <h1 className="text-2xl font-bold text-white">Transporte Universitário</h1>
          <p className="text-white/50 mt-1">Prefeitura de São João Batista - SC</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Method tabs */}
          <div className="grid grid-cols-2 border-b border-gray-200">
            {methodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setMethod(tab.key); setError(''); }}
                className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                  method === tab.key
                    ? 'text-[#1a2744] border-b-2 border-[#1a2744] bg-gray-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Email + Password */}
            {method === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  Entrar
                </Button>
              </form>
            )}

            {/* Carteirinha: camera + manual code */}
            {method === 'carteirinha' && (
              <div className="space-y-4">
                {/* Camera section — only show if not failed */}
                {cameraAvailable !== false && (
                  <>
                    <p className="text-sm text-gray-600 text-center">
                      Escaneie o QR Code da carteirinha
                    </p>
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-square" ref={scannerRef}>
                      <div id="login-qr-reader" className="w-full h-full" />
                      {!scanning && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                          <Button onClick={startScanner} className="px-6">
                            Abrir Câmera
                          </Button>
                        </div>
                      )}
                    </div>
                    {scanning && (
                      <Button onClick={stopScanner} variant="secondary" className="w-full" size="sm">
                        Parar Scanner
                      </Button>
                    )}
                  </>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-400">
                      {cameraAvailable === false ? 'Câmera indisponível — digite o código' : 'ou digite o código manualmente'}
                    </span>
                  </div>
                </div>

                {/* Manual code input — always visible */}
                <form onSubmit={handleCodeLogin} className="space-y-3">
                  <Input
                    label="Código da Carteirinha"
                    placeholder="Ex: A1B2C3D4"
                    value={barcodeCode}
                    onChange={(e) => setBarcodeCode(e.target.value)}
                    className="text-center text-lg font-mono tracking-widest"
                    required
                  />
                  <Button type="submit" loading={loading} className="w-full">
                    Entrar com Código
                  </Button>
                </form>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href="/cadastro" className="text-sm text-[#1a2744] hover:underline font-medium">
                Não tem conta? Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
