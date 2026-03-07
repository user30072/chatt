'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import DatabaseTableSelector from '@/components/admin/database/DatabaseTableSelector';
import DatabaseTable from '@/components/admin/database/DatabaseTable';
import DatabaseQueryEditor from '@/components/admin/database/DatabaseQueryEditor';
import LoadingSpinner from '@/components/ui/Loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function DatabaseAdminPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, login } = useAuth();
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState('tables');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Check if user is already authenticated as admin
  useEffect(() => {
    if (!loading && user) {
      if (!user.isPlatformAdmin) {
        // Logged in but not platform admin - show error message on login form
        setLoginError('You need platform admin privileges to access this section');
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
  
  // If user is authenticated as platform admin, show database admin panel
  if (isAuthenticated && user && user.isPlatformAdmin) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar activeItem="database" onItemClick={(item) => router.push(`/admin/${item === 'overview' ? '' : item}`)} />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Database Administration</h1>
              <p className="mt-1 text-gray-500">View and manage database records directly</p>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    <strong>Warning:</strong> Changes made here directly affect the database. Use with caution.
                  </p>
                </div>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="tables">Database Tables</TabsTrigger>
                <TabsTrigger value="query">SQL Query</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tables" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle>Tables</CardTitle>
                      <CardDescription>Select a table to view/edit</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DatabaseTableSelector onSelectTable={setSelectedTable} selectedTable={selectedTable} />
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-3">
                    <CardHeader>
                      <CardTitle>{selectedTable ? `Table: ${selectedTable}` : 'Select a Table'}</CardTitle>
                      <CardDescription>
                        {selectedTable 
                          ? 'View and edit records directly in this table' 
                          : 'Choose a table from the list to view its records'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedTable ? (
                        <DatabaseTable tableName={selectedTable} />
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <p>Select a table from the list to view and edit its records</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="query">
                <Card>
                  <CardHeader>
                    <CardTitle>SQL Query Editor</CardTitle>
                    <CardDescription>Execute SQL queries against the database (SELECT only)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DatabaseQueryEditor />
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
          Database Admin Access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please sign in with your platform administrator account
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

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Return to Admin Dashboard
                </button>
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