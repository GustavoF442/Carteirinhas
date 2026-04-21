import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, cpf, telefone, curso, universidade, matricula, data_entrada, endereco, foto_url } = body;

    if (!nome || !email || !senha || !cpf || !curso || !matricula) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, email, senha, cpf, curso' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingStudent) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado. Tente fazer login.' },
          { status: 400 }
        );
      }

      // Orphaned user - reuse it: update password and confirm
      console.log('Reusing orphaned auth user:', email, existingUser.id);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'student', nome },
      });

      if (updateErr) {
        console.error('Update orphaned user error:', updateErr);
        return NextResponse.json(
          { error: 'Erro ao atualizar conta existente: ' + updateErr.message },
          { status: 500 }
        );
      }

      userId = existingUser.id;
      // Clean up orphaned profile if any
      await supabase.from('profiles').delete().eq('id', existingUser.id);
    } else {
      // 2. Create new auth user (confirmed immediately)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { role: 'student', nome },
      });

      if (authError || !authData.user) {
        console.error('Auth error:', authError);
        return NextResponse.json(
          { error: authError?.message || 'Erro ao criar conta' },
          { status: 400 }
        );
      }

      userId = authData.user.id;
    }
    console.log('Created auth user:', userId, email);

    // 3. Create profile - try with role, fallback without
    let profileCreated = false;
    const { error: profileError1 } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'student',
    });

    if (profileError1) {
      console.log('Profile insert with role failed, trying without role:', profileError1.message);
      // Try without role column
      const { error: profileError2 } = await supabase.from('profiles').upsert({
        id: userId,
      });
      if (profileError2) {
        console.error('Profile insert without role also failed:', profileError2.message);
        // Last resort: the trigger might have created it
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        profileCreated = !!existingProfile;
        if (!profileCreated) {
          console.error('No profile exists and cannot create one. Cleaning up auth user.');
          await supabase.auth.admin.deleteUser(userId);
          return NextResponse.json(
            { error: 'Erro ao criar perfil. Verifique a estrutura da tabela profiles no Supabase.' },
            { status: 500 }
          );
        }
      } else {
        profileCreated = true;
      }
    } else {
      profileCreated = true;
    }

    console.log('Profile created:', profileCreated);

    // 4. Create student record
    const qr_token = generateQRToken();
    const { data: student, error: studentError } = await supabase.from('students').insert({
      user_id: userId,
      nome,
      email,
      cpf,
      telefone: telefone || null,
      curso,
      universidade: universidade || 'UNIFEBE',
      matricula: matricula || null,
      data_entrada: data_entrada || null,
      foto_url: foto_url || null,
      endereco: endereco || null,
      qr_token,
    }).select().single();

    if (studentError) {
      console.error('Student error:', studentError);
      // Clean up
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Erro ao criar registro do aluno: ' + studentError.message },
        { status: 500 }
      );
    }

    console.log('Student created:', student.id);

    // 5. Audit log (non-blocking)
    supabase.from('audit_log').insert({
      action: 'student_registered',
      table_name: 'students',
      record_id: student.id,
      user_id: userId,
      details: { nome, email },
    }).then(() => {});

    return NextResponse.json({ success: true, user_id: userId });
  } catch (_error) {
    console.error('Register error:', _error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
