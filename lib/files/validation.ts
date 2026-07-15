export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
])

export function validateUploadFile(file: Pick<File, 'size' | 'type'>): void {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Chaque fichier est limité à 10 Mo')
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
    throw new Error(`Type de fichier interdit : ${file.type || 'inconnu'}`)
  }
}
