import { createClient } from '@/lib/supabase/server'

export async function getUserData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let userData = {
    email: user?.email || '',
    displayName: null as string | null,
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      userData.displayName = profile.display_name
    }
  }

  return userData
}
