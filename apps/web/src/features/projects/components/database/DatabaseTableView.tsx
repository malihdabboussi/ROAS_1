'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Table2, Trash2, X } from 'lucide-react'
import {
  deleteRow as apiDeleteRow,
  insertRow as apiInsertRow,
  updateRow as apiUpdateRow,
  fetchTableRows,
} from '../../services/supabase-integration.service'
import type { ColumnInfo } from '../../types'

interface DatabaseTableViewProps {
  projectRef: string
  tableName: string | null
  columns: ColumnInfo[]
  onRowCountChanged: () => void
}

const PAGE_SIZE = 50

export function DatabaseTableView({
  projectRef,
  tableName,
  columns,
  onRowCountChanged,
}: DatabaseTableViewProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [addingRow, setAddingRow] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const primaryKeys = columns.filter((c) => c.isPrimaryKey)

  const loadRows = useCallback(async () => {
    if (!tableName) return
    setLoading(true)
    try {
      const result = await fetchTableRows(projectRef, tableName, offset, PAGE_SIZE)
      setRows(result?.rows ?? [])
      setTotalCount(result.totalCount)
    } catch {
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [projectRef, tableName, offset])

  useEffect(() => {
    setOffset(0)
    setEditingCell(null)
    setAddingRow(false)
  }, [tableName])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    if (editRef.current) editRef.current.focus()
  }, [editingCell])

  const getPrimaryKeyValues = (row: Record<string, unknown>) => {
    const pks: Record<string, unknown> = {}
    for (const pk of primaryKeys) pks[pk.name] = row[pk.name]
    return pks
  }

  const handleStartEdit = (rowIdx: number, col: string, currentValue: unknown) => {
    if (primaryKeys.some((pk) => pk.name === col)) return
    setEditingCell({ rowIdx, col })
    setEditValue(currentValue === null || currentValue === undefined ? '' : String(currentValue))
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleSaveEdit = async () => {
    if (!editingCell || !tableName) return
    const row = rows[editingCell.rowIdx]
    if (!row) return

    const pkValues = getPrimaryKeyValues(row)
    const parsedValue = editValue === '' ? null : editValue

    try {
      await apiUpdateRow(projectRef, tableName, pkValues, {
        [editingCell.col]: parsedValue,
      })
      await loadRows()
    } catch {
      // keep editing state on failure
    }
    setEditingCell(null)
    setEditValue('')
  }

  const handleDeleteRow = async (row: Record<string, unknown>) => {
    if (!tableName) return
    const pkValues = getPrimaryKeyValues(row)
    try {
      await apiDeleteRow(projectRef, tableName, pkValues)
      await loadRows()
      onRowCountChanged()
    } catch {
      // silent
    }
  }

  const handleAddRow = async () => {
    if (!tableName) return
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(newRowData)) {
      if (v === '') continue
      data[k] = v
    }
    try {
      await apiInsertRow(projectRef, tableName, data)
      setAddingRow(false)
      setNewRowData({})
      await loadRows()
      onRowCountChanged()
    } catch {
      // silent
    }
  }

  if (!tableName) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Table2 className="text-muted-foreground mb-3 h-8 w-8 opacity-30" />
        <p className="body-3 text-muted-foreground">Select a table to view data</p>
      </div>
    )
  }

  const pageStart = offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, totalCount)
  const hasPrev = offset > 0
  const hasNext = offset + PAGE_SIZE < totalCount

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-spacing-3 py-spacing-2 border-border flex items-center justify-between border-b">
        <div className="gap-spacing-2 flex items-center">
          <span className="body-2 font-semibold">{tableName}</span>
          <span className="badge-glass badge-glass-muted typo-caption font-medium">
            {totalCount} rows
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddingRow(true)
            setNewRowData({})
          }}
          className="button-glass-accent gap-spacing-1 flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <Plus className="h-3 w-3" />
          Add Row
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="border-border bg-muted/30 sticky top-0 border-b">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground whitespace-nowrap font-medium"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.name}</span>
                      <span className="badge-glass badge-glass-muted typo-caption px-1 py-0 font-normal">
                        {col.dataType}
                      </span>
                      {col.isPrimaryKey && (
                        <span className="badge-glass badge-glass-blue typo-caption px-1 py-0 font-normal">
                          PK
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {/* Add row form */}
              {addingRow && (
                <tr className="border-border bg-primary/5 border-b">
                  {columns.map((col) => {
                    const hasDefault =
                      col.defaultValue !== null || (col.isPrimaryKey && col.defaultValue !== null)
                    return (
                      <td key={col.name} className="px-spacing-2 py-spacing-1">
                        <input
                          type="text"
                          value={newRowData[col.name] ?? ''}
                          onChange={(e) =>
                            setNewRowData((prev) => ({ ...prev, [col.name]: e.target.value }))
                          }
                          placeholder={hasDefault ? '(default)' : col.isNullable ? 'NULL' : ''}
                          className="body-4 border-border placeholder:text-muted-foreground/50 focus:ring-primary h-6 w-full min-w-[60px] rounded border bg-transparent px-1 focus:outline-none focus:ring-1"
                        />
                      </td>
                    )
                  })}
                  <td className="px-spacing-1 py-spacing-1">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex h-5 w-5 items-center justify-center rounded text-emerald-500 hover:bg-emerald-500/10"
                        title="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingRow(false)
                          setNewRowData({})
                        }}
                        className="text-muted-foreground hover:bg-hover-subtle flex h-5 w-5 items-center justify-center rounded"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-border hover:bg-hover-subtle/50 group border-b transition-colors"
                >
                  {columns.map((col) => {
                    const value = row[col.name]
                    const isEditing =
                      editingCell?.rowIdx === rowIdx && editingCell?.col === col.name
                    const isPk = col.isPrimaryKey

                    if (isEditing) {
                      return (
                        <td key={col.name} className="px-spacing-2 py-spacing-1">
                          <input
                            ref={editRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            onBlur={handleSaveEdit}
                            className="body-4 border-primary focus:ring-primary h-6 w-full min-w-[60px] rounded border bg-transparent px-1 focus:outline-none focus:ring-1"
                          />
                        </td>
                      )
                    }

                    return (
                      <td
                        key={col.name}
                        onDoubleClick={() => !isPk && handleStartEdit(rowIdx, col.name, value)}
                        className={`px-spacing-2 py-spacing-1 body-4 max-w-[300px] truncate whitespace-nowrap ${
                          isPk ? 'text-muted-foreground/70' : 'cursor-text'
                        } ${value === null ? 'text-muted-foreground italic' : ''}`}
                      >
                        {value === null
                          ? 'NULL'
                          : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                      </td>
                    )
                  })}
                  <td className="px-spacing-1 py-spacing-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(row)}
                      className="text-destructive hover:bg-destructive/10 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                      title="Delete row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="body-4 text-muted-foreground py-spacing-6 text-center"
                  >
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="px-spacing-3 py-spacing-2 border-border flex items-center justify-between border-t">
          <span className="typo-caption text-muted-foreground">
            {pageStart}–{pageEnd} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="btn-icon-glass !h-6 !w-6 disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="btn-icon-glass !h-6 !w-6 disabled:opacity-30"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
