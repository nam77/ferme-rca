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
  await prisma.tache.deleteMany({})

  const idAdmin = idsParEmail['admin@ferme.rca']!
  const maintenant = new Date()

  for (const t of taches) {
    const dateLimite = t.joursAvantEcheance === null
      ? null
      : new Date(maintenant.getTime() + t.joursAvantEcheance * 24 * 60 * 60 * 1000)
    const responsableId = t.emailResponsable ? idsParEmail[t.emailResponsable] ?? null : null
    await prisma.tache.create({
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
    console.log(`  • ${t.filiere.padEnd(15)} [${t.statut.padEnd(9)}] ${t.titre}`)
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

  console.log(
    `✅ Seed terminé : ${utilisateurs.length} utilisateurs, ${taches.length} tâches, ${zones.length} zones, ${lignesBudget.length} lignes budget, ${lots.length} lots animaux, ${totalMouvements} mouvements.`,
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
