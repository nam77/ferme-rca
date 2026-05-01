# Skill : Kanban Board — Ferme RCA

## Colonnes et configuration
const COLONNES = {
  a_faire:  { titre: 'À faire',   couleur: '#e74c3c', icone: '📋' },
  en_cours: { titre: 'En cours',  couleur: '#f39c12', icone: '⚙️' },
  termine:  { titre: 'Terminé',   couleur: '#27ae60', icone: '✅' }
}

## Implémentation @dnd-kit/core
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'

const KanbanBoard = () => {
  const [tacheActive, setTacheActive] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return
    const nouveauStatut = over.id
    const tacheId = active.id
    // 1. Mise à jour optimiste immédiate
    deplacerTacheLocalement(tacheId, nouveauStatut)
    // 2. Appel API en arrière-plan
    try {
      await api.changerStatut(tacheId, nouveauStatut)
    } catch {
      // 3. Annuler si erreur
      annulerDeplacementLocal(tacheId)
      Toast.show('Erreur: synchronisation impossible')
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}
      onDragStart={({ active }) => setTacheActive(active.id)}>
      {Object.entries(COLONNES).map(([statut, config]) => (
        <ColonneKanban key={statut} statut={statut} config={config}
          taches={tachesFiltrees.filter(t => t.statut === statut)} />
      ))}
      <DragOverlay>
        {tacheActive && <CarteTache tache={trouverTache(tacheActive)} survol />}
      </DragOverlay>
    </DndContext>
  )
}

## Carte de tâche — contenu
Structure visuelle de CarteTache :
- Bordure gauche 4px : couleur de la filière
- En-tête : [Icône filière] [Titre] [Badge priorité couleur]
- Corps : Description tronquée à 2 lignes (numberOfLines={2})
- Pied : [Avatar initiales responsable] [Date limite] [Jours restants]
- Ombre légère et border-radius 8px

## Filtres par filière
const [filtreActif, setFiltreActif] = useState('tous')
const tachesFiltrees = filtreActif === 'tous'
  ? toutes les taches
  : taches.filter(t => t.filiere === filtreActif)

Boutons filtres : ScrollView horizontal, bouton par filière
+ bouton "Tout". Fond coloré si filtre actif.
      
