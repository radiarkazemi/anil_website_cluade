import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { CartDrawer } from './components/CartDrawer';
import { Toast } from './components/Toast';
import { MobileTabBar } from './components/MobileTabBar';
import { useGoldPrice } from './hooks/useGoldPrice';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Blog } from './pages/Blog';
import { ContentPageView } from './pages/ContentPage';
import { Account } from './pages/Account';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminGold } from './pages/admin/AdminGold';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminSiteLayout } from './pages/admin/AdminSiteLayout';
import { AdminPages } from './pages/admin/AdminPages';
import './fonts.css';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

function AppInner() {
  useGoldPrice(15000);
  const { pathname } = useLocation();
  const isPanel = pathname.startsWith('/panel');

  return (
    <>
      {!isPanel && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<ContentPageView />} />
        <Route path="/p/:slug" element={<ContentPageView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<Account />} />
        <Route path="/panel/login" element={<AdminLogin />} />
        <Route path="/panel" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="gold" element={<AdminGold />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="layout" element={<AdminSiteLayout />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
      {!isPanel && <CartDrawer />}
      {!isPanel && <MobileTabBar />}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
