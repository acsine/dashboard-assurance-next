import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, validateUploadFile } from '@/lib/files/validation'

describe('validation des fichiers', () => {
  it('accepte une image autorisée sous 10 Mo', () => {
    expect(() => validateUploadFile({ size: 1024, type: 'image/jpeg' })).not.toThrow()
  })

  it('refuse les types non autorisés', () => {
    expect(() => validateUploadFile({ size: 1024, type: 'text/html' })).toThrow(/Type/)
  })

  it('refuse un fichier dépassant 10 Mo', () => {
    expect(() =>
      validateUploadFile({ size: MAX_UPLOAD_BYTES + 1, type: 'image/png' }),
    ).toThrow(/10 Mo/)
  })

  it('accepte un fichier Excel .xlsx', () => {
    expect(() =>
      validateUploadFile({
        size: 2048,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: 'bareme.xlsx',
      }),
    ).not.toThrow()
  })

  it('accepte un .xlsx même si le navigateur envoie octet-stream', () => {
    expect(() =>
      validateUploadFile({
        size: 2048,
        type: 'application/octet-stream',
        name: 'bareme.xlsx',
      }),
    ).not.toThrow()
  })
})
