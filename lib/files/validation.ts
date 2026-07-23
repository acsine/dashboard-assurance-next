export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  // Excel (.xlsx / .xls) — import barèmes assureurs
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
])

export function validateUploadFile(file: Pick<File, 'size' | 'type'> & { name?: string }): void {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Chaque fichier est limité à 10 Mo')
  const type = file.type || ''
  const name = 'name' in file && typeof file.name === 'string' ? file.name.toLowerCase() : ''
  const isExcelByExt = name.endsWith('.xlsx') || name.endsWith('.xls')
  const excelMimeOk =
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.ms-excel' ||
    (isExcelByExt && (!type || type === 'application/octet-stream'))
  if (!ALLOWED_UPLOAD_MIME.has(type) && !excelMimeOk) {
    throw new Error(`Type de fichier interdit : ${type || 'inconnu'}`)
  }
}
