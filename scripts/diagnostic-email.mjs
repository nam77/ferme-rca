// Diagnostic envoi email : affiche la config (sans la clé) et le retour brut
// de l'API Resend pour un envoi test. À exécuter sur le serveur (où .env est
// chargé). La clé n'est jamais affichée ; l'expéditeur et la réponse le sont.
const KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM || '(défaut: AgroPilot <onboarding@resend.dev>)'
const TO = process.env.TEST_TO || 'nyona77@gmail.com'

console.log('RESEND_API_KEY présent :', Boolean(KEY), KEY ? `(longueur ${KEY.length}, préfixe ${KEY.slice(0, 3)})` : '')
console.log('EMAIL_FROM            :', FROM)
console.log('Destinataire test     :', TO)

if (!KEY) { console.error('✗ Pas de clé — rien à tester'); process.exit(1) }

const r = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: process.env.EMAIL_FROM || 'AgroPilot <onboarding@resend.dev>',
    to: [TO],
    subject: 'Test diagnostic AgroPilot',
    html: '<p>Ceci est un email de test envoyé par le diagnostic AgroPilot.</p>',
  }),
})
console.log('\n--- Réponse Resend ---')
console.log('HTTP', r.status)
console.log(await r.text())
