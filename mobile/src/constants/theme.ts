// Design system aligné sur le prototype "AGROPOLIFE".
// Couleurs : palette terre/agriculture. Polices : Fraunces (titres), DM Sans (corps), DM Mono (labels).

export const COULEURS_TOKEN = {
  // Palette terre
  soil: '#2d1f0e',       // texte principal
  earth: '#5c3d1e',      // texte secondaire
  clay: '#8b5e3c',       // accents argile
  straw: '#c9a96e',      // paille
  wheat: '#e8d5a3',      // blé
  cream: '#faf6ee',      // fond
  // Palette végétale
  leaf: '#2d5a27',       // vert foncé
  mint: '#4a8c3f',       // vert moyen
  sprout: '#7bc67a',     // vert clair
  // Palette eau
  water: '#1a6b8a',      // bleu profond
  sky: '#3a9dc4',        // bleu ciel
  // Palette filières spécifiques (cohérence avec couleurs.ts existant)
  pisciculture: '#1a6b8a',
  aviculture: '#e8943a',
  porcins: '#d4548a',
  caprins: '#7b6e3e',
  cultures: '#4a8c3f',
  infrastructure: '#6b6b6b',
  // Statuts
  rouge: '#e74c3c',
  orange: '#f39c12',
  vert: '#27ae60',
  // Surfaces
  carte: '#ffffff',
  bordure: 'rgba(92,61,30,0.15)',
  ombre: 'rgba(45,31,14,0.1)',
} as const

export const RAYONS = {
  pastille: 20,
  petit: 6,
  moyen: 10,
  grand: 14,
  rond: 999,
} as const

export const ESPACEMENTS = {
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 32,
  xxxl: 48,
} as const

export const POLICES = {
  serif: 'Fraunces_700Bold',
  serifItalique: 'Fraunces_400Regular_Italic',
  serifSemi: 'Fraunces_600SemiBold',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const

export const TYPO = {
  // Titres serif
  titreXL: { fontFamily: POLICES.serif, fontSize: 36, lineHeight: 42, color: COULEURS_TOKEN.soil },
  titreL: { fontFamily: POLICES.serif, fontSize: 28, lineHeight: 34, color: COULEURS_TOKEN.soil },
  titreM: { fontFamily: POLICES.serifSemi, fontSize: 20, lineHeight: 26, color: COULEURS_TOKEN.soil },
  titreS: { fontFamily: POLICES.serifSemi, fontSize: 16, lineHeight: 22, color: COULEURS_TOKEN.earth },
  // Texte sans
  corps: { fontFamily: POLICES.sans, fontSize: 15, lineHeight: 22, color: COULEURS_TOKEN.soil },
  corpsM: { fontFamily: POLICES.sansMedium, fontSize: 15, lineHeight: 22, color: COULEURS_TOKEN.soil },
  corpsB: { fontFamily: POLICES.sansBold, fontSize: 15, lineHeight: 22, color: COULEURS_TOKEN.soil },
  legende: { fontFamily: POLICES.sans, fontSize: 13, lineHeight: 18, color: COULEURS_TOKEN.earth },
  // Mono (pastilles, labels)
  mono: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: COULEURS_TOKEN.earth,
    textTransform: 'uppercase' as const,
  },
  monoNum: {
    fontFamily: POLICES.mono,
    fontSize: 13,
    color: COULEURS_TOKEN.soil,
  },
} as const
