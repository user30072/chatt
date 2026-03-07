'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { 
  BellIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  UserIcon 
} from 'lucide-react';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  return (
    <header className="bg-white border-b border-gray-200 z-20">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              placeholder="Search users, organizations..."
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-800">New user registered: john@example.com</p>
                    <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-800">New organization created: Example Inc.</p>
                    <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 text-center">
                  <button className="text-sm text-black font-medium hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User menu */}
          <div className="relative">
            <button 
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={`${user.firstName}'s avatar`} 
                    className="h-8 w-8 rounded-full" 
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">Platform Admin</p>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                </div>
                <a 
                  href="/admin/settings" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </a>
                <button 
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}