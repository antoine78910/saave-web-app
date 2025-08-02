import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔄 AUTH CALLBACK: Début du traitement de callback');
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('🔍 AUTH CALLBACK: Paramètres reçus:', {
    code: !!code,
    codeLength: code?.length,
    error,
    errorDescription,
    fullUrl: requestUrl.toString()
  });

  if (error) {
    console.error('❌ AUTH CALLBACK: Erreur dans les paramètres:', { error, errorDescription });
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    console.log('✅ AUTH CALLBACK: Code d\'autorisation reçu, échange en cours...');
    
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      console.log('📡 AUTH CALLBACK: Résultat de l\'échange:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        error: exchangeError
      });

      if (exchangeError) {
        console.error('❌ AUTH CALLBACK: Erreur lors de l\'échange:', exchangeError);
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(exchangeError.message)}`);
      }

      if (data.session) {
        console.log('✅ AUTH CALLBACK: Session créée avec succès pour:', data.user?.email);
      }
    } catch (error) {
      console.error('❌ AUTH CALLBACK: Erreur inattendue:', error);
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=unexpected_error`);
    }
  } else {
    console.log('⚠️ AUTH CALLBACK: Aucun code d\'autorisation reçu');
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const finalUrl = `${redirectUrl}/app`;
  
  console.log('🔄 AUTH CALLBACK: Redirection vers:', finalUrl);
  return NextResponse.redirect(finalUrl);
}
