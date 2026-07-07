'use client'

import { useState } from 'react'
import { Building2, Check, FileText } from 'lucide-react'

interface MetaAdAccountSelectorProps {
  adAccounts: Array<{ id: string; name: string; currency?: string }>
  pages: Array<{ id: string; name: string }>
  onSelect?: (adAccountId: string, pageId: string) => void
}

export function MetaAdAccountSelector({ adAccounts, pages, onSelect }: MetaAdAccountSelectorProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(
    adAccounts.length === 1 ? (adAccounts[0]?.id ?? null) : null,
  )
  const [selectedPage, setSelectedPage] = useState<string | null>(
    pages.length === 1 ? (pages[0]?.id ?? null) : null,
  )

  const handleConfirm = () => {
    if (selectedAccount && selectedPage && onSelect) {
      onSelect(selectedAccount, selectedPage)
    }
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <h3 className="body-1 text-foreground font-medium">Select Ad Account & Page</h3>
      <p className="body-3 text-muted-foreground mt-spacing-1">
        Choose which ad account and Facebook page to use for publishing.
      </p>

      {/* Ad Accounts */}
      <div className="mt-spacing-3">
        <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium uppercase tracking-wider">
          Ad Account
        </label>
        <div className="space-y-spacing-1">
          {adAccounts.length === 0 ? (
            <p className="body-3 text-muted-foreground py-spacing-2">No ad accounts found</p>
          ) : (
            adAccounts.map((account) => {
              const isSelected = selectedAccount === account.id
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account.id)}
                  className={`gap-spacing-2 px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 flex w-full items-center text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-foreground border-primary/20 border'
                      : 'hover:bg-hover-subtle text-muted-foreground border border-transparent'
                  }`}
                >
                  <Building2 className="icon-sm flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{account.name}</div>
                    <div className="typo-caption text-muted-foreground">{account.id}</div>
                  </div>
                  {isSelected && <Check className="icon-sm text-primary flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Pages */}
      <div className="mt-spacing-3">
        <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium uppercase tracking-wider">
          Facebook Page
        </label>
        <div className="space-y-spacing-1">
          {pages.length === 0 ? (
            <p className="body-3 text-muted-foreground py-spacing-2">No pages found</p>
          ) : (
            pages.map((page) => {
              const isSelected = selectedPage === page.id
              return (
                <button
                  key={page.id}
                  onClick={() => setSelectedPage(page.id)}
                  className={`gap-spacing-2 px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 flex w-full items-center text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-foreground border-primary/20 border'
                      : 'hover:bg-hover-subtle text-muted-foreground border border-transparent'
                  }`}
                >
                  <FileText className="icon-sm flex-shrink-0" />
                  <span className="font-medium">{page.name}</span>
                  {isSelected && <Check className="icon-sm text-primary flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </div>

      {selectedAccount && selectedPage && (
        <button
          onClick={handleConfirm}
          className="button-glass-accent mt-spacing-3 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <span className="relative z-10">Next: Configure Campaign</span>
        </button>
      )}
    </div>
  )
}
