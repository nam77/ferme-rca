import { prisma } from './prisma.js'

// Service push hébergé d'Expo : encapsule FCM (Android) et APNs (iOS).
// Aucune clé Firebase à gérer côté serveur — on POST simplement les messages.
const URL_PUSH_EXPO = 'https://exp.host/--/api/v2/push/send'
const TAILLE_LOT = 100 // Expo accepte au plus 100 messages par requête.

type MessagePush = {
  to: string
  title: string
  body: string
  sound: 'default'
  priority: 'high'
  channelId: string
  data?: Record<string, unknown>
}

type TicketExpo = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

const enLots = <T>(items: T[], taille: number): T[][] => {
  const lots: T[][] = []
  for (let i = 0; i < items.length; i += taille) lots.push(items.slice(i, i + taille))
  return lots
}

/**
 * Envoie un lot de messages au service Expo et renvoie les tickets dans le
 * même ordre que les messages (Expo garantit cet ordre). En cas d'échec
 * réseau on renvoie des tickets vides (pas de purge hâtive de jetons).
 */
const envoyerLot = async (messages: MessagePush[]): Promise<TicketExpo[]> => {
  try {
    const reponse = await fetch(URL_PUSH_EXPO, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })
    const json = (await reponse.json().catch(() => null)) as { data?: TicketExpo[] } | null
    return Array.isArray(json?.data) ? json!.data : []
  } catch (erreur) {
    console.error('[push] échec envoi lot Expo:', erreur)
    return []
  }
}

/**
 * Envoie une notification push à une liste de jetons.
 * Purge automatiquement les jetons signalés « DeviceNotRegistered » par Expo
 * (appareil désinstallé, notifications coupées…).
 */
const envoyerPush = async (
  jetons: string[],
  titre: string,
  corps: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  // On ne garde que les jetons au format Expo attendu.
  const valides = jetons.filter(
    (j) => typeof j === 'string' && (j.startsWith('ExponentPushToken[') || j.startsWith('ExpoPushToken[')),
  )
  if (valides.length === 0) return

  const aPurger: string[] = []

  for (const lot of enLots(valides, TAILLE_LOT)) {
    const messages: MessagePush[] = lot.map((to) => ({
      to,
      title: titre,
      body: corps,
      sound: 'default',
      priority: 'high',
      channelId: 'messages',
      data: data ?? {},
    }))
    const tickets = await envoyerLot(messages)
    tickets.forEach((ticket, i) => {
      if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        aPurger.push(lot[i]!)
      }
    })
  }

  if (aPurger.length > 0) {
    await prisma.jetonPush
      .deleteMany({ where: { jeton: { in: aPurger } } })
      .catch((e: unknown) => console.error('[push] purge jetons invalides:', e))
  }
}

/**
 * Notifie tous les coéquipiers (sauf l'auteur) d'un nouveau message d'équipe.
 * Best-effort : à appeler en « fire-and-forget » sans bloquer la réponse HTTP.
 */
export const envoyerPushNouveauMessage = async (params: {
  auteurId: string
  auteurNom: string
  apercu: string
}): Promise<void> => {
  try {
    const jetons = await prisma.jetonPush.findMany({
      where: { utilisateurId: { not: params.auteurId } },
      select: { jeton: true },
    })
    if (jetons.length === 0) return
    await envoyerPush(
      jetons.map((j) => j.jeton),
      `💬 ${params.auteurNom}`,
      params.apercu,
      { type: 'message' },
    )
  } catch (erreur) {
    console.error('[push] envoyerPushNouveauMessage:', erreur)
  }
}
