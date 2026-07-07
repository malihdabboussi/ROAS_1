import type { RefObject } from 'react'
import { Image as ImageIcon, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import type { CarouselCard } from '../../types'

interface AdCarouselCardsEditorProps {
  cards: CarouselCard[]
  menuOpenIndex: number | null
  menuButtonRef: RefObject<HTMLButtonElement | null>
  onAddCard: () => void
  onRemoveCard: (index: number) => void
  onUpdateCard: (index: number, patch: Partial<CarouselCard>) => void
  onSaveCards: () => void
  onToggleCardMenu: (index: number) => void
  onCloseCardMenu: () => void
  onOpenLibrary: (index: number) => void
}

export function AdCarouselCardsEditor({
  cards,
  menuOpenIndex,
  menuButtonRef,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  onSaveCards,
  onToggleCardMenu,
  onCloseCardMenu,
  onOpenLibrary,
}: AdCarouselCardsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="body-3 text-foreground font-medium">Carousel Cards</span>
        <button
          type="button"
          onClick={onAddCard}
          className="chip-glass-blue flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Card
        </button>
      </div>
      {cards.length < 2 && (
        <p className="typo-caption text-warning">Carousel requires at least 2 cards.</p>
      )}
      {cards.map((card, idx) => {
        const cardImageUrl = card.image_url ?? ''
        const hasCardImage = !!cardImageUrl
        const cardMenuOpen = menuOpenIndex === idx
        return (
          <div key={idx} className="card-glass space-y-2 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="body-3 text-muted-foreground font-medium">Card {idx + 1}</span>
              <button
                type="button"
                onClick={() => onRemoveCard(idx)}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {hasCardImage ? (
                <div className="group relative h-36 w-36 overflow-hidden rounded-lg">
                  <img src={cardImageUrl} alt={`Card ${idx + 1}`} className="h-full w-full object-cover" />
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-modal-overlay p-2 transition-opacity ${cardMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'}`}
                  >
                    <div className="bg-background/90 flex items-center gap-1.5 rounded-lg p-1 shadow-sm">
                      <button
                        ref={cardMenuOpen ? menuButtonRef : undefined}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onToggleCardMenu(idx)
                        }}
                        className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                        title="Change image"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateCard(idx, { image_url: '', image_asset_id: null })
                          onSaveCards()
                          onCloseCardMenu()
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-muted-foreground/40 bg-secondary/50 flex h-36 w-36 items-center justify-center overflow-hidden rounded-lg border">
                  <button
                    type="button"
                    onClick={() => onOpenLibrary(idx)}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <ImageIcon className="text-muted-foreground/30 h-8 w-8" />
                    <span className="typo-caption text-muted-foreground">From library</span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={card.headline ?? ''}
              onChange={(event) => onUpdateCard(idx, { headline: event.target.value })}
              onBlur={onSaveCards}
              className="input-glass body-3 w-full"
              placeholder="Card headline"
            />
            <input
              type="text"
              value={card.description ?? ''}
              onChange={(event) => onUpdateCard(idx, { description: event.target.value })}
              onBlur={onSaveCards}
              className="input-glass body-3 w-full"
              placeholder="Card description (optional)"
            />
            <input
              type="url"
              value={card.link ?? ''}
              onChange={(event) => onUpdateCard(idx, { link: event.target.value })}
              onBlur={onSaveCards}
              className="input-glass body-3 w-full"
              placeholder="Card link URL"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSaveCards}
                className="button-glass-primary body-3 rounded-lg px-2 py-1 font-medium"
              >
                Save Card
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
