import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub

    // --- Authorization: check role ---
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    const hasPermission = roles?.some((r: any) =>
      r.role === 'admin' || r.role === 'nutricionista' || r.role === 'gestor'
    )

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Process request ---
    const body = await req.json()
    const { nc_id, action, applied_action } = body

    if (!nc_id || !action) {
      return new Response(
        JSON.stringify({ error: 'nc_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate') {
      const { error } = await supabase
        .from('non_conformities')
        .update({
          resolved: true,
          validation_status: 'validated',
          applied_action: applied_action || null,
        })
        .eq('id', nc_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'NC validated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'discard') {
      const { error } = await supabase
        .from('non_conformities')
        .update({
          resolved: true,
          validation_status: 'discarded',
        })
        .eq('id', nc_id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'NC discarded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'bulk_validate') {
      const { nc_ids, comment } = body
      if (!nc_ids || !Array.isArray(nc_ids)) {
        return new Response(
          JSON.stringify({ error: 'nc_ids array required for bulk_validate' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('non_conformities')
        .update({
          resolved: true,
          validation_status: 'validated',
          applied_action: comment || null,
        })
        .in('id', nc_ids)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: `${nc_ids.length} NCs validated` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: validate, discard, or bulk_validate' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
