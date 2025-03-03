import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';
import { Suspense } from 'react'
import Dashboard from '@/components/Dashboard';
import AuthForm from '@/components/AuthForm';

export default async function Home() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          // We'll handle cookie setting in middleware
        },
        remove(name, options) {
          // We'll handle cookie removal in middleware
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Log Processing System
            </h1>
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-600">
      <h1 className="text-3xl font-bold mb-8">Log Analytics Dashboard</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
