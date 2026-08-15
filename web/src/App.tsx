import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { I18nProvider } from './i18n';
import { CatalogoProvider } from './catalogo-context';
import Landing from './pages/Landing';
import Rutas from './pages/Rutas';
import RutaDetalle from './pages/RutaDetalle';
import Modulo from './pages/Modulo';
import Perfil from './pages/Perfil';
import Login from './pages/Login';
import Registro from './pages/Registro';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';

export default function App() {
  return (
    <I18nProvider>
    <BrowserRouter>
      <Navbar />
      <CatalogoProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/rutas" element={<Rutas />} />
          <Route path="/ruta/:id" element={<RutaDetalle />} />
          <Route path="/modulo/:id" element={<Modulo />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CatalogoProvider>
    </BrowserRouter>
    </I18nProvider>
  );
}
