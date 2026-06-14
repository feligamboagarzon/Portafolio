import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MuseumCanvas from './pages/MuseumCanvas';
import ProjectDetail from './pages/ProjectDetail';
import ResumeDocument from './pages/ResumeDocument';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MuseumCanvas />,
  },
  {
    path: '/project/:id',
    element: <ProjectDetail />,
  },
  {
    path: '/resume',
    element: <ResumeDocument />,
  }
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
