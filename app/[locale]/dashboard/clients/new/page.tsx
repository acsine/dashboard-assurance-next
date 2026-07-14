'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'

export default function NewClientPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Form states
  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('CM') // default to Cameroon
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [profession, setProfession] = useState('')
  const [cniNumber, setCniNumber] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [sexe, setSexe] = useState<'MASCULIN' | 'FEMININ'>('MASCULIN')

  const createClientMutation = useMutation({
    mutationFn: (data: any) => clientsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client créé avec succès')
      router.push(`/dashboard/clients/${data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création du client')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !countryCode || !phone) {
      toast.error('Nom, Code Pays et Téléphone sont obligatoires')
      return
    }

    const parsedCountry = countryCode.toUpperCase() as CountryCode
    const phoneNumber = parsePhoneNumberFromString(phone, parsedCountry)
    if (!phoneNumber || !phoneNumber.isValid()) {
      toast.error('Le numéro de téléphone est invalide pour ce code pays')
      return
    }

    createClientMutation.mutate({
      full_name: fullName,
      country_code: countryCode.toUpperCase(),
      phone: phone,
      email: email || undefined,
      address: address || undefined,
      city: city || undefined,
      profession: profession || undefined,
      cni_number: cniNumber || undefined,
      date_naissance: dateNaissance || undefined,
      sexe: sexe || undefined,
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Nouveau Client"
        subtitle="Enregistrez les informations d'un nouvel assuré dans la base de données."
      />

      <div className="p-8 space-y-6 max-w-3xl flex-1">
        {/* Navigation back */}
        <div>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
        </div>

        <Card className="border-gray-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Informations Générales
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Nom complet *
                    </label>
                    <Input
                      placeholder="Jean Dupont..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Profession
                    </label>
                    <Input
                      placeholder="Commerçant, Chauffeur..."
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Sexe *
                    </label>
                    <select
                      value={sexe}
                      onChange={(e) => setSexe(e.target.value as 'MASCULIN' | 'FEMININ')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-transparent"
                    >
                      <option value="MASCULIN">Masculin</option>
                      <option value="FEMININ">Féminin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Date de Naissance
                    </label>
                    <Input
                      type="date"
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Contact and address */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Contact & Localisation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Numéro de Téléphone *
                    </label>
                    <div className="flex">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-28 h-11 rounded-l-xl border border-gray-200 border-r-0 bg-white px-2 py-2 text-xs transition-colors focus-visible:outline-none focus:border-gray-200 text-gray-900"
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
                        placeholder="Ex: 690000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 h-11 text-xs border-gray-200 rounded-l-none rounded-r-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Adresse E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Ville
                    </label>
                    <Input
                      placeholder="Douala, Yaoundé..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Adresse
                    </label>
                    <Input
                      placeholder="Rue, Quartier..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Official IDs */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Pièces d'Identité
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Numéro CNI / Passeport
                  </label>
                  <Input
                    placeholder="100223456..."
                    value={cniNumber}
                    onChange={(e) => setCniNumber(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Link href="/dashboard/clients">
                  <Button type="button" variant="outline" size="lg">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={createClientMutation.isPending}
                  className="text-white flex items-center gap-2 font-semibold"
                >
                  {createClientMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
