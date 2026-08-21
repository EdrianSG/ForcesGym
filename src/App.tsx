import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { LoginPage } from '@/pages/LoginPage'
import { MemberDetailPage } from '@/pages/MemberDetailPage'
import { MemberNewPage } from '@/pages/MemberNewPage'
import { MembersPage } from '@/pages/MembersPage'
import { MembershipsPage } from '@/pages/MembershipsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlansPage } from '@/pages/PlansPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberNewPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
