import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/shared/layouts/AppShell'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

const AdminDashboardPage = lazy(() =>
  import('@/features/admin/pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)

const GuestUploadPage = lazy(() =>
  import('@/features/guest-upload/pages/GuestUploadPage').then((module) => ({
    default: module.GuestUploadPage,
  })),
)

function RouteLoadingFallback() {
  return (
    <section className="panel panel--centered">
      <p className="eyebrow">Cargando</p>
      <h1 className="page-title">Preparando la experiencia...</h1>
    </section>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<GuestUploadPage />} />
            <Route path="/upload" element={<GuestUploadPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
