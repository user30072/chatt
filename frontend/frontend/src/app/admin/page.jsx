'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminStats from '@/components/admin/AdminStats';
import UsersTable from '@/components/admin/UsersTable';
import ChatbotsTable from '@/components/admin/ChatbotsTable';
import LoadingSpinner from '@/components/ui/Loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading, isAuthenticated, login } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Check if user is already authenticated as admin
  useEffect(() => {
    if (!loading && user) {
      if (user.isPlatformAdmin || user.isAdmin) {
        // Already logged in as admin, show admin dashboard
        console.log('User is admin, showing dashboard');
      } else {
        // Logged in but not admin - show error message on login form
        setLoginError('Your account does not have admin privileges');
      }
    }
  }, [user, loading, router]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      await login({ email, password });
      // Login successful, the page will re-render and show admin dashboard if admin
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // If user is authenticated as admin, show admin dashboard
  if (isAuthenticated && user && (user.isPlatformAdmin || user.isAdmin)) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar activeItem={activeTab} onItemClick={setActiveTab} />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-gray-500">Manage your platform's users and chatbots.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <AdminStats />
              </TabsContent>
              
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Manage users and their permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UsersTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="chatbots" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Chatbots</CardTitle>
                    <CardDescription>Manage all chatbots in the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChatbotsTable />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    );
  }
  
  // Otherwise, show admin login form
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please sign in with your administrator account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loginError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{loginError}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex justify-center py-2 px-4"
              >
                {isLoggingIn ? <LoadingSpinner size="sm" /> : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 