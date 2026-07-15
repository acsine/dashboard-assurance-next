'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, contractsApi } from '@/lib/api/mobi-assur'
import { GUARANTEE_OPTIONS, isAtLeast18, optionalEmailSchema } from '@/lib/schemas/client-form'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, Upload, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'
import { RoleGuard } from '@/components/auth/RoleGuard'

const inputClass = 'h-11 text-xs border-gray-200'
const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const selectClass =
  'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

function NewClientContent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Assuré
  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('CM')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [profession, setProfession] = useState('')
  const [cniNumber, setCniNumber] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [dobError, setDobError] = useState('')
  const [sexe, setSexe] = useState<'MASCULIN' | 'FEMININ'>('MASCULIN')

  // Véhicule
  const [marque, setMarque] = useState('')
  const [modele, setModele] = useState('')
  const [immatriculation, setImmatriculation] = useState('')
  const [chassisNum, setChassisNum] = useState('')
  const [energie, setEnergie] = useState('ESSENCE')
  const [puissanceCv, setPuissanceCv] = useState('9')
  const [nbPlaces, setNbPlaces] = useState('5')
  const [dateMec, setDateMec] = useState('')
  const [usage, setUsage] = useState('PROMENADES ET AFFAIRES')
  const [genre, setGenre] = useState('VT')
  const [zoneCirculation, setZoneCirculation] = useState('ZONE_C')

  // Conducteur
  const [conducteurNom, setConducteurNom] = useState('')
  const [conducteurDob, setConducteurDob] = useState('')
  const [conducteurDobError, setConducteurDobError] = useState('')
  const [conducteurSexe, setConducteurSexe] = useState<'MASCULIN' | 'FEMININ'>('MASCULIN')
  const [permisCat, setPermisCat] = useState('B')
  const [permisNum, setPermisNum] = useState('')
  const [permisDate, setPermisDate] = useState('')

  // Garanties & contrat
  const [guarantees, setGuarantees] = useState<Record<string, boolean>>({ RC: true, DR: true })
  const [dateEffet, setDateEffet] = useState(() => new Date().toISOString().slice(0, 10))

  // Fichiers
  const [cniRecto, setCniRecto] = useState<File | null>(null)
  const [permisFile, setPermisFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!email.trim()) {
        setEmailError('')
        return
      }
      const parsed = optionalEmailSchema.safeParse(email)
      setEmailError(parsed.success ? '' : 'Adresse email invalide')
    }, 300)
    return () => clearTimeout(t)
  }, [email])

  useEffect(() => {
    if (!dateNaissance) {
      setDobError('')
      return
    }
    setDobError(isAtLeast18(dateNaissance) ? '' : 'L\'assuré doit avoir au moins 18 ans')
  }, [dateNaissance])

  useEffect(() => {
    if (!conducteurDob) {
      setConducteurDobError('')
      return
    }
    setConducteurDobError(
      isAtLeast18(conducteurDob) ? '' : 'Le conducteur doit avoir au moins 18 ans'
    )
  }, [conducteurDob])

  const toggleGuarantee = (key: string) => {
    setGuarantees((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      let cniPhotoUrl: string | undefined
      let permisPhotoUrl: string | undefined

      if (cniRecto) {
        const { url } = await clientsApi.uploadDoc(cniRecto)
        cniPhotoUrl = url
      }
      if (permisFile) {
        const { url } = await clientsApi.uploadDoc(permisFile)
        permisPhotoUrl = url
      }

      const client = await clientsApi.create({
        full_name: fullName,
        country_code: countryCode.toUpperCase(),
        phone,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        profession: profession || undefined,
        cni_number: cniNumber || undefined,
        date_naissance: dateNaissance || undefined,
        sexe,
        cni_photo_url: cniPhotoUrl,
        permis_photo_url: permisPhotoUrl,
        vehicle: {
          marque,
          modele: modele || undefined,
          chassis_num: chassisNum.replace(/\s/g, '').toUpperCase(),
          immatriculation: immatriculation.replace(/\s/g, '').toUpperCase() || undefined,
          energie: energie || undefined,
          puissance_cv: puissanceCv ? parseInt(puissanceCv, 10) : undefined,
          nb_places: nbPlaces ? parseInt(nbPlaces, 10) : undefined,
          date_mise_circulation: dateMec || undefined,
          usage: usage || undefined,
          genre: genre || undefined,
          zone_circulation: zoneCirculation || undefined,
        },
      })

      const vehicles = await clientsApi.listVehicles(client.id)
      const vehicleId = vehicles[0]?.id
      if (!vehicleId) throw new Error('Le véhicule créé n’a pas pu être réutilisé pour le contrat')

      const guaranteePayload = Object.fromEntries(
        Object.entries(guarantees).filter(([, on]) => on).map(([k]) => [k, true])
      )

      await contractsApi.create({
        client_id: client.id,
        product_type: 'CAT1',
        subscription_type: 'AFFAIRE_NOUVELLE',
        zone_circulation: zoneCirculation,
        date_effet: dateEffet,
        duree_jours: 365,
        conducteur_nom: conducteurNom || undefined,
        conducteur_date_naissance: conducteurDob || undefined,
        conducteur_permis_cat: permisCat || undefined,
        conducteur_permis_num: permisNum || undefined,
        conducteur_permis_date: permisDate || undefined,
        vehicles: [
          {
            vehicle_id: vehicleId,
            guarantees: guaranteePayload,
          },
        ],
      })

      return client
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Client, véhicule et devis créés avec succès')
      router.push(`/dashboard/clients/${data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création')
    },
    onSettled: () => setSubmitting(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !countryCode || !phone) {
      toast.error('Nom, Code Pays et Téléphone sont obligatoires')
      return
    }
    if (!marque || !chassisNum) {
      toast.error('Marque et châssis du véhicule sont obligatoires')
      return
    }
    if (!dateEffet) {
      toast.error('Date d\'effet du contrat requise')
      return
    }

    const parsedCountry = countryCode.toUpperCase() as CountryCode
    const phoneNumber = parsePhoneNumberFromString(phone, parsedCountry)
    if (!phoneNumber || !phoneNumber.isValid()) {
      toast.error('Le numéro de téléphone est invalide pour ce code pays')
      return
    }

    if (email.trim() && emailError) {
      toast.error('Corrigez l\'adresse email avant de continuer')
      return
    }
    if (dateNaissance && !isAtLeast18(dateNaissance)) {
      toast.error('L\'assuré doit avoir au moins 18 ans')
      return
    }
    if (conducteurDob && !isAtLeast18(conducteurDob)) {
      toast.error('Le conducteur doit avoir au moins 18 ans')
      return
    }

    setSubmitting(true)
    createMutation.mutate()
  }

  const FileSlot = ({
    label,
    file,
    onChange,
  }: {
    label: string
    file: File | null
    onChange: (f: File | null) => void
  }) => (
    <label className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-blue-300 cursor-pointer bg-gray-50/40">
      <span className={labelClass}>{label}</span>
      <span className="flex items-center gap-2 text-xs text-gray-600">
        {file ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {file.name}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Choisir une image
          </>
        )}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  )

  const busy = submitting || createMutation.isPending

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Nouveau Client"
        subtitle="Dossier complet : assuré, véhicule, conducteur, garanties et pièces."
      />

      <div className="p-8 space-y-6 max-w-4xl flex-1">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>

        <Card className="border-gray-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Assuré */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Informations Assuré
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className={labelClass}>Nom complet *</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Profession</label>
                    <Input value={profession} onChange={(e) => setProfession(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Sexe *</label>
                    <select value={sexe} onChange={(e) => setSexe(e.target.value as any)} className={selectClass}>
                      <option value="MASCULIN">Masculin</option>
                      <option value="FEMININ">Féminin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Date de naissance *</label>
                    <Input
                      type="date"
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      className={inputClass}
                      required
                    />
                    {dobError && <p className="text-[11px] text-red-600">{dobError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>N° CNI / Passeport</label>
                    <Input value={cniNumber} onChange={(e) => setCniNumber(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Téléphone *</label>
                    <div className="flex">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-28 h-11 rounded-l-xl border border-gray-200 border-r-0 bg-white px-2 text-xs"
                      >
                        <option value="CM">CM (+237)</option>
                        <option value="CI">CI (+225)</option>
                        <option value="SN">SN (+221)</option>
                        <option value="GA">GA (+241)</option>
                        <option value="CG">CG (+242)</option>
                        <option value="TD">TD (+235)</option>
                        <option value="FR">FR (+33)</option>
                      </select>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 h-11 text-xs border-gray-200 rounded-l-none rounded-r-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>E-mail</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                    {emailError && <p className="text-[11px] text-red-600">{emailError}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Ville</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Adresse</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </section>

              {/* Véhicule */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Véhicule
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Marque *</label>
                    <Input value={marque} onChange={(e) => setMarque(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Modèle</label>
                    <Input value={modele} onChange={(e) => setModele(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Immatriculation</label>
                    <Input
                      placeholder="CE 549 GG"
                      value={immatriculation}
                      onChange={(e) => setImmatriculation(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>N° Châssis *</label>
                    <Input
                      value={chassisNum}
                      onChange={(e) => setChassisNum(e.target.value)}
                      className={inputClass}
                      required
                      maxLength={17}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Énergie</label>
                    <select value={energie} onChange={(e) => setEnergie(e.target.value)} className={selectClass}>
                      <option value="ESSENCE">Essence</option>
                      <option value="DIESEL">Diesel</option>
                      <option value="HYBRIDE">Hybride</option>
                      <option value="ELECTRIQUE">Électrique</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Puissance (CV)</label>
                    <Input
                      type="number"
                      min={1}
                      value={puissanceCv}
                      onChange={(e) => setPuissanceCv(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Nombre de places</label>
                    <Input
                      type="number"
                      min={1}
                      value={nbPlaces}
                      onChange={(e) => setNbPlaces(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>1ère mise en circulation</label>
                    <Input type="date" value={dateMec} onChange={(e) => setDateMec(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Usage</label>
                    <Input value={usage} onChange={(e) => setUsage(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Genre</label>
                    <Input value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Zone de circulation</label>
                    <select
                      value={zoneCirculation}
                      onChange={(e) => setZoneCirculation(e.target.value)}
                      className={selectClass}
                    >
                      <option value="ZONE_A">Zone A</option>
                      <option value="ZONE_B">Zone B</option>
                      <option value="ZONE_C">Zone C</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Produit</label>
                    <select value="CAT1" disabled className={selectClass}>
                      <option value="CAT1">CAT1 — Mono</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Date d&apos;effet *</label>
                    <Input
                      type="date"
                      value={dateEffet}
                      onChange={(e) => setDateEffet(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Conducteur */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Conducteur
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Nom du conducteur</label>
                    <Input value={conducteurNom} onChange={(e) => setConducteurNom(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Sexe</label>
                    <select
                      value={conducteurSexe}
                      onChange={(e) => setConducteurSexe(e.target.value as any)}
                      className={selectClass}
                    >
                      <option value="MASCULIN">Masculin</option>
                      <option value="FEMININ">Féminin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Date de naissance</label>
                    <Input
                      type="date"
                      value={conducteurDob}
                      onChange={(e) => setConducteurDob(e.target.value)}
                      className={inputClass}
                    />
                    {conducteurDobError && (
                      <p className="text-[11px] text-red-600">{conducteurDobError}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Catégorie permis</label>
                    <Input value={permisCat} onChange={(e) => setPermisCat(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>N° permis</label>
                    <Input value={permisNum} onChange={(e) => setPermisNum(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Date permis</label>
                    <Input
                      type="date"
                      value={permisDate}
                      onChange={(e) => setPermisDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              {/* Garanties */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Garanties souscrites
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GUARANTEE_OPTIONS.map((g) => (
                    <label
                      key={g.key}
                      className="flex items-center gap-2 text-xs text-gray-700 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!guarantees[g.key]}
                        onChange={() => toggleGuarantee(g.key)}
                        className="rounded border-gray-300"
                      />
                      {g.label}
                    </label>
                  ))}
                </div>
              </section>

              {/* Fichiers */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                  Pièces justificatives
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileSlot label="CNI (une pièce par champ backend)" file={cniRecto} onChange={setCniRecto} />
                  <FileSlot label="Permis de conduire" file={permisFile} onChange={setPermisFile} />
                </div>
              </section>

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
                  disabled={busy || !!emailError || !!dobError || !!conducteurDobError}
                  className="text-white flex items-center gap-2 font-semibold"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Enregistrer le dossier
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

export default function NewClientPage() {
  return (
    <RoleGuard permission="agency:mutate">
      <NewClientContent />
    </RoleGuard>
  )
}
