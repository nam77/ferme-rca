// Configure le domaine d'envoi email sur Resend + crée les enregistrements
// DNS correspondants sur Cloudflare, puis déclenche la vérification.
//
// Variables d'environnement attendues (fournies par le workflow via secrets) :
//   RESEND_API_KEY        clé API Resend
//   CLOUDFLARE_API_TOKEN  token Cloudflare (doit autoriser Zone DNS: Edit)
//   DOMAINE               ex. agri-pilot.com
//
// Les clés ne sont JAMAIS affichées. Les enregistrements DNS le sont (publics).

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const DOMAINE = (process.env.DOMAINE || 'agri-pilot.com').trim()

if (!RESEND_API_KEY) { console.error('✗ RESEND_API_KEY manquant'); process.exit(1) }
if (!CF_TOKEN) { console.error('✗ CLOUDFLARE_API_TOKEN manquant'); process.exit(1) }

const resend = (path, method = 'GET', body) =>
  fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

const cf = (path, method = 'GET', body) =>
  fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

async function jsonOuErreur(r, contexte) {
  const txt = await r.text()
  let data
  try { data = JSON.parse(txt) } catch { data = { brut: txt } }
  if (!r.ok) console.warn(`  (${contexte}) HTTP ${r.status}: ${txt.slice(0, 300)}`)
  return data
}

// ─────────── 1. Domaine Resend (créer ou retrouver) ───────────
console.log(`\n=== 1) Domaine Resend : ${DOMAINE} ===`)
let domaine
let r = await resend('/domains', 'POST', { name: DOMAINE })
let data = await jsonOuErreur(r, 'create domain')
if (r.ok) {
  domaine = data
  console.log(`✓ Domaine créé (id=${domaine.id})`)
} else {
  // Existe déjà → on le retrouve dans la liste
  const liste = await (await resend('/domains')).json()
  domaine = (liste.data || []).find((d) => d.name === DOMAINE)
  if (!domaine) { console.error('✗ Impossible de créer ni retrouver le domaine'); process.exit(1) }
  const detail = await (await resend(`/domains/${domaine.id}`)).json()
  domaine = detail
  console.log(`✓ Domaine déjà présent (id=${domaine.id}, statut=${domaine.status})`)
}

const records = domaine.records || []
console.log(`\n=== Enregistrements DNS attendus par Resend (${records.length}) ===`)
for (const rec of records) {
  console.log(`  [${rec.type}] ${rec.name}  ->  ${rec.value}${rec.priority ? `  (priorité ${rec.priority})` : ''}`)
}

// ─────────── 2. Zone Cloudflare ───────────
console.log(`\n=== 2) Zone Cloudflare ===`)
const zones = await (await cf(`/zones?name=${encodeURIComponent(DOMAINE)}`)).json()
const zone = zones.result && zones.result[0]
if (!zone) {
  console.error(`✗ Zone Cloudflare introuvable pour ${DOMAINE} (le token a-t-il accès à cette zone ?)`)
  console.error('  → Ajoute les enregistrements ci-dessus manuellement dans Cloudflare, puis relance avec action=verify.')
  process.exit(1)
}
console.log(`✓ Zone trouvée (id=${zone.id})`)

// ─────────── 3. Création des enregistrements DNS ───────────
console.log(`\n=== 3) Création des enregistrements DNS sur Cloudflare ===`)
// Index des enregistrements existants pour éviter les doublons
const existants = await (await cf(`/zones/${zone.id}/dns_records?per_page=100`)).json()
const dejaLa = (nom, type) =>
  (existants.result || []).some((e) => e.name === nom.replace(/\.$/, '') && e.type === type)

for (const rec of records) {
  const nom = rec.name
  const type = rec.type
  if (dejaLa(nom, type)) { console.log(`  • ${type} ${nom} : déjà présent, ignoré`); continue }
  const corps = { type, name: nom, content: rec.value, ttl: 1, proxied: false }
  if (type === 'MX') corps.priority = rec.priority ?? 10
  const res = await cf(`/zones/${zone.id}/dns_records`, 'POST', corps)
  const d = await jsonOuErreur(res, `create ${type} ${nom}`)
  console.log(res.ok ? `  ✓ ${type} ${nom} créé` : `  ✗ ${type} ${nom} échec`)
  void d
}

// ─────────── 4. Déclenche la vérification Resend ───────────
console.log(`\n=== 4) Vérification Resend ===`)
await resend(`/domains/${domaine.id}/verify`, 'POST')
// Petit délai puis lecture du statut
await new Promise((r) => setTimeout(r, 4000))
const final = await (await resend(`/domains/${domaine.id}`)).json()
console.log(`Statut du domaine : ${final.status}`)
console.log(
  final.status === 'verified'
    ? '✓ Domaine VÉRIFIÉ — les emails partiront vers toutes les adresses.'
    : "ℹ La vérification DNS peut prendre quelques minutes (propagation). Relance l'action 'verify' plus tard si besoin.",
)
