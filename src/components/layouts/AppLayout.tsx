import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { MobileHeader } from '@/components/layouts/MobileHeader'
import { Sidebar } from '@/components/layouts/Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    setSidebarOpen(false)
    void navigate('/login')
  }

  return (
    <div className="min-h-svh bg-canvas">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="lg:pl-64">
        <MobileHeader onOpenMenu={() => setSidebarOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
