import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import {
  Role,
  Filiere,
  Statut,
  Priorite,
  Phase,
  Espece,
  SexeAnimal,
  CategorieAge,
  TypeMouvementAnimal,
  TypeCulture,
  StatutParcelle,
  TypeEvenementCulture,
} from '../src/generated/prisma/enums.js'

type GraineUtilisateur = {
  email: string
  motDePasse: string
  prenom: string
  nom: string
  role: Role
  filiere: Filiere | null
}

const utilisateurs: GraineUtilisateur[] = [
  {
    email: 'admin@ferme.rca',
    motDePasse: 'admin123',
    prenom: 'Awa',
    nom: 'Ngakola',
    role: Role.admin,
    filiere: null,
  },
  {
    email: 'pisciculture@ferme.rca',
    motDePasse: 'responsable123',
    prenom: 'Jean',
    nom: 'Bangui',
    role: Role.responsable,
    filiere: Filiere.pisciculture,
  },
  {
    email: 'ouvrier@ferme.rca',
    motDePasse: 'ouvrier123',
    prenom: 'Pierre',
    nom: 'Kouango',
    role: Role.ouvrier,
    filiere: Filiere.aviculture,
  },
  {
    email: 'investisseur@ferme.rca',
    motDePasse: 'investisseur123',
    prenom: 'Marie',
    nom: 'Bozizé',
    role: Role.investisseur,
    filiere: null,
  },
]

type GraineTache = {
  titre: string
  description: string
  filiere: Filiere
  priorite: Priorite
  statut: Statut
  joursAvantEcheance: number | null
  emailResponsable: string | null
  sousTaches?: { titre: string; faite?: boolean }[]
}

const taches: GraineTache[] = [
  // Pisciculture
  {
    titre: 'Mise en eau du bassin 1',
    description: 'Remplir le bassin 1 et démarrer la fertilisation au phytoplancton avec les fientes pré-compostées.',
    filiere: Filiere.pisciculture,
    priorite: Priorite.haute,
    statut: Statut.en_cours,
    joursAvantEcheance: 5,
    emailResponsable: 'pisciculture@ferme.rca',
    sousTaches: [
      { titre: 'Vérifier étanchéité géomembrane', faite: true },
      { titre: 'Ouvrir vanne d\'admission', faite: true },
      { titre: 'Mesurer pH et température', faite: false },
      { titre: 'Apporter 60 kg de fientes pré-compostées', faite: false },
      { titre: 'Vérifier oxygénation jour 5', faite: false },
    ],
  },
  {
    titre: 'Empoissonnement bassin 2 — 2 000 alevins Tilapia',
    description: 'Commander 2 000 alevins de Tilapia du Nil chez le fournisseur de Bangui. Livraison à programmer juste après la mise en eau.',
    filiere: Filiere.pisciculture,
    priorite: Priorite.haute,
    statut: Statut.a_faire,
    joursAvantEcheance: 12,
    emailResponsable: 'pisciculture@ferme.rca',
  },
  // Aviculture
  {
    titre: 'Vaccination Newcastle J7',
    description: 'Première vaccination des poussins contre la maladie de Newcastle. Préparer les doses la veille au frais.',
    filiere: Filiere.aviculture,
    priorite: Priorite.moyenne,
    statut: Statut.termine,
    joursAvantEcheance: -3,
    emailResponsable: 'ouvrier@ferme.rca',
    sousTaches: [
      { titre: 'Sortir doses du frigo 1h avant', faite: true },
      { titre: 'Préparer pulvérisateur', faite: true },
      { titre: 'Vacciner les 200 poussins', faite: true },
      { titre: 'Noter dans registre sanitaire', faite: true },
    ],
  },
  {
    titre: 'Commande aliments démarrage poussins',
    description: 'Commander 200 kg d\'aliment démarrage 1er âge + complément minéral. Comparer 2 fournisseurs.',
    filiere: Filiere.aviculture,
    priorite: Priorite.moyenne,
    statut: Statut.en_cours,
    joursAvantEcheance: 4,
    emailResponsable: 'ouvrier@ferme.rca',
  },
  // Porcins
  {
    titre: 'Construction porcherie — dalle béton',
    description: 'Couler la dalle de la porcherie avec pente de drainage 2%. Prévoir 4 m³ de béton.',
    filiere: Filiere.porcins,
    priorite: Priorite.haute,
    statut: Statut.en_cours,
    joursAvantEcheance: 7,
    emailResponsable: null,
    sousTaches: [
      { titre: 'Coffrage et ferraillage', faite: true },
      { titre: 'Préparer pente 2% drainage', faite: true },
      { titre: 'Couler 4 m³ de béton', faite: false },
      { titre: 'Lisser et talocher', faite: false },
      { titre: 'Couvrir et arroser pendant cure 7 jours', faite: false },
    ],
  },
  {
    titre: 'Achat de 12 porcs reproducteurs',
    description: '2 mâles + 10 femelles Large White × race locale. Vérifier vaccination et déparasitage à la livraison.',
    filiere: Filiere.porcins,
    priorite: Priorite.haute,
    statut: Statut.a_faire,
    joursAvantEcheance: 21,
    emailResponsable: null,
  },
  // Caprins / Ovins
  {
    titre: 'Clôture parc de nuit anti-prédateurs',
    description: 'Installer un grillage de 2 m de haut autour du parc de nuit. Indispensable contre hyènes et chacals.',
    filiere: Filiere.caprins,
    priorite: Priorite.haute,
    statut: Statut.termine,
    joursAvantEcheance: -10,
    emailResponsable: null,
  },
  {
    titre: 'Déparasitage Ivermectine du troupeau',
    description: 'Déparasitage trimestriel obligatoire (chèvres + moutons). Sans cela, mortalité forte en saison des pluies.',
    filiere: Filiere.caprins,
    priorite: Priorite.moyenne,
    statut: Statut.a_faire,
    joursAvantEcheance: 14,
    emailResponsable: null,
  },
  // Cultures
  {
    titre: 'Plantation maïs + arachide (2 ha)',
    description: 'Préparation du sol, traçage des lignes, semis associés maïs + arachide. Profiter des 1ères pluies.',
    filiere: Filiere.cultures,
    priorite: Priorite.haute,
    statut: Statut.en_cours,
    joursAvantEcheance: 6,
    emailResponsable: null,
  },
  {
    titre: 'Préparation parcelle légumes (1 ha)',
    description: 'Labour + amendement compost. Plantation tomates/gombo/poivron en août-septembre.',
    filiere: Filiere.cultures,
    priorite: Priorite.basse,
    statut: Statut.a_faire,
    joursAvantEcheance: 60,
    emailResponsable: null,
  },
  // Infrastructure
  {
    titre: 'Installation panneaux solaires bureau',
    description: 'Installer 6 panneaux 400 W + onduleur + batteries pour alimenter bureau et pompes.',
    filiere: Filiere.infrastructure,
    priorite: Priorite.haute,
    statut: Statut.a_faire,
    joursAvantEcheance: 30,
    emailResponsable: null,
  },
  {
    titre: 'Forage puits eau potable',
    description: 'Forage à 35 m réalisé. Eau de bonne qualité. Pompe et château d\'eau à venir.',
    filiere: Filiere.infrastructure,
    priorite: Priorite.haute,
    statut: Statut.termine,
    joursAvantEcheance: -15,
    emailResponsable: null,
  },
]

type GraineZone = {
  nom: string
  filiere: Filiere
  surface: number // en m²
  description: string
  positionX: number // % sur le plan
  positionY: number
}

const zones: GraineZone[] = [
  {
    nom: 'Bassins 1 & 2 (opérationnels)',
    filiere: Filiere.pisciculture,
    surface: 1100,
    description:
      'Deux bassins de 500 à 600 m² chacun, profondeur 1,2 à 1,5 m, mis en eau à partir d\'avril. Empoissonnement Tilapia + Clarias prévu en mai/juin. Talus en terre compactée + géomembrane.',
    positionX: 65,
    positionY: 25,
  },
  {
    nom: 'Bassins 3 à 5 (futurs)',
    filiere: Filiere.pisciculture,
    surface: 1700,
    description:
      'Trois bassins supplémentaires en attente. Terrassement à programmer dès que les 2 premiers seront en production. Capacité totale visée : ~12 000 alevins.',
    positionX: 85,
    positionY: 25,
  },
  {
    nom: 'Poulailler',
    filiere: Filiere.aviculture,
    surface: 2000,
    description:
      'Bâtiment orienté est-ouest, ventilation naturelle traversante. 2 000 poulets au démarrage (1 m²/poulet). Litière copeaux renouvelée chaque semaine. Production de fientes : ~100 kg/jour, à composter 15 j avant fertilisation des bassins.',
    positionX: 15,
    positionY: 14,
  },
  {
    nom: 'Porcherie',
    filiere: Filiere.porcins,
    surface: 150,
    description:
      'Sol bétonné incliné 2 % pour drainage. 2 mâles + 10 femelles Large White × race locale. Abreuvoir automatique. Ombre obligatoire (porcs sensibles à la chaleur > 32 °C).',
    positionX: 40,
    positionY: 18,
  },
  {
    nom: 'Parc caprins & ovins',
    filiere: Filiere.caprins,
    surface: 800,
    description:
      'Chèvres naines d\'Afrique de l\'Ouest (2M + 10F) et moutons Djallonké (1M + 2F). Pâturage rotatif sur Brachiaria. Parc de nuit clos (anti-hyènes/chacals). Déparasitage Ivermectine trimestriel.',
    positionX: 25,
    positionY: 42,
  },
  {
    nom: 'Champs maïs + arachide',
    filiere: Filiere.cultures,
    surface: 20000,
    description:
      '2 ha en culture associée maïs + arachide. Plantation mars-avril avec les 1res pluies. Récolte juillet-août. Destination : alimentation animaux + vente excédent.',
    positionX: 25,
    positionY: 65,
  },
  {
    nom: 'Champs manioc',
    filiere: Filiere.cultures,
    surface: 20000,
    description:
      '2 ha de manioc. Plantation avril-mai, récolte étalée toute l\'année. Tubercules pour consommation humaine, son pour les porcs.',
    positionX: 55,
    positionY: 65,
  },
  {
    nom: 'Parcelle légumes',
    filiere: Filiere.cultures,
    surface: 10000,
    description:
      '1 ha de tomate, gombo, poivron, melon. Plantation août-septembre, récolte nov-déc. Vente directe au marché local — revenus rapides.',
    positionX: 75,
    positionY: 78,
  },
]

type GraineBudget = {
  phase: Phase
  categorie: string
  description: string
  montantPrevu: number
  montantReel: number
}

const lignesBudget: GraineBudget[] = [
  // Phase 1 — Infrastructure
  {
    phase: Phase.phase_1_infrastructure,
    categorie: 'Construction bâtiments',
    description: 'Porcherie, poulailler, local bureau et stockage.',
    montantPrevu: 7_300_000,
    montantReel: 6_950_000,
  },
  {
    phase: Phase.phase_1_infrastructure,
    categorie: 'Bassins piscicoles',
    description: 'Terrassement + étanchéité géomembrane des 5 bassins.',
    montantPrevu: 4_500_000,
    montantReel: 4_800_000,
  },
  {
    phase: Phase.phase_1_infrastructure,
    categorie: 'Équipements',
    description: 'Matériel agricole de base, outillage, brouettes.',
    montantPrevu: 1_500_000,
    montantReel: 1_320_000,
  },
  {
    phase: Phase.phase_1_infrastructure,
    categorie: 'Intrants démarrage',
    description: 'Semences maïs, manioc, fourragères, engrais initial.',
    montantPrevu: 800_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_1_infrastructure,
    categorie: "Main-d'œuvre construction",
    description: 'Maçons, manœuvres, terrassiers (3 mois).',
    montantPrevu: 2_400_000,
    montantReel: 2_400_000,
  },
  // Phase 2 — Lancement
  {
    phase: Phase.phase_2_lancement,
    categorie: 'Finitions bâtiments',
    description: 'Clôtures parc nuit, peintures, électricité solaire.',
    montantPrevu: 1_200_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_2_lancement,
    categorie: 'Équipements pompes & filtration',
    description: 'Pompes bassins, conduites, filtres mécaniques.',
    montantPrevu: 1_800_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_2_lancement,
    categorie: 'Cheptel initial',
    description: '2 000 alevins Tilapia + 200 poussins + 12 porcs + caprins/ovins.',
    montantPrevu: 3_500_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_2_lancement,
    categorie: "Aliments démarrage 3 mois",
    description: 'Aliment poussins + porcs + complément vitaminé.',
    montantPrevu: 1_400_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_2_lancement,
    categorie: 'Vaccins & vétérinaire',
    description: 'Newcastle, Gumboro, déparasitage Ivermectine.',
    montantPrevu: 350_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_2_lancement,
    categorie: 'Recrutement équipe',
    description: '1 chef de ferme + 4 ouvriers permanents (3 mois).',
    montantPrevu: 2_700_000,
    montantReel: 0,
  },
  // Phase 3 — Exploitation
  {
    phase: Phase.phase_3_exploitation,
    categorie: 'Salaires mensuels',
    description: 'Masse salariale équipe permanente (mensuel).',
    montantPrevu: 900_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_3_exploitation,
    categorie: 'Aliments récurrents',
    description: 'Compléments mensuels (réduction prévue an 2 avec auto-production).',
    montantPrevu: 600_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_3_exploitation,
    categorie: 'Maintenance équipements',
    description: 'Pompes, outillage, réparations diverses.',
    montantPrevu: 250_000,
    montantReel: 0,
  },
  {
    phase: Phase.phase_3_exploitation,
    categorie: 'Renouvellement cheptel',
    description: 'Achat reproducteurs et alevins de remplacement annuel.',
    montantPrevu: 800_000,
    montantReel: 0,
  },
]

type GraineMouvement = {
  type: TypeMouvementAnimal
  quantite: number
  joursDansLePasse: number
  coutTotal?: number
  motif?: string
  notes?: string
}

type GraineLot = {
  nom: string
  espece: Espece
  sexe: SexeAnimal | null
  categorieAge: CategorieAge
  zoneFiliere: Filiere | null // pour retrouver la zone via la filière
  zoneNomContient?: string    // sous-chaîne du nom de la zone si plusieurs zones par filière
  notes?: string
  mouvements: GraineMouvement[]
}

const lots: GraineLot[] = [
  // Caprins déjà installés (mentionnés dans la zone "Parc caprins & ovins")
  {
    nom: 'Chèvres reproductrices',
    espece: Espece.caprin,
    sexe: SexeAnimal.femelle,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.caprins,
    notes: 'Chèvre naine d\'Afrique de l\'Ouest. Achat initial complété, premières mises bas attendues.',
    mouvements: [
      { type: TypeMouvementAnimal.achat, quantite: 10, joursDansLePasse: 60, coutTotal: 350_000, motif: 'Achat initial femelles' },
      { type: TypeMouvementAnimal.naissance, quantite: 3, joursDansLePasse: 8, motif: 'Mise bas chèvre #4 (triplés)' },
      { type: TypeMouvementAnimal.mortalite, quantite: 1, joursDansLePasse: 4, motif: 'Décès d\'un chevreau (faiblesse à la naissance)' },
    ],
  },
  {
    nom: 'Boucs reproducteurs',
    espece: Espece.caprin,
    sexe: SexeAnimal.male,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.caprins,
    mouvements: [
      { type: TypeMouvementAnimal.achat, quantite: 2, joursDansLePasse: 60, coutTotal: 90_000, motif: 'Achat initial mâles' },
    ],
  },
  // Ovins
  {
    nom: 'Brebis Djallonké',
    espece: Espece.ovin,
    sexe: SexeAnimal.femelle,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.caprins, // même zone que caprins
    mouvements: [
      { type: TypeMouvementAnimal.achat, quantite: 2, joursDansLePasse: 60, coutTotal: 90_000, motif: 'Achat initial brebis' },
    ],
  },
  {
    nom: 'Bélier Djallonké',
    espece: Espece.ovin,
    sexe: SexeAnimal.male,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.caprins,
    mouvements: [
      { type: TypeMouvementAnimal.achat, quantite: 1, joursDansLePasse: 60, coutTotal: 50_000, motif: 'Achat initial bélier' },
    ],
  },
  // Porcins (achat à venir mais on prépare le lot)
  {
    nom: 'Truies Large White × locale',
    espece: Espece.porc,
    sexe: SexeAnimal.femelle,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.porcins,
    notes: 'Effectif à constituer après finalisation de la porcherie.',
    mouvements: [],
  },
  {
    nom: 'Verrats Large White × locale',
    espece: Espece.porc,
    sexe: SexeAnimal.male,
    categorieAge: CategorieAge.adulte,
    zoneFiliere: Filiere.porcins,
    mouvements: [],
  },
  // Aviculture - cycle de poulets de chair (à venir)
  {
    nom: 'Cycle 1 — poulets de chair Cobb 500',
    espece: Espece.poulet,
    sexe: SexeAnimal.mixte,
    categorieAge: CategorieAge.jeune,
    zoneFiliere: Filiere.aviculture,
    notes: 'Premier cycle de 2 000 poussins, cycle 6 semaines. Lot ouvert pour préparation.',
    mouvements: [],
  },
  // Pisciculture
  {
    nom: 'Bassin 1 — Tilapia',
    espece: Espece.tilapia,
    sexe: SexeAnimal.mixte,
    categorieAge: CategorieAge.jeune,
    zoneFiliere: Filiere.pisciculture,
    zoneNomContient: 'Bassins 1',
    notes: 'Mise en eau en cours. Empoissonnement 2 000 alevins prévu.',
    mouvements: [],
  },
  {
    nom: 'Bassin 2 — Tilapia',
    espece: Espece.tilapia,
    sexe: SexeAnimal.mixte,
    categorieAge: CategorieAge.jeune,
    zoneFiliere: Filiere.pisciculture,
    zoneNomContient: 'Bassins 1',
    mouvements: [],
  },
]

type GraineEvenement = {
  type: TypeEvenementCulture
  joursDansLePasse: number
  description?: string
  coutTotal?: number
  quantiteKg?: number
}

type GraineParcelle = {
  nom: string
  typeCulture: TypeCulture
  surfaceHa: number
  zoneNomContient?: string
  zoneFiliere: Filiere
  joursAvantSemis: number | null    // négatif = semé il y a X jours, null = pas encore prévu
  joursAvantRecolte: number | null
  rendementPrevuKg: number | null
  rendementReelKg: number | null
  statut: StatutParcelle
  notes?: string
  evenements: GraineEvenement[]
}

const parcelles: GraineParcelle[] = [
  {
    nom: 'Maïs + arachide — Champ Nord',
    typeCulture: TypeCulture.mais,
    surfaceHa: 2,
    zoneFiliere: Filiere.cultures,
    zoneNomContient: 'maïs',
    joursAvantSemis: -25,    // semis il y a 25 jours
    joursAvantRecolte: 90,   // récolte dans 3 mois
    rendementPrevuKg: 4000,
    rendementReelKg: null,
    statut: StatutParcelle.croissance,
    notes: 'Culture associée maïs + arachide. Profite des premières pluies. Destination principale : alimentation animaux + vente excédent.',
    evenements: [
      { type: TypeEvenementCulture.preparation_sol, joursDansLePasse: 35, description: 'Labour et hersage à la traction animale.', coutTotal: 80_000 },
      { type: TypeEvenementCulture.semis, joursDansLePasse: 25, description: 'Semis maïs (60 kg/ha) + arachide (40 kg/ha).', coutTotal: 220_000 },
      { type: TypeEvenementCulture.fertilisation, joursDansLePasse: 10, description: 'Apport de compost (3 t/ha) issu du composteur des bassins.', coutTotal: 0 },
      { type: TypeEvenementCulture.desherbage, joursDansLePasse: 4, description: 'Premier sarclage manuel.', coutTotal: 35_000 },
    ],
  },
  {
    nom: 'Manioc — Champ Centre',
    typeCulture: TypeCulture.manioc,
    surfaceHa: 2,
    zoneFiliere: Filiere.cultures,
    zoneNomContient: 'manioc',
    joursAvantSemis: -20,
    joursAvantRecolte: 300,
    rendementPrevuKg: 18_000,
    rendementReelKg: null,
    statut: StatutParcelle.croissance,
    notes: 'Manioc à cycle long (~10 mois). Tubercules pour consommation humaine, son pour les porcs.',
    evenements: [
      { type: TypeEvenementCulture.preparation_sol, joursDansLePasse: 30, description: 'Buttage des planches.', coutTotal: 60_000 },
      { type: TypeEvenementCulture.semis, joursDansLePasse: 20, description: 'Plantation de boutures (10 000 boutures).', coutTotal: 100_000 },
    ],
  },
  {
    nom: 'Légumes — Tomate, gombo, poivron',
    typeCulture: TypeCulture.legumes,
    surfaceHa: 1,
    zoneFiliere: Filiere.cultures,
    zoneNomContient: 'légumes',
    joursAvantSemis: 90,    // semis prévu dans 3 mois (août-sept)
    joursAvantRecolte: 200,
    rendementPrevuKg: 8_000,
    rendementReelKg: null,
    statut: StatutParcelle.preparation,
    notes: 'Plantation août-septembre, récolte nov-déc. Vente directe au marché local — revenus rapides.',
    evenements: [],
  },
  {
    nom: 'Brachiaria — Pâturage rotatif',
    typeCulture: TypeCulture.brachiaria,
    surfaceHa: 2,
    zoneFiliere: Filiere.cultures,
    joursAvantSemis: -45,
    joursAvantRecolte: null,    // fourrage permanent
    rendementPrevuKg: null,
    rendementReelKg: null,
    statut: StatutParcelle.croissance,
    notes: 'Fourragère pérenne. Rotation 4 zones × 21 jours pour les caprins/ovins. Première coupe foin prévue saison sèche.',
    evenements: [
      { type: TypeEvenementCulture.preparation_sol, joursDansLePasse: 55, description: 'Préparation et amendement compost.', coutTotal: 40_000 },
      { type: TypeEvenementCulture.semis, joursDansLePasse: 45, description: 'Semis Brachiaria ruziziensis (5 kg/ha).', coutTotal: 80_000 },
    ],
  },
  {
    nom: 'Bananiers — Bordure',
    typeCulture: TypeCulture.bananier,
    surfaceHa: 0.5,
    zoneFiliere: Filiere.cultures,
    joursAvantSemis: -180,
    joursAvantRecolte: 60,
    rendementPrevuKg: 3_000,
    rendementReelKg: null,
    statut: StatutParcelle.croissance,
    notes: 'Variété Cavendish. Plantation en bordure des bassins (ombre + bénéficient de l\'humidité). Production étalée.',
    evenements: [
      { type: TypeEvenementCulture.semis, joursDansLePasse: 180, description: 'Plantation de 200 rejets.', coutTotal: 150_000 },
      { type: TypeEvenementCulture.fertilisation, joursDansLePasse: 90, description: 'Apport NPK + bouse.', coutTotal: 25_000 },
    ],
  },
  {
    nom: 'Jachère — Sud',
    typeCulture: TypeCulture.jachere,
    surfaceHa: 0.5,
    zoneFiliere: Filiere.cultures,
    joursAvantSemis: null,
    joursAvantRecolte: null,
    rendementPrevuKg: null,
    rendementReelKg: null,
    statut: StatutParcelle.jachere,
    notes: 'Au repos pour régénération. Rotation prévue pour saison 2027.',
    evenements: [],
  },
]

const main = async () => {
  console.log('🌱 Seed démarré...')

  const idsParEmail: Record<string, string> = {}
  for (const u of utilisateurs) {
    const motDePasseHash = await bcrypt.hash(u.motDePasse, 10)
    const enregistre = await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: {
        prenom: u.prenom,
        nom: u.nom,
        role: u.role,
        filiere: u.filiere,
        motDePasseHash,
        actif: true,
      },
      create: {
        email: u.email,
        prenom: u.prenom,
        nom: u.nom,
        role: u.role,
        filiere: u.filiere,
        motDePasseHash,
      },
    })
    idsParEmail[u.email] = enregistre.id
    console.log(`  ✓ ${u.email} (${u.role})`)
  }

  // Repart des tâches à zéro pour rester déterministe
  await prisma.mouvement.deleteMany({})
  await prisma.sousTache.deleteMany({})
  await prisma.tache.deleteMany({})

  const idAdmin = idsParEmail['admin@ferme.rca']!
  const maintenant = new Date()

  for (const t of taches) {
    const dateLimite = t.joursAvantEcheance === null
      ? null
      : new Date(maintenant.getTime() + t.joursAvantEcheance * 24 * 60 * 60 * 1000)
    const responsableId = t.emailResponsable ? idsParEmail[t.emailResponsable] ?? null : null
    const tacheCree = await prisma.tache.create({
      data: {
        titre: t.titre,
        description: t.description,
        filiere: t.filiere,
        priorite: t.priorite,
        statut: t.statut,
        dateLimite,
        responsableId,
        createurId: idAdmin,
        dateDebut: t.statut === Statut.en_cours ? maintenant : null,
        dateFinReelle: t.statut === Statut.termine ? maintenant : null,
      },
    })
    if (t.sousTaches && t.sousTaches.length > 0) {
      await prisma.sousTache.createMany({
        data: t.sousTaches.map((st, idx) => ({
          tacheId: tacheCree.id,
          titre: st.titre,
          faite: st.faite ?? false,
          ordre: idx,
        })),
      })
    }
    console.log(`  • ${t.filiere.padEnd(15)} [${t.statut.padEnd(9)}] ${t.titre}${t.sousTaches ? ` (${t.sousTaches.length} sous-tâches)` : ''}`)
  }

  // Reset zones (idempotent)
  await prisma.zone.deleteMany({})
  for (const z of zones) {
    await prisma.zone.create({
      data: {
        nom: z.nom,
        filiere: z.filiere,
        surface: z.surface,
        description: z.description,
        positionX: z.positionX,
        positionY: z.positionY,
      },
    })
    console.log(`  📍 ${z.filiere.padEnd(15)} ${z.nom}`)
  }

  // Reset budget pour rester déterministe
  await prisma.budgetLigne.deleteMany({})
  for (const l of lignesBudget) {
    await prisma.budgetLigne.create({
      data: {
        phase: l.phase,
        categorie: l.categorie,
        description: l.description,
        montantPrevu: l.montantPrevu,
        montantReel: l.montantReel,
      },
    })
    console.log(
      `  $ ${l.phase.padEnd(22)} ${l.categorie.padEnd(34)} ${l.montantPrevu.toLocaleString('fr-FR')} XAF`,
    )
  }

  // Reset lots et mouvements animaux
  await prisma.mouvementAnimal.deleteMany({})
  await prisma.lotAnimaux.deleteMany({})

  // Index zones par filière (premier match) pour rattachement automatique
  const zonesParFiliere = await prisma.zone.findMany({})
  const trouverZoneId = (filiere: Filiere | null, contient?: string): string | null => {
    if (!filiere) return null
    const candidates = zonesParFiliere.filter((z) => z.filiere === filiere)
    if (contient) {
      const trouve = candidates.find((z) => z.nom.includes(contient))
      if (trouve) return trouve.id
    }
    return candidates[0]?.id ?? null
  }

  let totalMouvements = 0
  for (const l of lots) {
    const zoneId = trouverZoneId(l.zoneFiliere, l.zoneNomContient)
    const lotEnregistre = await prisma.lotAnimaux.create({
      data: {
        nom: l.nom,
        espece: l.espece,
        sexe: l.sexe,
        categorieAge: l.categorieAge,
        notes: l.notes,
        zoneId,
      },
    })

    for (const m of l.mouvements) {
      const dateMouvement = new Date(maintenant.getTime() - m.joursDansLePasse * 24 * 60 * 60 * 1000)
      await prisma.mouvementAnimal.create({
        data: {
          lotId: lotEnregistre.id,
          type: m.type,
          quantite: m.quantite,
          dateMouvement,
          coutTotal: m.coutTotal,
          motif: m.motif,
          notes: m.notes,
          auteurId: idAdmin,
        },
      })
      totalMouvements += 1
    }
    console.log(`  🐾 ${l.espece.padEnd(8)} ${l.nom} (${l.mouvements.length} mvts)`)
  }

  // Reset parcelles et événements
  await prisma.evenementCulture.deleteMany({})
  await prisma.parcelle.deleteMany({})

  let totalEvenements = 0
  for (const p of parcelles) {
    const zoneId = trouverZoneId(p.zoneFiliere, p.zoneNomContient)
    const dateSemis = p.joursAvantSemis === null
      ? null
      : new Date(maintenant.getTime() + p.joursAvantSemis * 24 * 60 * 60 * 1000)
    const dateRecoltePrev = p.joursAvantRecolte === null
      ? null
      : new Date(maintenant.getTime() + p.joursAvantRecolte * 24 * 60 * 60 * 1000)

    const parcelleCree = await prisma.parcelle.create({
      data: {
        nom: p.nom,
        typeCulture: p.typeCulture,
        surfaceHa: p.surfaceHa,
        dateSemis,
        dateRecoltePrev,
        rendementPrevuKg: p.rendementPrevuKg,
        rendementReelKg: p.rendementReelKg,
        statut: p.statut,
        notes: p.notes,
        zoneId,
      },
    })

    for (const e of p.evenements) {
      const dateEvenement = new Date(maintenant.getTime() - e.joursDansLePasse * 24 * 60 * 60 * 1000)
      await prisma.evenementCulture.create({
        data: {
          parcelleId: parcelleCree.id,
          type: e.type,
          dateEvenement,
          description: e.description ?? null,
          coutTotal: e.coutTotal ?? null,
          quantiteKg: e.quantiteKg ?? null,
          auteurId: idAdmin,
        },
      })
      totalEvenements += 1
    }
    console.log(
      `  🌾 ${p.typeCulture.padEnd(11)} ${p.nom.padEnd(40)} ${p.surfaceHa} ha · ${p.statut} · ${p.evenements.length} événements`,
    )
  }

  console.log(
    `✅ Seed terminé : ${utilisateurs.length} utilisateurs, ${taches.length} tâches, ${zones.length} zones, ${lignesBudget.length} lignes budget, ${lots.length} lots animaux, ${totalMouvements} mouvements, ${parcelles.length} parcelles, ${totalEvenements} événements culture.`,
  )
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
