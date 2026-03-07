'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  BrainCircuit,
  Settings,
  Database,
  BarChart3,
  Lock,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AdminSidebar({ activeItem, onItemClick }) {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    {
      title: 'Overview',
      icon: LayoutDashboard,
      value: 'overview'
    },
    {
      title: 'Users',
      icon: Users,
      value: 'users'
    },
    {
      title: 'Organizations',
      icon: Building,
      value: 'organizations'
    },
    {
      title: 'Chatbots',
      icon: BrainCircuit,
      value: 'chatbots'
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      value: 'analytics'
    },
    {
      title: 'Database',
      icon: Database,
      value: 'database'
    },
    {
      title: 'Settings',
      icon: Settings,
      value: 'settings'
    }
  ];
  
  return (
    <div className={`bg-white shadow-sm flex flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="py-6 flex justify-center items-center border-b border-gray-200">
        {collapsed ? (
          <span className="text-2xl font-bold text-black">AB</span>
        ) : (
          <span className="text-2xl font-bold text-black">any bot Admin</span>
        )}
      </div>
      
      {/* Menu Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="p-2 self-end mr-2 mt-2 text-gray-500 hover:text-gray-700"
      >
        {collapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        )}
      </button>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.value}>
              <button
                onClick={() => onItemClick(item.value)}
                className={`flex items-center w-full px-4 py-3 text-base rounded-lg transition-colors
                  ${activeItem === item.value 
                    ? 'bg-black text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <item.icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
                {!collapsed && <span>{item.title}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Logout */}
      <div className="py-4 px-2 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-base text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
