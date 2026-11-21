import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { accountHandler, type AccountBackend } from '../_shared/account-handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anonymousKey = Deno.env.get('SUPABASE_ANON_KEY')!
const origins = (Deno.env.get('GYMBEAST_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)

const backend: AccountBackend = {
  async allowAttempt(bucket) {
    const { data, error } = await service.rpc('allow_account_attempt', { p_bucket: bucket })
    if (error) throw error
    return data === true
  },
  async register({ email, password, handle, operation }) {
    const { error } = await service.auth.admin.createUser({ email, password, email_confirm: true,
      app_metadata: { gymbeast_registration: { handle, operation } },
    })
    if (error && (!error.status || error.status >= 502)) throw error
    return !error
  },
  async matchesRegistration(handle, operation) {
    const { data, error } = await service.from('account_logins').select('owner')
      .eq('handle', handle).eq('registration_id', operation).maybeSingle()
    if (error) throw error
    return !!data
  },
  async signIn(email, password) {
    const client = createClient(url, anonymousKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error && (!error.status || error.status >= 500)) throw error
    if (error || !data.user || !data.session) return null
    return { user: data.user, tokens: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } }
  },
  async changePassword(user, password) {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password, app_metadata: { ...user.app_metadata, temporary_password_required: false },
    })
    return !error
  },
}

Deno.serve(accountHandler(backend, origins))
