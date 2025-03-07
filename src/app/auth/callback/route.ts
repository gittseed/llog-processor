import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies() // ✅ Await the cookies() function
    const cookieValues = cookieStore.getAll() // ✅ Now we can call getAll()

    const response = NextResponse.redirect(requestUrl.origin)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = cookieValues.find((cookie) => cookie.name === name)
            return cookie?.value
          },
          set(name, value, options) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/auth-error`)
}
