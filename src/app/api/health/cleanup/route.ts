import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceKey) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY not set' }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if force=true to delete ALL users
  let forceAll = false;
  try {
    const body = await request.json();
    forceAll = body.force === true;
  } catch (_e) {
    // No body, default behavior
  }

  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const deleted: string[] = [];
  const kept: string[] = [];

  for (const user of users.users) {
    if (forceAll) {
      // Delete student, profile, then auth user
      await supabase.from('students').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (!delErr) {
        deleted.push(user.email || user.id);
      }
    } else {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!student) {
        await supabase.from('profiles').delete().eq('id', user.id);
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (!delErr) {
          deleted.push(user.email || user.id);
        }
      } else {
        kept.push(user.email || user.id);
      }
    }
  }

  return NextResponse.json({
    message: `Deleted ${deleted.length} users, kept ${kept.length}`,
    deleted,
    kept,
  });
}
