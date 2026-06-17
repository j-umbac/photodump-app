import { defineEventHandler, readBody, createError } from 'h3'
// Initialize Firebase Admin (reuse existing app if already initialized)
async function getAdminDb() {
  const isDev = process.env.NODE_ENV !== 'production'

  // Set the emulator host BEFORE importing firebase-admin
  if (isDev && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  }

  // Dynamically import to prevent hoisting issues
  const { initializeApp, getApps } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'photodump-4d917',
    })
  }
  
  return getFirestore()
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dumpId } = body

  if (!dumpId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'dumpId is required'
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
    const adminDb = await getAdminDb()

    // 1. Get the dump document to find the creatorId and gdriveFolderId
    const dumpDoc = await adminDb.doc(`dumps/${dumpId}`).get()
    if (!dumpDoc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Dump not found' })
    }
    const dumpData = dumpDoc.data()!
    const creatorId = dumpData.creatorId
    const gdriveFolderId = dumpData.gdriveFolderId

    if (!creatorId || !gdriveFolderId) {
      throw createError({ statusCode: 400, statusMessage: 'Google Drive not configured for this dump' })
    }

    // 2. Get the creator's refresh token from their user document
    const userDoc = await adminDb.doc(`users/${creatorId}`).get()
    if (!userDoc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Creator user document not found' })
    }
    const userData = userDoc.data()!
    const refreshToken = userData.gdriveRefreshToken

    if (!refreshToken || !userData.gdriveConnected) {
      throw createError({ statusCode: 400, statusMessage: 'Google Drive is not connected. Ask the dump creator to connect from their dashboard.' })
    }

    // 3. Exchange refresh token for a fresh access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      console.error('Token refresh failed:', tokenData)
      throw createError({ statusCode: 401, statusMessage: 'Google Drive token expired. Ask the dump creator to re-authorize.' })
    }

    // 4. Return the fresh access token and folder ID (token is short-lived, safe to return)
    return {
      accessToken: tokenData.access_token,
      gdriveFolderId,
      expiresIn: tokenData.expires_in
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Upload token error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to prepare upload credentials'
    })
  }
})
