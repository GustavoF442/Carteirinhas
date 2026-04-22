import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // If Supabase is not configured, allow everything through
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || !supabaseKey || supabaseKey === 'placeholder-key') {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    });

    // Public routes - skip auth check
    const publicRoutes = ['/login', '/cadastro', '/api/register', '/api/health', '/api/upload-foto', '/api/login-barcode', '/api/setup-admin', '/api/register-driver'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

    // For API routes not in public list, just pass through (they handle their own auth)
    if (isApiRoute && !isPublicRoute) {
      // Still refresh the session
      await supabase.auth.getUser();
      return response;
    }

    // Try getUser first (validates JWT with Supabase server)
    const { data: { user } } = await supabase.auth.getUser();

    // If getUser fails, try getSession as fallback (local cookie check)
    let hasSession = !!user;
    if (!hasSession) {
      const { data: { session } } = await supabase.auth.getSession();
      hasSession = !!session;
    }

    if (!hasSession && !isPublicRoute && request.nextUrl.pathname !== '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Role-based access control for protected areas
    if (user) {
      const pathname = request.nextUrl.pathname;

      // Only fetch role when accessing role-sensitive paths (perf optimization)
      const needsRoleCheck = pathname === '/login' || pathname === '/cadastro'
        || pathname.startsWith('/admin') || pathname.startsWith('/motorista') || pathname.startsWith('/aluno');

      if (!needsRoleCheck) return response;

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || 'student';

      // Redirect logged-in users away from cadastro (but NOT login — login page handles signOut itself)
      if (pathname === '/cadastro') {
        const url = request.nextUrl.clone();
        if (role === 'admin') {
          url.pathname = '/admin';
        } else if (role === 'driver') {
          url.pathname = '/motorista';
        } else {
          url.pathname = '/aluno';
        }
        return NextResponse.redirect(url);
      }

      // Block non-admins from /admin routes
      if (pathname.startsWith('/admin') && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = role === 'driver' ? '/motorista' : '/aluno';
        return NextResponse.redirect(url);
      }

      // Block non-drivers from /motorista routes
      if (pathname.startsWith('/motorista') && role !== 'driver' && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/aluno';
        return NextResponse.redirect(url);
      }

      // Block non-students from /aluno routes (admins can view for support)
      if (pathname.startsWith('/aluno') && role !== 'student' && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = role === 'driver' ? '/motorista' : '/admin';
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch (_error) {
    // If Supabase is unreachable, don't block the request
    console.error('Middleware error:', _error);
    return response;
  }
}
