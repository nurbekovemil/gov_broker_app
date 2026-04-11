import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import Layout from './Layout';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly }: Props) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/market" replace />;
  return <Layout>{children}</Layout>;
}
