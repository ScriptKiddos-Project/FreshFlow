import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
// import "./App.css"

// Layout Components
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VendorDashboard from './pages/dashboard/VendorDashboard';
import Marketplace from './pages/dashboard/Marketplace';  
import Inventory from './pages/dashboard/Inventory';
import Orders from './pages/dashboard/Orders';


// Hooks
import { useAuth } from './hooks/useAuth';

// Initialize React Query Client
const queryClient = new QueryClient({
 defaultOptions: {
   queries: {
     retry: 1,
     refetchOnWindowFocus: false,
     staleTime: 5 * 60 * 1000, // 5 minutes
   },
 },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { isAuthenticated, isLoading } = useAuth();

 if (isLoading) {
   return (
     <div className="min-h-screen flex items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
     </div>
   );
 }

 return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { isAuthenticated, isLoading } = useAuth();

 if (isLoading) {
   return (
     <div className="min-h-screen flex items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
     </div>
   );
 }

 return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
 return (
   <QueryClientProvider client={queryClient}>
     <Router>
       <div className="App">
         <Routes>
           {/* Public Routes */}
           <Route
             path="/login"
             element={
               <PublicRoute>
                 <Login />
               </PublicRoute>
             }
           />
           <Route
             path="/register"
             element={
               <PublicRoute>
                 <Register />
               </PublicRoute>
             }
           />
           <Route
             path="/forgot-password"
             element={
               <PublicRoute>
                 <ForgotPassword />
               </PublicRoute>
             }
           />

           {/* Protected Routes with Layout */}
           <Route
             path="/"
             element={
               <ProtectedRoute>
                 <Layout />
               </ProtectedRoute>
             }
           >
             <Route index element={<Navigate to="/dashboard" replace />} />
             <Route path="dashboard" element={<VendorDashboard />} />
             <Route path="marketplace" element={<Marketplace />} />
             <Route path="inventory" element={<Inventory />} />
             <Route path="orders" element={<Orders />} />
           </Route>

           {/* 404 Route */}
          
         </Routes>

         {/* Global Toast Notifications */}
         <Toaster
           position="top-right"
           toastOptions={{
             duration: 4000,
             style: {
               background: '#363636',
               color: '#fff',
             },
             success: {
               duration: 3000,
               iconTheme: {
                 primary: '#10b981',
                 secondary: '#fff',
               },
             },
             error: {
               duration: 5000,
               iconTheme: {
                 primary: '#ef4444',
                 secondary: '#fff',
               },
             },
           }}
         />
       </div>
     </Router>
   </QueryClientProvider>
 );
};

export default App;