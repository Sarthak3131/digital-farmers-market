import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute - Role-Based Access Control route guard
 * @param {Array<string>} allowedRoles - Optional list of permitted roles (e.g., ['admin'], ['farmer'])
 * @param {React.ReactNode} children - Optional wrapped children
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // Show themed spinner while auth status is being verified
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium animate-pulse text-sm">
            Verifying TerraFresh credentials...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login page preserving attempted path
  if (!token || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Role validation if specific roles are required
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Gracefully redirect to the user's appropriate portal
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "farmer") {
      return <Navigate to="/farmer" replace />;
    }
    return <Navigate to="/consumer/home" replace />;
  }

  // Render children or nested routes via Outlet
  return children ? children : <Outlet />;
}
