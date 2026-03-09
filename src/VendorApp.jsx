import { Routes, Route } from 'react-router-dom'
import VendorLayout  from './vendor/Layout'
import Overview      from './vendor/Overview'
import Campaigns     from './vendor/Campaigns'
import Products      from './vendor/Products'
import KocManagement from './vendor/KocManagement'
import Orders        from './vendor/Orders'
import Analytics     from './vendor/Analytics'
import ContentReview from './vendor/ContentReview'
import Chat          from './vendor/Chat'
import Settings      from './vendor/Settings'

export default function VendorApp() {
  return (
    <Routes>
      <Route element={<VendorLayout />}>
        <Route index               element={<Overview />}      />
        <Route path="campaigns"    element={<Campaigns />}     />
        <Route path="products"     element={<Products />}      />
        <Route path="koc"          element={<KocManagement />} />
        <Route path="orders"       element={<Orders />}        />
        <Route path="analytics"    element={<Analytics />}     />
        <Route path="review"       element={<ContentReview />} />
        <Route path="chat"         element={<Chat />}          />
        <Route path="settings"     element={<Settings />}      />
      </Route>
    </Routes>
  )
}
