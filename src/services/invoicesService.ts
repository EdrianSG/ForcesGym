import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/types'

export async function getNextInvoiceNumber(
  prefix: string = 'B001',
): Promise<string> {
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return `${prefix}-00000001`
  }

  const lastNumStr = data[0].invoice_number.split('-')[1]
  const nextNum = (parseInt(lastNumStr, 10) || 0) + 1
  return `${prefix}-${String(nextNum).padStart(8, '0')}`
}

export function generateInvoicePDFBlob(data: {
  invoiceNumber: string
  clientCode: string
  clientName: string
  clientDocument: string
  planName: string
  total: number
  voucherType?: 'boleta' | 'factura'
  issueDate?: string
}): jsPDF {
  const doc = new jsPDF()
  const voucherTitle =
    data.voucherType === 'factura'
      ? 'FACTURA DE VENTA ELECTRÓNICA'
      : 'BOLETA DE VENTA ELECTRÓNICA'

  // El precio ingresado (ej. 80.00) ES EL TOTAL CON IGV INCLUIDO
  const total = Number(data.total)
  const subtotal = Number((total / 1.18).toFixed(2))
  const igv = Number((total - subtotal).toFixed(2))
  const issueDate = data.issueDate ?? new Date().toLocaleDateString('es-PE')

  // Header Gimnasio
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('FORCESGYM S.A.C.', 14, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Gimnasio & Centro de Entrenamiento', 14, 26)
  doc.text('Av. Principal #123 — Lima, Perú', 14, 31)
  doc.text('Contacto: contacto@forcesgym.pe | Tel: (01) 987-654-321', 14, 36)

  // Cuadro RUC / Comprobante (Estándar SUNAT)
  doc.rect(130, 12, 66, 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('R.U.C. 20601234567', 163, 19, { align: 'center' })
  doc.setFontSize(9)
  doc.text(voucherTitle, 163, 26, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`N° ${data.invoiceNumber}`, 163, 34, { align: 'center' })

  // Línea divisoria
  doc.setLineWidth(0.5)
  doc.line(14, 42, 196, 42)

  // Datos del Cliente y Socio
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL COMPROBANTE Y CLIENTE', 14, 49)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Código de Socio:`, 14, 56)
  doc.setFont('helvetica', 'bold')
  doc.text(`#${data.clientCode}`, 45, 56)

  doc.setFont('helvetica', 'normal')
  doc.text(`Cliente / Razón Social:`, 14, 62)
  doc.text(data.clientName, 50, 62)

  doc.text(`DNI / RUC:`, 14, 68)
  doc.text(data.clientDocument || 'S/D', 35, 68)

  doc.text(`Fecha de Emisión:`, 130, 56)
  doc.text(issueDate, 162, 56)

  doc.text(`Moneda:`, 130, 62)
  doc.text('SOLES (PEN S/.)', 162, 62)

  // Tabla de Items / Membresía
  doc.setFillColor(240, 240, 240)
  doc.rect(14, 76, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('Item / Descripción', 18, 81)
  doc.text('Cant.', 120, 81)
  doc.text('P. Unit (S/.)', 145, 81)
  doc.text('Total (S/.)', 175, 81)

  doc.setFont('helvetica', 'normal')
  doc.text(`Servicio de Gimnasio — ${data.planName}`, 18, 91)
  doc.text('1', 123, 91)
  doc.text(total.toFixed(2), 145, 91)
  doc.text(total.toFixed(2), 175, 91)

  doc.line(14, 96, 196, 96)

  // Resumen Tributario SUNAT (Subtotal, IGV 18%, Total)
  const finalY = 104
  doc.setFont('helvetica', 'normal')
  doc.text('Op. Gravada (Base Imponible):', 120, finalY)
  doc.text(`S/. ${subtotal.toFixed(2)}`, 175, finalY)

  doc.text('I.G.V. (18%):', 120, finalY + 6)
  doc.text(`S/. ${igv.toFixed(2)}`, 175, finalY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('IMPORTE TOTAL:', 120, finalY + 14)
  doc.text(`S/. ${total.toFixed(2)}`, 175, finalY + 14)

  // Mensaje SUNAT al pie de página
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'Representación impresa de la Boleta de Venta Electrónica. Incluye IGV (18%).',
    14,
    140,
  )
  doc.text('ForcesGym — Gracias por tu confianza y disciplina.', 14, 145)

  return doc
}

export function downloadInvoicePDFDirectly(invoice: Invoice) {
  const doc = generateInvoicePDFBlob({
    invoiceNumber: invoice.invoice_number,
    clientCode: invoice.client_code,
    clientName: invoice.client_name,
    clientDocument: invoice.client_document,
    planName: invoice.plan_name,
    total: invoice.total,
    voucherType: invoice.voucher_type,
    issueDate: new Date(invoice.created_at).toLocaleDateString('es-PE'),
  })

  doc.save(`Boleta_${invoice.invoice_number}.pdf`)
}

export async function createAndUploadInvoice(data: {
  subscription_id: string
  member_id: string
  client_code: string
  client_name: string
  client_document: string
  plan_name: string
  total: number
  voucher_type?: 'boleta' | 'factura'
}): Promise<Invoice> {
  const prefix = data.voucher_type === 'factura' ? 'F001' : 'B001'
  const invoiceNumber = await getNextInvoiceNumber(prefix)

  // 1. Generar el PDF dinámico
  const doc = generateInvoicePDFBlob({
    invoiceNumber,
    clientCode: data.client_code,
    clientName: data.client_name,
    clientDocument: data.client_document,
    planName: data.plan_name,
    total: data.total,
    voucherType: data.voucher_type ?? 'boleta',
  })

  const arrayBuffer = doc.output('arraybuffer')
  const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })

  // 2. Subir el archivo PDF a Supabase Storage (bucket 'invoices')
  const fileName = `boleta_${invoiceNumber}.pdf`
  const { error: storageError } = await supabase.storage
    .from('invoices')
    .upload(fileName, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (storageError) {
    console.warn('Aviso al subir PDF a Storage:', storageError)
  }

  // 3. Obtener URL pública del PDF en Supabase Storage
  const { data: urlData } = supabase.storage
    .from('invoices')
    .getPublicUrl(fileName)

  const pdfUrl = urlData?.publicUrl ?? null

  const subtotal = Number((data.total / 1.18).toFixed(2))
  const igv = Number((data.total - subtotal).toFixed(2))

  // 4. Guardar registro en la tabla `invoices`
  const { data: inserted, error: dbError } = await supabase
    .from('invoices')
    .insert([
      {
        subscription_id: data.subscription_id,
        member_id: data.member_id,
        voucher_type: data.voucher_type ?? 'boleta',
        invoice_number: invoiceNumber,
        client_code: data.client_code,
        client_name: data.client_name,
        client_document: data.client_document,
        plan_name: data.plan_name,
        subtotal,
        igv,
        total: data.total,
        pdf_url: pdfUrl,
        sunat_status: 'emitido',
        qr_code_data: `20601234567|${data.voucher_type === 'factura' ? '01' : '03'}|${prefix}|${invoiceNumber.split('-')[1]}|${igv}|${data.total}|${new Date().toISOString().split('T')[0]}|1|${data.client_document}|`,
      },
    ])
    .select()
    .single()

  if (dbError || !inserted) {
    console.error('Error al guardar boleta en Supabase:', dbError)
    throw new Error(dbError?.message ?? 'No se pudo registrar la boleta.')
  }

  return inserted as Invoice
}

export async function getInvoicesByMemberId(
  memberId: string,
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error al obtener comprobantes de Supabase:', error)
    return []
  }

  return data as Invoice[]
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('Error al obtener facturas:', error)
    return []
  }

  return data as Invoice[]
}
