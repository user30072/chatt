'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    
    try {
      // Update profile
      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-400 text-green-800 px-4 py-3 rounded">
          <p className="font-medium">✅ Changes saved successfully!</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Account Information</h3>
          <p className="mt-1 text-sm text-gray-500">Personal details and application settings</p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                id="firstName"
                name="firstName"
                label="First Name"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              
              <Input
                id="lastName"
                name="lastName"
                label="Last Name"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            
            <Input
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              required
            />
            
            <Input
              id="username"
              name="username"
              label="Username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
            
            <div className="pt-5 border-t border-gray-200">
              <Button
                type="submit"
                className="bg-black hover:bg-gray-900 text-white"
                isLoading={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">API Keys</h3>
          <p className="mt-1 text-sm text-gray-500">View and manage your API keys</p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="mt-4">
            <Button
              variant="outline"
            >
              Generate New API Key
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-red-600">Danger Zone</h3>
          <p className="mt-1 text-sm text-gray-500">Irreversible actions for your account</p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-md font-medium text-gray-900">Delete Account</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 