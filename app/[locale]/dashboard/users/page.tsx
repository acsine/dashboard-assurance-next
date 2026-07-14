'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { usersApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Users, Plus, Shield, Check, X, Loader2, Pencil, UserCheck, UserX, KeyRound, Trash2 } from 'lucide-react'
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('CM')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('AGENT_TERRAIN')

  const [editingUser, setEditingUser] = useState<any>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<any>(null)

  // Query users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  // Create user
  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur créé avec succès')
      setShowAddForm(false)
      // reset
      setFullName('')
      setEmail('')
      setCountryCode('CM')
      setPhone('')
      setPassword('')
      setRole('AGENT_TERRAIN')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création')
    },
  })

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Statut utilisateur mis à jour')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur de mise à jour')
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Collaborateur mis à jour')
      setEditingUser(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la modification')
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Collaborateur supprimé')
      setDeletingUser(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })

  // Regenerate password mutation
  const regeneratePasswordMutation = useMutation({
    mutationFn: (id: string) => usersApi.regeneratePassword(id),
    onSuccess: (data: any) => {
      const p = data.temporary_password || data.data?.temporary_password || ''
      setTempPassword(p)
      toast.success('Mot de passe temporaire généré')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la régénération')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !role) {
      toast.error('Nom et rôle requis')
      return
    }

    if (phone) {
      if (!countryCode) {
        toast.error('Le code pays est requis avec le numéro de téléphone')
        return
      }
      const parsedCountry = countryCode.toUpperCase() as CountryCode
      const phoneNumber = parsePhoneNumberFromString(phone, parsedCountry)
      if (!phoneNumber || !phoneNumber.isValid()) {
        toast.error('Le numéro de téléphone est invalide pour ce code pays')
        return
      }
    }

    createUserMutation.mutate({
      full_name: fullName,
      email: email || undefined,
      phone: phone || undefined,
      country_code: phone ? countryCode.toUpperCase() : undefined,
      password: password || undefined,
      role: role,
    })
  }

  const safeUsers = Array.isArray(users) ? users : []

  return (
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Gestion des Collaborateurs"
        subtitle="Configurez les comptes des agents terrain, des gestionnaires back-office et admins."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-950">Membres de l'Agence</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0"
          >
            <Plus className="h-4 w-4" />
            Nouveau Membre
          </button>
        </div>

        {showAddForm && (
          <Card className="border-gray-100 shadow-sm bg-white max-w-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Créer un compte collaborateur
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Nom complet *
                    </label>
                    <Input
                      placeholder="Ex: Paul Mbarga..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 text-xs border-gray-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Rôle d'accès *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none"
                    >
                      <option value="AGENT_TERRAIN">Agent Terrain (RBAC)</option>
                      <option value="BACKOFFICE">Back-Office (Gestionnaire)</option>
                      <option value="ADMIN_AGENCE">Admin Agence (Complet)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Adresse E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="Ex: paul@agence.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Téléphone *
                    </label>
                    <div className="flex">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-28 h-10 rounded-l-xl border border-gray-200 border-r-0 bg-white px-2 py-2 text-xs transition-colors focus-visible:outline-none focus:border-gray-200 text-gray-900"
                      >
                        <option value="CM">🇨🇲 CM (+237)</option>
                        <option value="CI">🇨🇮 CI (+225)</option>
                        <option value="SN">🇸🇳 SN (+221)</option>
                        <option value="GA">🇬🇦 GA (+241)</option>
                        <option value="CG">🇨🇬 CG (+242)</option>
                        <option value="TD">🇹🇩 TD (+235)</option>
                        <option value="FR">🇫🇷 FR (+33)</option>
                      </select>
                      <Input
                        placeholder="Ex: 677000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 h-10 text-xs border-gray-200 rounded-l-none rounded-r-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Mot de passe (Temporaire)
                    </label>
                    <Input
                      type="password"
                      placeholder="Mot de passe ou généré automatiquement si vide"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 text-xs border-gray-205"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createUserMutation.isPending}
                    isLoading={createUserMutation.isPending}
                    className="text-white"
                  >
                    Créer le Compte
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400 font-medium">
              Chargement des comptes en cours...
            </div>
          ) : safeUsers.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Aucun collaborateur enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Collaborateur
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Identifiants
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {safeUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="py-4">
                        <span className="font-bold text-sm text-gray-900 block">{u.full_name}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">
                          ID: {u.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-xs text-gray-700 block">{u.email || 'N/A'}</span>
                        <span className="text-xs text-gray-400 block mt-0.5">{u.phone || 'N/A'}</span>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-800">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border-0 flex items-center justify-center active:scale-95"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <button
                            disabled={toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === u.id}
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: u.id, is_active: !u.is_active })
                            }
                            className={`p-2 rounded-lg transition-all cursor-pointer border-0 flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                              u.is_active
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                            title={u.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            disabled={regeneratePasswordMutation.isPending && regeneratePasswordMutation.variables === u.id}
                            onClick={() => regeneratePasswordMutation.mutate(u.id)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer border-0 flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Régénérer MDP"
                          >
                            {regeneratePasswordMutation.isPending && regeneratePasswordMutation.variables === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 flex items-center justify-center active:scale-95"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-50">
                  Modifier le collaborateur
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Nom complet
                    </label>
                    <Input
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Adresse E-mail
                    </label>
                    <Input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Téléphone
                    </label>
                    <div className="flex">
                      <select
                        value={editingUser.country_code || 'CM'}
                        onChange={(e) => setEditingUser({ ...editingUser, country_code: e.target.value })}
                        className="w-28 h-10 rounded-l-xl border border-gray-200 border-r-0 bg-white px-2 py-2 text-xs transition-colors focus-visible:outline-none focus:border-gray-200 text-gray-900"
                      >
                        <option value="CM">🇨🇲 CM (+237)</option>
                        <option value="CI">🇨🇮 CI (+225)</option>
                        <option value="SN">🇸🇳 SN (+221)</option>
                        <option value="GA">🇬🇦 GA (+241)</option>
                        <option value="CG">🇨🇬 CG (+242)</option>
                        <option value="TD">🇹🇩 TD (+235)</option>
                        <option value="FR">🇫🇷 FR (+33)</option>
                      </select>
                      <Input
                        placeholder="Ex: 677000000"
                        value={editingUser.phone || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        className="flex-1 h-10 text-xs border-gray-200 rounded-l-none rounded-r-xl"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-3">
                  <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={updateUserMutation.isPending}
                    isLoading={updateUserMutation.isPending}
                    onClick={() => {
                      if (editingUser.phone) {
                        const parsedCountry = (editingUser.country_code || 'CM').toUpperCase() as CountryCode
                        const phoneNumber = parsePhoneNumberFromString(editingUser.phone, parsedCountry)
                        if (!phoneNumber || !phoneNumber.isValid()) {
                          toast.error('Le numéro de téléphone est invalide pour ce code pays')
                          return
                        }
                      }
                      updateUserMutation.mutate({
                        id: editingUser.id,
                        data: {
                          full_name: editingUser.full_name,
                          email: editingUser.email || undefined,
                          phone: editingUser.phone || undefined,
                          country_code: editingUser.country_code || 'CM',
                        },
                      })
                    }}
                    className="text-white"
                  >
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tempPassword !== null && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Mot de passe régénéré
                </h3>
                <p className="text-xs text-gray-500">
                  Veuillez copier le mot de passe temporaire ci-dessous et le transmettre à l'agent :
                </p>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono text-sm font-bold text-slate-800 tracking-wider select-all select-text cursor-pointer">
                  {tempPassword}
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setTempPassword(null)}
                    className="w-full text-white"
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {deletingUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <X className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Supprimer le collaborateur
                </h3>
                <p className="text-xs text-gray-500">
                  Êtes-vous sûr de vouloir supprimer définitivement <strong>{deletingUser.full_name}</strong> ? Cette action est irréversible.
                </p>
                <div className="flex gap-2 justify-stretch pt-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setDeletingUser(null)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 text-white bg-red-600 hover:bg-red-500"
                    disabled={deleteUserMutation.isPending}
                    isLoading={deleteUserMutation.isPending}
                    onClick={() => deleteUserMutation.mutate(deletingUser.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
