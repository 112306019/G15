import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Overview      from '@/pages/Overview'
import Campaigns     from '@/pages/Campaigns'
import KocManagement from '@/pages/KocManagement'
import Orders        from '@/pages/Orders'
import Analytics     from '@/pages/Analytics'
import Settings      from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index            element={<Overview />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="koc"       element={<KocManagement />} />
        <Route path="orders"    element={<Orders />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings"  element={<Settings />} />
      </Route>
    </Routes>
  )
}
