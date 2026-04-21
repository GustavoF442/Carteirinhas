import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: url ? `${url.substring(0, 30)}...` : 'NOT SET',
      ANON_KEY: anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET',
      SERVICE_ROLE_KEY: serviceKey ? `${serviceKey.substring(0, 20)}...` : 'NOT SET',
    },
  };

  // Test 1: Anon key connection
  try {
    const anonClient = createClient(url, anonKey);
    const { error } = await anonClient.from('profiles').select('count', { count: 'exact', head: true });
    results.anon_connection = {
      success: !error,
      error: error?.message || null,
      hint: error?.hint || null,
    };
  } catch (e) {
    results.anon_connection = { success: false, error: String(e) };
  }

  // Test 2: Service role key connection
  if (serviceKey) {
    try {
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Test profiles table
      const { count: profileCount, error: profileErr } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Test students table
      const { count: studentCount, error: studentErr } = await adminClient
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Test auth users
      const { data: authUsers, error: authErr } = await adminClient.auth.admin.listUsers({ perPage: 5 });

      results.service_role_connection = {
        success: !profileErr && !studentErr,
        profiles_count: profileCount,
        profiles_error: profileErr?.message || null,
        students_count: studentCount,
        students_error: studentErr?.message || null,
        auth_users_count: authUsers?.users?.length ?? null,
        auth_users_error: authErr?.message || null,
        auth_users: authUsers?.users?.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          confirmed: !!u.email_confirmed_at,
        })) || [],
      };
    } catch (e) {
      results.service_role_connection = { success: false, error: String(e) };
    }
  } else {
    results.service_role_connection = { success: false, error: 'SERVICE_ROLE_KEY not set' };
  }

  // Test 3: Check if tables exist
  if (serviceKey) {
    try {
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      
      const tables = ['profiles', 'students', 'drivers', 'buses', 'routes', 'trips', 'daily_votes', 'boardings', 'audit_log'];
      const tableStatus: Record<string, string> = {};
      
      for (const table of tables) {
        const { error } = await adminClient.from(table).select('count', { count: 'exact', head: true });
        tableStatus[table] = error ? `ERROR: ${error.message}` : 'OK';
      }
      
      results.tables = tableStatus;
    } catch (e) {
      results.tables = { error: String(e) };
    }
  }

  // Test 4: Check actual column structure
  if (serviceKey) {
    try {
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await adminClient.rpc('get_table_columns', {}).maybeSingle();
      
      // Fallback: try to read one row from each key table
      const { data: profileSample } = await adminClient.from('profiles').select('*').limit(1);
      const { data: studentSample } = await adminClient.from('students').select('*').limit(1);
      
      results.schema_info = {
        profiles_columns: profileSample?.length ? Object.keys(profileSample[0]) : 'empty - trying insert test',
        students_columns: studentSample?.length ? Object.keys(studentSample[0]) : 'empty - trying insert test',
      };

      // Check foreign keys on students table
      const { data: fkData } = await adminClient.rpc('exec_sql', {
        query: `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.table_name = 'students' AND tc.constraint_type = 'FOREIGN KEY'`
      });
      results.students_foreign_keys = fkData;

    } catch (_e) {
      // RPC not available, try direct approach
      try {
        const adminClient = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        // Insert a test profile to see what columns are expected
        const { error: testErr } = await adminClient.from('profiles').insert({ id: '00000000-0000-0000-0000-000000000000', role: 'student' });
        results.profiles_insert_test = testErr?.message || 'success';
        // Clean up
        await adminClient.from('profiles').delete().eq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e2) {
        results.schema_info = { error: String(e2) };
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
