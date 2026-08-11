import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { ScrollToTop } from './components/Bits.jsx'
import { useAuth } from './context/AuthContext.jsx'

import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderPlaced from './pages/OrderPlaced.jsx'
import Orders from './pages/Orders.jsx'
import Account from './pages/Account.jsx'
import Wishlist from './pages/Wishlist.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import About from './pages/About.jsx'
import Brands from './pages/Brands.jsx'
import SellWithUs from './pages/SellWithUs.jsx'
import NotFound from './pages/NotFound.jsx'

import SellerDashboard from './pages/seller/Dashboard.jsx'
import SellerProducts from './pages/seller/Products.jsx'
import SellerProductForm from './pages/seller/ProductForm.jsx'
import SellerOrders from './pages/seller/Orders.jsx'

/** Gate a route behind sign-in, and optionally behind a specific role. */
function Guard({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="route-loading">
        <span className="spinner" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname, role }} />
  }
  if (role && user.role !== role) {
    // Signed in with the wrong account type — send them somewhere useful.
    return <Navigate to={user.role === 'seller' ? '/seller' : '/'} replace />
  }
  return children
}

export function App() {
  const location = useLocation()

  return (
    <>
      <ScrollToTop pathname={location.pathname} />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/product/:slug" element={<Product />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/about" element={<About />} />
          <Route path="/sell" element={<SellWithUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/wishlist" element={<Wishlist />} />

          <Route path="/checkout" element={<Guard role="consumer"><Checkout /></Guard>} />
          <Route path="/order/:code" element={<Guard><OrderPlaced /></Guard>} />
          <Route path="/orders" element={<Guard role="consumer"><Orders /></Guard>} />
          <Route path="/account" element={<Guard role="consumer"><Account /></Guard>} />

          <Route path="/seller" element={<Guard role="seller"><SellerDashboard /></Guard>} />
          <Route path="/seller/products" element={<Guard role="seller"><SellerProducts /></Guard>} />
          <Route path="/seller/products/new" element={<Guard role="seller"><SellerProductForm /></Guard>} />
          <Route path="/seller/products/:id/edit" element={<Guard role="seller"><SellerProductForm /></Guard>} />
          <Route path="/seller/orders" element={<Guard role="seller"><SellerOrders /></Guard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </>
  )
}
