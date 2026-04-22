'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Student } from '@/lib/types';
import { maskPhone } from '@/lib/utils';

export default function PerfilPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    endereco: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setStudent(data);
          setForm({
            nome: data.nome || '',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
          });
          setEmailForm({ newEmail: data.email || '' });
          if (data.foto_url) setFotoPreview(data.foto_url);
        }
      } catch (_err) {
        console.error('Error loading profile:', _err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMsg('A foto deve ter no máximo 5MB', 'error');
        return;
      }
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInfo = async () => {
    if (!student) return;
    setSaving(true);

    try {
      let foto_url = student.foto_url;

      if (fotoFile) {
        const formData = new FormData();
        formData.append('file', fotoFile);
        formData.append('email', student.email);
        const uploadRes = await fetch('/api/upload-foto', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          foto_url = uploadData.url;
        }
      }

      const supabase = createClient();
      const { error } = await supabase
        .from('students')
        .update({
          nome: form.nome,
          telefone: form.telefone || null,
          endereco: form.endereco || null,
          foto_url,
        })
        .eq('id', student.id);

      if (error) {
        showMsg('Erro ao salvar: ' + error.message, 'error');
      } else {
        setFotoFile(null);
        showMsg('Informações atualizadas!', 'success');
      }
    } catch (_err) {
      showMsg('Erro de conexão', 'error');
    }

    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) {
      showMsg('As senhas não conferem', 'error');
      return;
    }
    if (passwordForm.newPass.length < 6) {
      showMsg('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPass,
      });

      if (error) {
        showMsg('Erro ao alterar senha: ' + error.message, 'error');
      } else {
        setPasswordForm({ current: '', newPass: '', confirm: '' });
        showMsg('Senha alterada com sucesso!', 'success');
      }
    } catch (_err) {
      showMsg('Erro de conexão', 'error');
    }
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    if (!emailForm.newEmail || !student) return;
    if (emailForm.newEmail === student.email) {
      showMsg('O email é o mesmo', 'error');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail,
      });

      if (error) {
        showMsg('Erro ao alterar email: ' + error.message, 'error');
      } else {
        // Also update student record
        await supabase
          .from('students')
          .update({ email: emailForm.newEmail })
          .eq('id', student.id);

        showMsg('Email atualizado! Verifique sua caixa de entrada.', 'success');
      }
    } catch (_err) {
      showMsg('Erro de conexão', 'error');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-gray-500 text-center py-12">Dados não encontrados.</p>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${
          msgType === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Photo + Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informações Pessoais</h2>

        <div className="flex flex-col items-center mb-6">
          <div
            onClick={() => fotoInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#1a2744] transition-colors overflow-hidden"
          >
            {fotoPreview ? (
              <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFotoChange}
          />
          <p className="text-xs text-gray-400 mt-2">Clique para alterar foto</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Nome completo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            label="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
          <Input
            label="Endereço"
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Rua, número, bairro"
          />
          <Button onClick={handleSaveInfo} loading={saving}>
            Salvar Informações
          </Button>
        </div>
      </div>

      {/* Change Email */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Alterar Email</h2>
        <div className="space-y-4">
          <Input
            label="Novo email"
            type="email"
            value={emailForm.newEmail}
            onChange={(e) => setEmailForm({ newEmail: e.target.value })}
          />
          <Button onClick={handleChangeEmail} loading={saving} variant="secondary">
            Alterar Email
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Alterar Senha</h2>
        <div className="space-y-4">
          <Input
            label="Nova senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={passwordForm.newPass}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            placeholder="Repita a nova senha"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
          />
          <Button onClick={handleChangePassword} loading={saving} variant="secondary">
            Alterar Senha
          </Button>
        </div>
      </div>
    </div>
  );
}
