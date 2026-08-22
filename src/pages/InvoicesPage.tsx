import { FileText, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { downloadInvoicePDFDirectly, getAllInvoices } from '@/services/invoicesService'
import type { Invoice } from '@/types'
import { formatDate, formatMoney } from '@/utils/dates'

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    getAllInvoices()
      .then((data) => {
        if (active) {
          setInvoices(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Error al cargar boletas:', err)
        if (active) {
          setInvoices([])
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const filteredInvoices = invoices.filter((inv) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const num = String(inv.invoice_number ?? '').toLowerCase()
    const code = String(inv.client_code ?? '').toLowerCase()
    const name = String(inv.client_name ?? '').toLowerCase()
    const doc = String(inv.client_document ?? '').toLowerCase()
    return (
      num.includes(q) ||
      code.includes(q) ||
      name.includes(q) ||
      doc.includes(q)
    )
  })

  return (
    <div>
      <PageHeader
        title="Facturación Electrónica SUNAT"
        description="Registro y archivos PDF de todas las boletas de venta emitidas guardadas en Supabase."
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-3 sm:p-4">
          <label className="relative mx-auto block max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por N° comprobante, código socio (#1915), cliente o DNI/RUC…"
              className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">N° Comprobante</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cód. Socio</th>
                <th className="px-4 py-3">Cliente / DNI</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">IGV (18%)</th>
                <th className="px-4 py-3">Total (S/.)</th>
                <th className="px-4 py-3 text-right">Comprobante PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted">
                    Cargando registro de boletas…
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted">
                    No se encontraron comprobantes emitidos.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3 font-semibold text-ink">
                      {inv.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {inv.created_at ? formatDate(inv.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      #{inv.client_code || '0000'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{inv.client_name || 'Cliente'}</p>
                      <p className="text-xs text-muted">DNI: {inv.client_document || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{inv.plan_name || 'Plan'}</td>
                    <td className="px-4 py-3 text-muted">{formatMoney(inv.subtotal ?? 0)}</td>
                    <td className="px-4 py-3 text-muted">{formatMoney(inv.igv ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {formatMoney(inv.total ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => downloadInvoicePDFDirectly(inv)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <FileText className="size-3.5" />
                        Descargar PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
