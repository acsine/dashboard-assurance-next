export const ENERGY_OPTIONS = [
  { value: 'ESSENCE', label: 'Essence' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'ELECTRIQUE', label: 'Électrique' },
]

export const USAGE_OPTIONS = [
  { value: 'PROMENADE', label: 'Promenade' },
  { value: 'AFFAIRES', label: 'Affaires' },
  { value: 'TAXI', label: 'Taxi' },
  { value: 'COMMERCIAL', label: 'Transport commercial' },
]

export const GENRE_OPTIONS = [
  { value: 'VOITURE', label: 'Voiture' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'CAMION', label: 'Camion' },
  { value: 'UTILITAIRE', label: 'Utilitaire' },
]

export const GUARANTEE_OPTIONS = [
  { value: 'RC', label: 'Responsabilité civile' },
  { value: 'DR', label: 'Défense et recours' },
  { value: 'VOL_INCENDIE', label: 'Vol et incendie' },
  { value: 'TC', label: 'Tierce collision' },
  { value: 'BRIS_GLACE', label: 'Bris de glace' },
  { value: 'DOM', label: 'Dommages' },
  { value: 'INDIV_ACC', label: 'Individuelle accidents' },
  { value: 'AUTRES', label: 'Autres garanties' },
]

export function withSelectFallback<T extends { value: string; label: string }>(
  remote: T[] | undefined,
  fallback: readonly T[],
): T[] {
  return remote?.length ? remote : [...fallback]
}

export const CAMEROON_CITY_OPTIONS = [
  'Abong-Mbang', 'Akonolinga', 'Ambam', 'Bafang', 'Bafia', 'Bafoussam',
  'Bali', 'Bamenda', 'Bandjoun', 'Bangangté', 'Bangem', 'Banyo', 'Batibo',
  'Batouri', 'Bélabo', 'Bertoua', 'Bétaré-Oya', 'Bogo', 'Bokito', 'Bonabéri',
  'Buea', 'Campo', 'Dibombari', 'Dizangué', 'Douala', 'Dschang', 'Édéa',
  'Éséka', 'Ebolowa', 'Ekondo-Titi', 'Foumban', 'Foumbot', 'Fundong',
  'Garoua', 'Garoua-Boulaï', 'Guider', 'Jakiri', 'Kaa-Kam', 'Kaélé', 'Kékem',
  'Kousséri', 'Kribi', 'Kumba', 'Kumbo', 'Limbe', 'Lolodorf', 'Loum', 'Maga',
  'Makak', 'Mamfé', 'Manjo', 'Maroua', 'Mbalmayo', 'Mbandjock', 'Mbanga',
  'Mbankomo', 'Mbouda', 'Meiganga', 'Melong', 'Meyomessala', 'Mindif',
  'Mokolo', 'Mora', 'Mundemba', 'Mutengene', 'Mvangan', 'Nanga-Eboko',
  'Ndelele', 'Ndikiniméki', 'Ngaoundal', 'Ngaoundéré', 'Ngambè', 'Nkambé',
  'Nkongsamba', 'Nkoteng', 'Obala', 'Okola', 'Penja', 'Poli', 'Pouma',
  'Saa', 'Sangmélima', 'Soa', 'Tibati', 'Tiko', 'Tonga', 'Wum', 'Yabassi',
  'Yagoua', 'Yaoundé', 'Yokadouma',
].map((city) => ({ value: city, label: city }))
