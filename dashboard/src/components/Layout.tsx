import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileBarChart2,
  Users,
  Tag,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    adminOnly: false,
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: <FileBarChart2 size={18} />,
    adminOnly: false,
  },
  {
    to: '/users',
    label: 'Users',
    icon: <Users size={18} />,
    adminOnly: true,
  },
  {
    to: '/categories',
    label: 'Categories',
    icon: <Tag size={18} />,
    adminOnly: true,
  },
];

export default function Layout({ children }: LayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-blue-700">
        <Building2 className="text-blue-200" size={22} />
        <div>
          <p className="font-bold text-white text-sm leading-tight">MCRS</p>
          <p className="text-blue-300 text-xs leading-tight">
            Compliance Reporting
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700/60 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-blue-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.name}
            </p>
            <p className="text-blue-300 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-700/60 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-blue-800">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-3 z-10">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-blue-900 text-white shadow-md z-20 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-300" />
              <span className="font-black text-sm tracking-tight">MCRS Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-800 text-blue-200 truncate max-w-[120px]">
              {user?.name || 'Director'}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
