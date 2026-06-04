import 'dotenv/config'

// Envoi d'emails transactionnels via l'API HTTP de Resend (aucune dépendance :
// on utilise fetch natif de Node 20+).
const RESEND_API_KEY = process.env.RESEND_API_KEY
// L'expéditeur doit appartenir à un domaine vérifié sur Resend. Par défaut,
// le domaine de test Resend (qui n'envoie qu'à l'adresse du compte Resend) —
// à remplacer par "AgroPilot <no-reply@agri-pilot.com>" une fois le domaine
// agri-pilot.com vérifié.
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'AgroPilot <onboarding@resend.dev>'

// Indique si l'envoi d'email est configuré (clé API présente).
export const emailConfigure = (): boolean => Boolean(RESEND_API_KEY)

export async function envoyerEmail(params: {
  destinataire: string
  sujet: string
  html: string
}): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY absent : envoi d'email impossible")
  }
  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [params.destinataire],
      subject: params.sujet,
      html: params.html,
    }),
  })
  if (!reponse.ok) {
    const texte = await reponse.text().catch(() => '')
    throw new Error(`Resend ${reponse.status}: ${texte.slice(0, 200)}`)
  }
}
