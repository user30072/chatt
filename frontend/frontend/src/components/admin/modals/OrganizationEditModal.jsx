'use client';

import { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { apiService } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function OrganizationEditModal({ organization, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    subscriptionStatus: '',
    trialEndDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        username: organization.username || organization.name || '',
        subscriptionStatus: organization.subscription?.status || 'inactive',
        trialEndDate: organization.subscription?.trial_end 
          ? new Date(organization.subscription.trial_end).toISOString().split('T')[0]
          : ''
      });
    }
  }, [organization]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const updatedData = {
        name: formData.name,
        username: formData.username,
        subscription: {
          status: formData.subscriptionStatus,
          trial_end: formData.trialEndDate ? new Date(formData.trialEndDate).toISOString() : null
        }
      };
      
      const response = await apiService.updateAdminOrganization(organization.id, updatedData);
      onSave(response.data);
    } catch (err) {
      console.error('Failed to update organization:', err);
      setError(err.response?.data?.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Organization</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                    pattern="[a-zA-Z0-9_-]{3,20}"
                    title="Username can only contain letters, numbers, underscores and hyphens (3-20 characters)"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Username can only contain letters, numbers, underscores and hyphens (3-20 characters)
                </p>
              </div>
              
              <div>
                <label htmlFor="subscriptionStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Status
                </label>
                <select
                  id="subscriptionStatus"
                  name="subscriptionStatus"
                  value={formData.subscriptionStatus}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="trialing">Trial</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>
              
              {formData.subscriptionStatus === 'trialing' && (
                <div>
                  <label htmlFor="trialEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Trial End Date
                  </label>
                  <input
                    type="date"
                    id="trialEndDate"
                    name="trialEndDate"
                    value={formData.trialEndDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black hover:bg-gray-900 text-white"
                isLoading={loading}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 