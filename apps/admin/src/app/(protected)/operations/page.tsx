'use client'

import { AdminDataView } from '@/components/admin/AdminDataView'

type CountByApp = { app: string; count: number }
type CountBySeverity = { severity: string; count: number }

type OperationsData = {
  totalErrors24h: number
  errorsByApp: CountByApp[]
  errorsBySeverity: CountBySeverity[]
}

export default function OperationsPage() {
  return (
    <AdminDataView<OperationsData>
      title="Operations"
      description="Operational error breakdown."
      path="operations"
      render={(data) => (
        <div className="space-y-spacing-6">
          <div className="gap-spacing-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-glass rounded-spacing-3 p-spacing-4">
              <h3 className="body-3 text-muted-foreground mb-spacing-2">Total Errors (24h)</h3>
              <p className="title-h4 text-foreground">{data.totalErrors24h}</p>
            </div>
          </div>

          <div>
            <h2 className="title-h5 text-foreground mb-spacing-2">Errors By App</h2>
            <div className="section-card rounded-spacing-3 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      App
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.errorsByApp.map((row) => (
                    <tr key={row.app} className="border-border border-t">
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                        {row.app}
                      </td>
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="title-h5 text-foreground mb-spacing-2">Errors By Severity</h2>
            <div className="section-card rounded-spacing-3 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Severity
                    </th>
                    <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.errorsBySeverity.map((row) => (
                    <tr key={row.severity} className="border-border border-t">
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                        {row.severity}
                      </td>
                      <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    />
  )
}
