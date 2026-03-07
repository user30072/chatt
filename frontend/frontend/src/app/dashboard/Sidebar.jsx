'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { 
  LayoutDashboard, 
  MessagesSquare, 
  BrainCircuit, 
  FileText, 
  BarChart, 
  Settings, 
  LogOut,
  X,
  TestTube
} from 'lucide-react';
import { localStorage, useIsRefresh } from '@/lib/browserUtils';

export default function Sidebar({ isOpen, setIsOpen, cachedUser }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [localCachedUser, setLocalCachedUser] = useState(null);
  const { isRefresh, isMultipleRefresh } = useIsRefresh('dashboard_session');
  
  // Try to load user from cache to prevent flickering on refresh
  useEffect(() => {
    if (typeof window !== 'undefined' && !cachedUser) {
      try {
        // Use our improved localStorage utility which handles parsing safely
        const cached = localStorage.getItem('user_cache');
        if (cached) {
          // No need to manually parse, our utility already returns the parsed object
          setLocalCachedUser(cached);
        }
      } catch (e) {
        console.error('Error accessing cached user:', e);
      }
    }
  }, [cachedUser]);
  
  // Update cached user when auth user changes
  useEffect(() => {
    if (user) {
      setLocalCachedUser(user);
    }
  }, [user]);
  
  // Use cached user if auth user is not available yet
  // Priority: auth user > passed cached user > local cached user
  const displayUser = user || cachedUser || localCachedUser;
  
  // Special logout for refresh scenarios
  const handleLogout = () => {
    // Don't clear localStorage or manipulate cookies directly
    // Just use the auth system's logout function
    logout({ redirect: true });
  };
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Chatbots', href: '/dashboard/chatbots', icon: BrainCircuit },
    { name: 'Knowledge Base', href: '/dashboard/documents', icon: FileText },
    { name: 'Test Upload', href: '/dashboard/test', icon: TestTube, description: 'Test document upload and RAG functionality' },
    { name: 'Conversations', href: '/dashboard/conversations', icon: MessagesSquare },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];
  
  const NavLink = ({ item }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    
    return (
      <Link
        href={item.href}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
          isActive
            ? 'bg-black text-white'
            : 'text-gray-700 hover:bg-gray-200 hover:text-black'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
        {item.name}
      </Link>
    );
  };
  
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-0 flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold text-primary">any bot&trade;</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-600 hover:text-black focus:outline-none lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>
        
        <div className="px-2 py-4 border-t">
          {(displayUser || isRefresh) ? (
            <>
              <div className="flex items-center px-3 py-2">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                    {displayUser?.firstName?.charAt(0) || displayUser?.email?.charAt(0) || 'U'}
                  </div>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {displayUser?.firstName && displayUser?.lastName 
                      ? `${displayUser.firstName} ${displayUser.lastName}`
                      : displayUser?.email || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {displayUser?.email || ''}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-200 hover:text-black"
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-500" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="ml-3 space-y-2">
                <div className="h-2 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-2 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}