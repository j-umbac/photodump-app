import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '~/lib/firebase'

// ---------------------------------------------------------------------------
// 1. OAuth — Request Google Drive access via Firebase signInWithPopup
// ---------------------------------------------------------------------------

/**
 * Opens the Google consent screen requesting the `drive.file` scope.
 * Returns the real OAuth2 access token and the user's email.
 */
export async function requestDriveAccess(): Promise<{
  accessToken: string
  email: string
}> {
  const provider = new GoogleAuthProvider()
  provider.addScope('https://www.googleapis.com/auth/drive.file')

  // Force the consent prompt so Google always shows the Drive permission screen
  provider.setCustomParameters({ prompt: 'consent' })

  const result = await signInWithPopup(auth, provider)
  const credential = GoogleAuthProvider.credentialFromResult(result)

  if (!credential?.accessToken) {
    throw new Error('Failed to obtain Google Drive access token from sign-in.')
  }

  return {
    accessToken: credential.accessToken,
    email: result.user.email || ''
  }
}

// ---------------------------------------------------------------------------
// 2. Folder helpers — find-or-create to avoid duplicates
// ---------------------------------------------------------------------------

/**
 * Search Google Drive for a folder by name (optionally inside a parent).
 * Returns the folder ID if found, or `null`.
 */
async function findFolder(
  name: string,
  accessToken: string,
  parentId?: string
): Promise<string | null> {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) {
    q += ` and '${parentId}' in parents`
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Drive folder search failed: ${errorText}`)
  }

  const data = await response.json()
  return data.files?.[0]?.id || null
}

/**
 * Create a new folder on Google Drive.
 */
async function createFolder(
  name: string,
  accessToken: string,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, any> = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  }
  if (parentId) {
    metadata.parents = [parentId]
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Drive folder creation failed: ${errorText}`)
  }

  const result = await response.json()
  return result.id as string
}

/**
 * Find an existing folder by name or create it. Returns the folder ID.
 */
export async function findOrCreateFolder(
  name: string,
  accessToken: string,
  parentId?: string
): Promise<string> {
  const existingId = await findFolder(name, accessToken, parentId)
  if (existingId) return existingId
  return createFolder(name, accessToken, parentId)
}

// ---------------------------------------------------------------------------
// 3. File upload
// ---------------------------------------------------------------------------

/**
 * Upload a single file to a Google Drive folder using multipart upload.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  parentFolderId: string,
  accessToken: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const metadata = {
    name: file.name,
    parents: [parentFolderId]
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  )
  form.append('file', file)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    }
  )

  if (!response.ok) {
    const errorText = await response.text()

    // Surface a specific message for expired / invalid tokens
    if (response.status === 401) {
      throw new DriveAuthError(
        'Google Drive access token has expired. The dump creator needs to re-authorize from the dashboard.'
      )
    }
    throw new Error(`Google Drive upload failed (${response.status}): ${errorText}`)
  }

  const result = await response.json()
  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`
  }
}

// Custom error class so callers can distinguish auth failures
export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DriveAuthError'
  }
}

// ---------------------------------------------------------------------------
// 4. Main upload entry point used by the public upload page
// ---------------------------------------------------------------------------

export async function uploadFileToDrive(
  file: File,
  dumpId: string,
  config?: {
    gdriveConnected: boolean
    gdriveAccessToken?: string
    gdriveFolderId?: string
    creatorId: string
    dumpTitle: string
  }
): Promise<{ id: string; name: string; url: string; size: number; synced: boolean }> {
  // Require a real Google Drive connection
  if (
    !config?.gdriveConnected ||
    !config?.gdriveAccessToken ||
    !config?.gdriveFolderId
  ) {
    throw new Error(
      'Google Drive is not configured for this dump. The creator needs to connect Google Drive from the dashboard.'
    )
  }

  // Upload to the dump's subfolder on Google Drive
  const result = await uploadFileToGoogleDrive(
    file,
    config.gdriveFolderId,
    config.gdriveAccessToken
  )

  return {
    id: result.id,
    name: result.name,
    url: result.webViewLink,
    size: file.size,
    synced: true
  }
}
