'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { maskCPF, maskPhone, maskMatricula } from '@/lib/utils';

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
    curso: '',
    universidade: 'UNIFEBE',
    matricula: '',
    data_entrada: '',
    endereco: '',
  });

  const [courses, setCourses] = useState<{id: string; nome: string; universidade: string}[]>([]);

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses || [])).catch(() => {});
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('A foto deve ter no máximo 5MB');
        return;
      }
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload photo first if provided
      let foto_url: string | null = null;
      if (fotoFile) {
        const formData = new FormData();
        formData.append('file', fotoFile);
        formData.append('email', form.email);
        const uploadRes = await fetch('/api/upload-foto', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          foto_url = uploadData.url;
        }
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, foto_url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar');
        setLoading(false);
        return;
      }

      // Registration pending approval — don't auto-login
      setError('');
      alert('Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema. Você receberá um aviso quando for aprovado.');
      router.push('/login');
    } catch (_err) {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2744] via-[#2a1a3e] to-[#8b1a2b] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Prefeitura de São João Batista" className="w-20 h-20 mx-auto mb-4 rounded-2xl object-cover shadow-lg" />
          <h1 className="text-2xl font-bold text-white">Cadastro de Aluno</h1>
          <p className="text-white/50 mt-1">Transporte Universitário - São João Batista</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto pessoal */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => fotoInputRef.current?.click()}
                className="w-28 h-28 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#1a2744] transition-colors overflow-hidden"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-xs text-gray-400 mt-1">Foto</span>
                  </div>
                )}
              </div>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFotoChange}
              />
              <p className="text-xs text-gray-400 mt-2">Clique para adicionar foto (máx 5MB)</p>
            </div>

            <Input
              label="Nome completo *"
              placeholder="Seu nome completo"
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CPF *"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => updateField('cpf', maskCPF(e.target.value))}
                maxLength={14}
                required
              />
              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => updateField('telefone', maskPhone(e.target.value))}
                maxLength={15}
              />
            </div>

            <Input
              label="Instituição de Ensino *"
              placeholder="Ex: UNIFEBE"
              value={form.universidade}
              onChange={(e) => updateField('universidade', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Curso *"
                placeholder="Selecione o curso"
                options={courses.map(c => ({ value: c.nome, label: c.nome }))}
                value={form.curso}
                onChange={(e) => {
                  const selected = courses.find(c => c.nome === e.target.value);
                  updateField('curso', e.target.value);
                  if (selected) updateField('universidade', selected.universidade);
                }}
                required
              />
              <Input
                label="Nº da Matrícula *"
                placeholder="Ex: 2024001234"
                value={form.matricula}
                onChange={(e) => updateField('matricula', maskMatricula(e.target.value))}
                required
              />
            </div>

            <Input
              label="Data de entrada na faculdade"
              type="date"
              value={form.data_entrada}
              onChange={(e) => updateField('data_entrada', e.target.value)}
            />

            <Input
              label="Endereço"
              placeholder="Rua, número, bairro"
              value={form.endereco}
              onChange={(e) => updateField('endereco', e.target.value)}
            />

            <hr className="border-gray-200" />

            <Input
              label="Email *"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />
            <Input
              label="Senha *"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.senha}
              onChange={(e) => updateField('senha', e.target.value)}
              minLength={6}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Cadastrar
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#1a2744] hover:underline font-medium">
              Já tem conta? Faça login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
