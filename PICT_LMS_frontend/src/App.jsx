import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Books from './pages/books/Books';
import Users from './pages/users/Users';
import Issues from './pages/issues/Issues';
import LostDamagedBooks from './pages/lostDamagedBooks/LostDamagedBooks';
import Profile from './pages/profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import Payments from './pages/payments/Payments';

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        }
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/books" element={<Books />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/lost-damaged-books" element={<LostDamagedBooks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
      </Route>

      {/* Admin Only Routes */}
      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route element={<Layout />}>
          <Route path="/users" element={<Users />} />
        </Route>
      </Route>

      {/* Redirect root to dashboard or login */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
