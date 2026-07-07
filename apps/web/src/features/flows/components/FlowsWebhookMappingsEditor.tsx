import type { Dispatch, SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import type { FlowWebhookFieldMapping } from '@/lib/flows/webhook-endpoints-api'

export function FlowsWebhookMappingsEditor({
  mappings,
  setMappings,
}: {
  mappings: FlowWebhookFieldMapping[]
  setMappings: Dispatch<SetStateAction<FlowWebhookFieldMapping[]>>
}) {
  return (
    <div className="border-border rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
      <div className="gap-spacing-2 flex items-center justify-between">
        <h3 className="typo-heading-6 text-foreground">MAPPED FIELDS</h3>
        <button
          type="button"
          onClick={() =>
            setMappings([
              ...mappings,
              {
                key: 'customer_email',
                label: 'Customer email',
                source_path: '/customer/email',
              },
            ])
          }
          className="input-glass h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 gap-spacing-1 inline-flex items-center transition-colors"
        >
          <Plus className="icon-xs" />
          Add
        </button>
      </div>
      <div className="space-y-spacing-2">
        {mappings.map((mapping, index) => (
          <div key={`${mapping.key}-${index}`} className="gap-spacing-2 grid grid-cols-1">
            <input
              value={mapping.key}
              onChange={(event) =>
                setMappings((rows) =>
                  rows.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, key: event.target.value } : row,
                  ),
                )
              }
              className="body-3 h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
              placeholder="customer_email"
            />
            <div className="gap-spacing-2 grid grid-cols-2">
              <input
                value={mapping.label}
                onChange={(event) =>
                  setMappings((rows) =>
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, label: event.target.value } : row,
                    ),
                  )
                }
                className="body-3 h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
                placeholder="Label"
              />
              <input
                value={mapping.source_path}
                onChange={(event) =>
                  setMappings((rows) =>
                    rows.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, source_path: event.target.value } : row,
                    ),
                  )
                }
                className="body-3 h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground border outline-none"
                placeholder="/customer/email"
              />
            </div>
          </div>
        ))}
        {mappings.length === 0 ? (
          <p className="body-3 text-muted-foreground">No mapped fields</p>
        ) : null}
      </div>
    </div>
  )
}
