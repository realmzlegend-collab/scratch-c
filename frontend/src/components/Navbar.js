import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaWallet, FaBell, FaBars, FaTimes } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <GiMoneyStack className="text-3xl text-purple-600" />
            <span className="text-xl font-bold gradient-text">ScratchEarn</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium">
              Home
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                  Dashboard
                </Link>
                <Link to="/ads" className="text-gray-700 hover:text-purple-600 font-medium">
                  Watch Ads
                </Link>
                <Link to="/withdraw" className="text-gray-700 hover:text-purple-600 font-medium">
                  Withdraw
                </Link>
                <Link to="/referrals" className="text-gray-700 hover:text-purple-600 font-medium">
                  Referrals
                </Link>
                <Link to="/leaderboard" className="text-gray-700 hover:text-purple-600 font-medium">
                  Leaderboard
                </Link>
                
                {/* User Balance */}
                <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg">
                  <FaWallet className="text-purple-600" />
                  <span className="font-bold text-purple-700">
                    ${user.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">
                    <FaUser className="text-gray-600" />
                    <span className="font-medium">{user.username}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
                    <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      Profile
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-purple-600 font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium">
                Home
              </Link>
              
              {user ? (
                <>
                  <Link to="/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                    Dashboard
                  </Link>
                  <Link to="/ads" className="text-gray-700 hover:text-purple-600 font-medium">
                    Watch Ads
                  </Link>
                  <Link to="/withdraw" className="text-gray-700 hover:text-purple-600 font-medium">
                    Withdraw
                  </Link>
                  <Link to="/referrals" className="text-gray-700 hover:text-purple-600 font-medium">
                    Referrals
                  </Link>
                  <Link to="/leaderboard" className="text-gray-700 hover:text-purple-600 font-medium">
                    Leaderboard
                  </Link>
                  
                  {/* User Balance */}
                  <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg">
                    <FaWallet className="text-purple-600" />
                    <span className="font-bold text-purple-700">
                      ${user.balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  <Link to="/profile" className="text-gray-700 hover:text-purple-600 font-medium">
                    Profile
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="text-gray-700 hover:text-purple-600 font-medium">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-left text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-purple-600 font-medium">
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium text-center"
                  >
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
