'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/supabase';
import { useUserStore } from '@/lib/store';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services-client';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.id) return resolve();

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Identity Services não carregou.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services não carregou.'));
    document.head.appendChild(script);
  });
}

export default function GoogleLoginButton({ redirectTo = '/profile?next=/lobby' }: { redirectTo?: string }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const setSessionUser = useUserStore((state) => state.setSessionUser);
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleLogin = async () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.');
        setErrorMessage('Login Google indisponível no momento.');
        setLoading(false);
        return;
      }

      try {
        await loadGoogleIdentityScript();
      } catch (error) {
        console.error('Erro ao carregar Google Identity Services:', error);
        setErrorMessage('Login Google indisponível no momento.');
        setLoading(false);
        return;
      }

      if (cancelled || initializedRef.current || !buttonRef.current || !window.google?.accounts?.id) return;

      initializedRef.current = true;
      setLoading(false);

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setErrorMessage('');

          if (!response.credential) {
            setErrorMessage('Não foi possível concluir o login com Google.');
            return;
          }

          const { data, error } = await supabaseAuth.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          });

          if (error) {
            console.error('Erro no login Google:', error);
            setErrorMessage('Erro ao entrar com Google. Tente novamente.');
            return;
          }

          if (data.user) {
            setSessionUser(data.user);
            await fetchProfile(data.user.id);
          }

          router.replace(redirectTo);
        },
      });

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      });
    };

    void initializeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [fetchProfile, redirectTo, router, setSessionUser]);

  return (
    <div className="flex w-full flex-col items-center">
      <div ref={buttonRef} className="flex min-h-12 w-full items-center justify-center" />
      {loading && <p className="mt-2 text-center text-xs font-bold text-slate-400">Carregando login Google...</p>}
      {errorMessage && <p className="mt-2 text-center text-xs font-bold text-rose-500">{errorMessage}</p>}
    </div>
  );
}
