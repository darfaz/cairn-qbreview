import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { client_id } = await req.json()
    
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Triggering review for client: ${client_id}`)

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      console.error('Client not found:', clientError)
      return new Response(
        JSON.stringify({ error: 'Client not found' }), 
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for existing processing review (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('client_id', client_id)
      .eq('status', 'processing')
      .gte('triggered_at', fiveMinutesAgo)
      .maybeSingle()

    if (existingReview) {
      console.log('Review already processing for client:', client_id)
      return new Response(
        JSON.stringify({ error: 'Review already processing for this client' }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create new review record
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        client_id: client_id,
        status: 'processing',
        triggered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Failed to create review:', reviewError)
      return new Response(
        JSON.stringify({ error: 'Failed to create review' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Created review record: ${review.id}`)

    // Trigger N8N workflow
    const n8nWebhookUrl = 'https://execture.app.n8n.cloud/webhook/b6f3677e-2bcf-42f7-9d9a-a1d2f512f06c'
    console.log('Triggering N8N workflow...')
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        realm_id: client.realm_id,
        client_name: client.client_name,
        review_id: review.id,
        client_id: client.id,
        environment: 'sandbox'
      })
    })

    if (!n8nResponse.ok) {
      console.error('N8N workflow failed:', await n8nResponse.text())
      
      // Update review to failed
      await supabase
        .from('reviews')
        .update({ status: 'failed' })
        .eq('id', review.id)
      
      return new Response(
        JSON.stringify({ error: 'N8N workflow failed' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Review ${review.id} triggered successfully`)

    return new Response(
      JSON.stringify({ success: true, review_id: review.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in trigger-review:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
