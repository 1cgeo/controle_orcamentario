import React, { lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute'

const DashboardLayout = lazy(() => import('./layouts/dashboard'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const NotaCreditoPage = lazy(() => import('./pages/NotaCredito'))
const NotaEmpenhoPage = lazy(() => import('./pages/NotaEmpenho'))

export default function Router() {
  return useRoutes([
    {
      path: '/',
      element: <DashboardLayout />,
      children: [
        { path: '/nc', element: <NotaCreditoPage /> },
        { path: '/ne', element: <NotaEmpenhoPage /> },
        { path: '/', element: <Navigate to="/nc" replace /> }
        
      ]
    },
    { path: '*', element: <Navigate to="/" replace /> }
  ]);
}
