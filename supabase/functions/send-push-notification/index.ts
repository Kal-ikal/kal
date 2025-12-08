// ===========================================================
// 🔧 SUPABASE EDGE FUNCTION
// 📁 Lokasi: supabase/functions/send-push-notification/index.ts
// 📝 Aksi: CREATE NEW FILE
// ✅ Edge Function untuk mengirim push notifications via Expo
// ===========================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface NotificationPayload {
  user_id: string
  title: string
  body: string
  data?: Record<string, any>
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const payload: NotificationPayload = await req.json()
    const { user_id, title, body, data } = payload

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user's expo push token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.expo_push_token) {
      console.log('User has no expo push token')
      return new Response(
        JSON.stringify({ error: 'No push token found for user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prepare push notification message
    const message = {
      to: profile.expo_push_token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }

    // Send push notification via Expo
    const expoPushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const expoPushData = await expoPushResponse.json()

    console.log('Expo push response:', expoPushData)

    // Check for errors in Expo response
    if (expoPushData.data?.[0]?.status === 'error') {
      console.error('Expo push error:', expoPushData.data[0])
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: expoPushData.data[0] }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Push notification sent successfully',
        ticket: expoPushData.data?.[0]
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})