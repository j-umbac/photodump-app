import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { refreshToken } = body

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refresh token is required'
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
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Google OAuth Refresh Error:', data)
      throw createError({
        statusCode: response.status,
        statusMessage: data.error_description || 'Failed to refresh token'
      })
    }

    // Return the fresh access token back to the client securely
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }
  } catch (error: any) {
    console.error('Refresh token error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
