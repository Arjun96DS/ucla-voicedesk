import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VoicePage from './pages/VoicePage';
import LeavePageList from './pages/LeavePageList';
import TicketsPageList from './pages/TicketsPageList';
import RoomsPage from './pages/RoomsPage';
import PayrollPage from './pages/PayrollPage';
import FAQPage from './pages/FAQPage';
import Layout from './components/Layout';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid #2774AE' },
              success: { iconTheme: { primary: '#FFD100', secondary: '#1a1a2e' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="voice" element={<VoicePage />} />
              <Route path="leave" element={<LeavePageList />} />
              <Route path="tickets" element={<TicketsPageList />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="faq" element={<FAQPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
