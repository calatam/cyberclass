import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Rutas from './pages/Rutas';
import RutaDetalle from './pages/RutaDetalle';
import Modulo from './pages/Modulo';
import Perfil from './pages/Perfil';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/rutas" element={<Rutas />} />
        <Route path="/ruta/:id" element={<RutaDetalle />} />
        <Route path="/modulo/:id" element={<Modulo />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </BrowserRouter>
  );
}
