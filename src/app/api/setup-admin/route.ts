import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha, nome, secret } = body;

    // Simple secret to prevent unauthorized admin creation
    const ADMIN_SECRET = process.env.ADMIN_SETUP_SECRET || 'sjb-admin-2024';

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Chave secreta inválida' }, { status: 403 });
    }

    if (!email || !senha || !nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: email, senha, nome' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'admin', nome },
      });
      userId = existingUser.id;
      await supabase.from('profiles').delete().eq('id', existingUser.id);
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'admin', nome },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Erro ao criar conta' },
          { status: 400 }
        );
      }

      userId = authData.user.id;
    }

    // Create profile with admin role
    const { error: profileError1 } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'admin',
    });

    if (profileError1) {
      await supabase.from('profiles').upsert({ id: userId });
    }

    return NextResponse.json({ success: true, message: 'Admin criado com sucesso!' });
  } catch (_error) {
    console.error('Setup admin error:', _error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
