import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiBook, FiUser, FiLogOut, FiDollarSign } from 'react-icons/fi';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Define navigation items based on user role
  const getNavItems = () => {
    if (user?.kind === 'ADMIN') {
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/books', label: 'Books' },
        { path: '/issues', label: 'Issues' },
        { path: '/lost-damaged-books', label: 'Lost/Damaged Books' },
        { path: '/users', label: 'Users' },
        { path: '/payments', label: 'Dues' },
      ];
    } else {
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/books', label: 'Books' },
        { path: '/issues', label: 'My Issues' },
        { path: '/payments', label: 'My Dues' },
      ];
    }
  };

  const navItems = getNavItems();
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Link to="/dashboard" className="flex items-center space-x-2">
              <FiBook className="h-6 w-6" />
              <span className="font-bold text-xl">PICT Library</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleProfileClick}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive('/profile')
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span>{user?.name}</span>
                <span className="text-xs opacity-75">{user?.kind}</span>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-200"
            >
              <div className="flex items-center space-x-2">
                <FiLogOut className="h-4 w-4" />
                <span>Logout</span>
              </div>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-white hover:bg-white/10 focus:outline-none"
            >
              {isOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        className="md:hidden overflow-hidden"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(item.path)
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => {
              handleProfileClick();
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              isActive('/profile')
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span>{user?.name}</span>
                <span className="text-xs opacity-75">{user?.kind}</span>
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              handleLogout();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-200"
          >
            <div className="flex items-center space-x-2">
              <FiLogOut className="h-4 w-4" />
              <span>Logout</span>
            </div>
          </button>
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar; 