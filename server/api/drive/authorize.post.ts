import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code is required'
    })
  }

  const clientId = process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server missing Google OAuth configuration'
    })
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'postmessage', // Required for popup mode initCodeClient
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Google OAuth Exchange Error:', data)
      throw createError({
        statusCode: response.status,
        statusMessage: data.error_description || 'Failed to exchange authorization code'
      })
    }

    // Fetch the user's email address
    let email = ''
    try {
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        email = userData.email || ''
      }
    } catch (e) {
      console.warn('Failed to fetch user email:', e)
    }

    // Return the refresh_token, access_token, and email back to the client securely
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // This should be saved by the client in Firestore
      expiresIn: data.expires_in,
      email
    }
  } catch (error: any) {
    console.error('Authorize error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
