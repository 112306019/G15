import { Routes, Route } from 'react-router-dom'
import VendorLayout  from './vendor/Layout'
import Overview      from './vendor/Overview'
import Finance       from './vendor/Finance'
import Campaigns     from './vendor/Campaigns'
import Products      from './vendor/Products'
import KocManagement from './vendor/KocManagement'
import Orders        from './vendor/Orders'
import Analytics     from './vendor/Analytics'
import ContentReview from './vendor/ContentReview'
import Chat          from './vendor/Chat'
import Support       from './vendor/Support'
import Settings      from './vendor/Settings'
import ProductAnalytics from './vendor/ProductAnalytics'


export default function VendorApp() {
  return (
    <Routes>
      <Route element={<VendorLayout />}>
        <Route index               element={<Overview />}      />
        <Route path="finance"      element={<Finance />}       />
        <Route path="campaigns"    element={<Campaigns />}     />
        <Route path="products"     element={<Products />}      />
        <Route path="koc"          element={<KocManagement />} />
        <Route path="orders"       element={<Orders />}        />
        <Route path="analytics"    element={<Analytics />}     />
        <Route path="review"       element={<ContentReview />} />
        <Route path="chat"         element={<Chat />}          />
        <Route path="support"      element={<Support />}       />
        <Route path="settings"     element={<Settings />}      />
        <Route path="product-analytics" element={<ProductAnalytics />} />
      </Route>
    </Routes>
  )
}
