'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { supportApi, type SupportContact } from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Pencil, Phone, Plus, Save, Trash2, X } from 'lucide-react'

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '').trim()
}

export function SupportContactsPanel() {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editActive, setEditActive] = useState(true)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['support-contacts-admin'],
    queryFn: () => supportApi.listAdminContacts(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      supportApi.createContact({
        label: label.trim(),
        phone: normalizePhone(phone),
        description: description.trim() || undefined,
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-contacts-admin'] })
      setLabel('')
      setPhone('')
      setDescription('')
      toast.success('Contact support créé')
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      supportApi.updateContact(editingId!, {
        label: editLabel.trim(),
        phone: normalizePhone(editPhone),
        description: editDescription.trim() || null,
        is_active: editActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-contacts-admin'] })
      setEditingId(null)
      toast.success('Contact mis à jour')
    },
    onError: (e: Error) => toast.error(e.message || 'Mise à jour impossible'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportApi.deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-contacts-admin'] })
      toast.success('Contact supprimé')
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  })

  const list = Array.isArray(contacts) ? contacts : []

  const startEdit = (c: SupportContact) => {
    setEditingId(c.id)
    setEditLabel(c.label)
    setEditPhone(c.phone)
    setEditDescription(c.description || '')
    setEditActive(c.is_active)
  }

  const validatePhone = (value: string) => {
    const cleaned = normalizePhone(value)
    return cleaned.length >= 5 && cleaned.length <= 20
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Numéros support
        </h3>
        <p className="text-[11px] text-slate-500 mt-1">
          Ces contacts sont visibles par les agents terrain dans l’app mobile.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            Aucun numéro configuré. Ajoutez le premier ci-dessous.
          </p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
              {editingId === c.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Libellé (ex. Support commercial)"
                    className="h-9 text-xs"
                  />
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Téléphone (+237…)"
                    className="h-9 text-xs font-mono"
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    className="h-9 text-xs"
                  />
                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Contact actif
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="text-white"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        if (editLabel.trim().length < 2) {
                          toast.error('Libellé requis (min. 2 caractères)')
                          return
                        }
                        if (!validatePhone(editPhone)) {
                          toast.error('Numéro invalide (5 à 20 caractères)')
                          return
                        }
                        updateMutation.mutate()
                      }}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      Enregistrer
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.label}</p>
                    <a
                      href={`tel:${c.phone}`}
                      className="text-sm font-mono font-semibold text-blue-700 hover:underline"
                    >
                      {c.phone}
                    </a>
                    {c.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                    )}
                    <span
                      className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        c.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {c.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(c)}>
                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Nouveau contact
        </p>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (ex. Hotline agence)"
          className="h-9 text-xs"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro (+2376…)"
          className="h-9 text-xs font-mono"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
          className="h-9 text-xs"
        />
        <Button
          type="button"
          variant="primary"
          className="w-full text-white"
          disabled={createMutation.isPending}
          onClick={() => {
            if (label.trim().length < 2) {
              toast.error('Libellé requis (min. 2 caractères)')
              return
            }
            if (!validatePhone(phone)) {
              toast.error('Numéro invalide (5 à 20 caractères)')
              return
            }
            createMutation.mutate()
          }}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Créer le numéro support
        </Button>
      </div>
    </div>
  )
}
