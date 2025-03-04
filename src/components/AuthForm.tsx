'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import { useSupabase } from './providers/SupabaseProvider';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [origin, setOrigin] = useState<string>('');
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_IN') {
        router.push('/');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <Auth
        supabaseClient={supabase}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
              },
            },
          },
        }}
        providers={['github']}
        redirectTo={origin ? `${origin}/auth/callback` : undefined}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email address',
              password_label: 'Password',
            },
            sign_up: {
              email_label: 'Email address',
              password_label: 'Create a Password',
            },
          },
        }}
      />
    </div>
  );
}
