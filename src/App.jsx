// src/App.jsx
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { ALLOWED_DOMAINS } from './config/allowedDomains';
import { ROLES, ROLE_PERMISSIONS } from './config/roles';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from '../src/assets/Login.png';
import AuthButton from './components/auth/AuthButton';

// Importación de páginas
import Resumen from './pages/resumen';
import Proyectos from './pages/Proyectos075';
import ComunidadesEnergeticas from './pages/EnergiaElectricaPage';
import EnConstruccion from './pages/EnConstruccion';
import Transmision from './pages/Transmision';
import Unauthorized from './pages/Unauthorized';

// Importación de componentes de dashboard
import { Banner6GW } from './components/Banner6GW';
import { IndicadoresResumen } from './components/IndicadoresResumen';
import { CapacidadInstalada } from './components/CapacidadInstalada';
import { MapaEmbalses } from './components/MapaEmbalses';
import { CombustiblesLiquidos } from './components/CombustiblesLiquidos';
import { TablaProyectosEnergia } from './components/TablaProyectosEnergia';

function AppContent() {
  const { currentUser, loading, userRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1d1d1d]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC800] mb-4"></div>
          <p className="text-white">Verificando credenciales...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const isProtectedRoute = !['/', '/login'].includes(location.pathname);
    
    return (
      <div 
        style={{ 
          backgroundImage: `url(${Login})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} 
        className="h-screen bg-[#262626] flex flex-col items-center justify-center overflow-hidden"
      >
        <div className="w-full max-w-md bg-transparent">
          <AuthButton />
          {isProtectedRoute && (
            <p className="mt-4 text-sm text-red-500 text-center">
              Debes iniciar sesión para acceder a esta página
            </p>
          )}
        </div>
      </div>
    );
  }

  const emailDomain = currentUser.email?.split('@')[1];
  const isAuthorized = ALLOWED_DOMAINS.some(domain => 
    emailDomain === domain || emailDomain?.endsWith(`.${domain}`)
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#262626] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthButton />
          <p className="mt-4 text-sm text-red-500 text-center">
            Dominios permitidos: {ALLOWED_DOMAINS.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Header userRole={userRole} />
      
      <div className="flex bg-[#1d1d1d] min-h-screen pt-20">
        <Sidebar
          open={sidebarOpen}
          toggle={() => setSidebarOpen(prev => !prev)}
          userRole={userRole}
        />

        <div className="flex-1 text-white p-6 overflow-auto">
          <Routes>
            <Route path="/" element={
              <PrivateRoute>
                <>
                  <Banner6GW />
                  <IndicadoresResumen />
                  <CapacidadInstalada />
                  <MapaEmbalses />
                  <CombustiblesLiquidos />
                  <TablaProyectosEnergia />
                </>
              </PrivateRoute>
            } />
            
            <Route path="/6GW+" element={
              <PrivateRoute requiredPermission="dashboard">
                <Resumen />
              </PrivateRoute>
            } />

            <Route path="/proyectos075" element={
              <PrivateRoute requiredPermission="proyectos">
                <Proyectos />
              </PrivateRoute> 
            } />

            <Route path="/comunidades_energeticas" element={
              <PrivateRoute requiredPermission="comunidades">
                <ComunidadesEnergeticas />
              </PrivateRoute>
            } />

            <Route path="/Transmision" element={
              <PrivateRoute requiredPermission="transmision" allowedRoles={[ROLES.ADMIN, ROLES.CONSULTOR_1]}>
                <Transmision/>
              </PrivateRoute>
            } />

            <Route path="/en_construccion" element={
              <PrivateRoute>
                <EnConstruccion />
              </PrivateRoute>
            } />
            
            <Route
              path="/estrategia-6gw"
              element={
                <PrivateRoute allowedRoles={[ROLES.ADMIN]}>
                <div className="text-white p-6">
                  <h2 className="text-2xl font-bold mb-4">Estrategia 6GW</h2>
                  <p>Aquí iría el contenido detallado de tu estrategia…</p>
                </div>
                </PrivateRoute>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/*" element={<AppContent />} />
        <Route path="/login" element={
          <div 
            style={{ 
              backgroundImage: `url(${Login})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }} 
            className="min-h-screen flex flex-col items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              <AuthButton />
            </div>
          </div>
        } />
      </Routes>
    </AuthProvider>
  );
}