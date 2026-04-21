import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, telefone, cnh } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, email, senha' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // Check if driver record already exists
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingDriver) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado como motorista.' },
          { status: 400 }
        );
      }

      // Reuse orphaned auth user
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'driver', nome },
      });

      userId = existingUser.id;
      await supabase.from('profiles').delete().eq('id', existingUser.id);
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'driver', nome },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Erro ao criar conta' },
          { status: 400 }
        );
      }

      userId = authData.user.id;
    }

    // Create profile
    const { error: profileError1 } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'driver',
    });

    if (profileError1) {
      await supabase.from('profiles').upsert({ id: userId });
    }

    // Create driver record
    const { error: driverError } = await supabase.from('drivers').insert({
      user_id: userId,
      nome,
      telefone: telefone || null,
      cnh: cnh || null,
    });

    if (driverError) {
      console.error('Driver error:', driverError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Erro ao criar motorista: ' + driverError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (_error) {
    console.error('Register driver error:', _error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
