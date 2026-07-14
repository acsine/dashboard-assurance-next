# 🚀 Sygalin - Base Next.js d'Entreprise

Application d'entreprise moderne construite avec Next.js 15, offrant une base solide et scalable pour les projets professionnels.

## ✨ Fonctionnalités

### 🎯 Stack Technique
- **Next.js 15.5.2** avec Turbopack pour des performances optimales
- **TypeScript** pour la sécurité des types
- **Tailwind CSS 4** pour un design moderne et responsive
- **Police Poppins** hébergée localement pour de meilleures performances

### 📦 Packages Intégrés
- **Zustand** - Gestion d'état simple et performante
- **TanStack Query** - Gestion des données avec cache intelligent
- **Next-intl** - Internationalisation complète avec routing et formatage
- **Nuqs** - Query parameters type-safe
- **Zod** - Validation de schémas robuste
- **React Hook Form** - Formulaires performants
- **Sonner** - Notifications toast élégantes
- **Framer Motion** - Animations fluides
- **Lucide React** - Icônes modernes

### 🎨 Interface Utilisateur
- Design moderne avec composants UI réutilisables
- Skeleton loading au lieu de spinners
- Animations subtiles et feedback utilisateur
- Interface responsive et accessible
- Thème cohérent avec gradients subtils

## 🚀 Démarrage Rapide

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Build de Production
```bash
npm run build
npm start
```

## 📁 Structure du Projet

```
├── app/
│   ├── [locale]/          # App Router avec routing i18n
│   │   ├── layout.tsx     # Layout avec NextIntlClientProvider
│   │   └── page.tsx       # Page d'accueil avec traductions
│   ├── globals.css        # Styles globaux et polices
│   └── layout.tsx         # Layout racine
├── components/
│   ├── ui/                # Composants UI réutilisables
│   │   ├── button.tsx     # Boutons avec variants
│   │   ├── card.tsx       # Cards modernes
│   │   ├── input.tsx      # Inputs stylisés
│   │   └── skeleton.tsx   # Loading skeletons
│   └── posts-demo.tsx     # Démo API complète
├── i18n/
│   ├── routing.ts         # Configuration routing next-intl
│   ├── request.ts         # Configuration serveur i18n
│   └── navigation.ts      # Helpers navigation localisée
├── lib/
│   ├── api/               # Services API
│   │   ├── client.ts      # Client HTTP avec gestion d'erreurs
│   │   └── jsonplaceholder.ts # API JSONPlaceholder
│   ├── hooks/             # Hooks personnalisés
│   │   ├── use-api.ts     # Hooks API génériques
│   │   ├── use-posts.ts   # Hooks pour les articles
│   │   └── use-users.ts   # Hooks pour les utilisateurs
│   ├── schemas/           # Schémas Zod
│   │   └── common.ts      # Schémas réutilisables
│   ├── stores/            # Stores Zustand
│   │   └── example-store.ts # Store d'exemple
│   ├── providers.tsx      # Providers React Query, Nuqs, Sonner
│   └── utils.ts           # Utilitaires (cn, formatError, etc.)
├── messages/              # Fichiers de traductions
│   ├── en.json            # Traductions anglaises
│   └── fr.json            # Traductions françaises
├── middleware.ts          # Middleware i18n routing
├── i18n.ts                # Configuration locales supportées
└── public/fonts/          # Polices Poppins locales
```

## 🎮 Démonstrations

L'application inclut deux onglets de démonstration :

### 📦 Démo Packages
- **Zustand** : Compteur avec actions (increment, decrement, reset)
- **Skeleton Loading** : Démonstration des états de chargement
- **Nuqs** : Synchronisation avec les query parameters

### 🌐 Démo API
- **CRUD complet** avec l'API JSONPlaceholder
- **Gestion des erreurs** robuste
- **Cache intelligent** avec TanStack Query
- **Interface moderne** avec animations
- **Formulaires validés** avec React Hook Form

## 🛠️ Développement

### Ajout de Nouveaux Composants
```bash
# Créer un nouveau composant UI
touch components/ui/nouveau-composant.tsx
```

### Création d'un Store Zustand
```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MonStore {
  // État et actions
}

export const useMonStore = create<MonStore>()(
  devtools((set) => ({
    // Implémentation
  }))
)
```

### Hooks API Personnalisés
```typescript
import { useApiQuery, useApiMutation } from '@/lib/hooks/use-api'

export function useMonAPI() {
  return useApiQuery(['mon-endpoint'], '/api/endpoint')
}
```

## 🎯 Bonnes Pratiques

- **Gestion d'erreurs** : Toujours catcher les erreurs pour éviter les crashes
- **Loading states** : Utiliser les skeletons plutôt que les spinners
- **Type safety** : Valider les données avec Zod
- **Performance** : Optimiser avec TanStack Query cache
- **UX** : Feedback utilisateur avec notifications Sonner
- **Internationalisation** : Utiliser `useTranslations()` pour toutes les chaînes affichées
- **Routing multilingue** : Préfixer les URLs avec les codes de langues `/fr/` ou `/en/`
- **Formatage culturel** : Utiliser `useFormatter()` pour les dates, nombres et devises

## 🌍 Support Multilingue

### Configuration next-intl

L'application utilise **next-intl** pour une internationalisation complète avec :
- Routing automatique par locale (`/fr/`, `/en/`)
- Chargement dynamique des traductions
- Support de formatage culturel intégré
- Locale par défaut : Français (`fr`)

### Utilisation des Traductions

```typescript
// Dans un composant client
import { useTranslations } from 'next-intl'

function MonComposant() {
  const t = useTranslations('pages.home')
  
  return (
    <h1>{t('title')}</h1>
    <p>{t('description')}</p>
  )
}
```

```typescript
// Dans un composant serveur
import { getTranslations } from 'next-intl/server'

async function PageServeur() {
  const t = await getTranslations('pages.home')
  
  return <h1>{t('title')}</h1>
}
```

### Formatage Culturel

```typescript
import { useFormatter, useLocale } from 'next-intl'

function ComposantFormatage() {
  const format = useFormatter()
  const locale = useLocale()
  
  // Formatage des nombres
  const price = format.number(1299.99, {
    style: 'currency',
    currency: 'EUR'
  }) // "1 299,99 €" en fr, "$1,299.99" en en
  
  // Formatage des dates
  const date = format.dateTime(new Date(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) // "15 septembre 2025" en fr, "September 15, 2025" en en
  
  // Formatage des nombres relatifs
  const relativeTime = format.relativeTime(-1, 'day') // "il y a 1 jour" en fr
  
  return (
    <div>
      <p>Prix: {price}</p>
      <p>Date: {date}</p>
      <p>Modifié: {relativeTime}</p>
    </div>
  )
}
```

### Navigation Localisée

```typescript
import { Link, useRouter, usePathname } from '@/i18n/navigation'

function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  
  return (
    <nav>
      {/* Liens automatiquement localisés */}
      <Link href="/about">À propos</Link>
      <Link href="/contact">Contact</Link>
      
      {/* Navigation programmatique */}
      <button onClick={() => router.push('/products')}>
        Voir les produits
      </button>
    </nav>
  )
}
```

### Changement de Langue

```typescript
import { useRouter, usePathname } from '@/i18n/navigation'
import { useLocale } from 'next-intl'

function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  
  const changeLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }
  
  return (
    <select 
      value={currentLocale}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  )
}
```

### Ajout d'une Nouvelle Langue

1. **Ajouter la locale dans `i18n.ts`** :
```typescript
const locales = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" }, // Nouvelle langue
]
```

2. **Créer le fichier de traductions** :
```bash
# Créer messages/es.json avec les traductions espagnoles
```

3. **Les URLs seront automatiquement disponibles** :
- `/es/` - Version espagnole
- `/es/contact` - Page contact en espagnol

## 📝 Scripts Disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linting ESLint
```


## 📄 Licence

SYGALIN SAS - Tous droits réservés.
#   d a s h b o a r d - a s s u r a n c e - n e x t  
 