'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MoreHorizontalIcon, 
  UserIcon,
  MailIcon,
  TrashIcon,
  EditIcon,
  KeyIcon,
  ArrowUpDownIcon
} from 'lucide-react';
import { apiService } from '@/lib/api';
import Button from '@/components/ui/Button';
import UserEditModal from './modals/UserEditModal';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function UsersTable({ limit = 10, showPagination = true }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fetch users data
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const response = await apiService.getAdminUsers({
          page,
          pageSize: limit,
          sortField,
          sortDirection
        });
        
        setUsers(response.data.users || []);
        setTotalPages(response.data.totalPages || 1);
        setError(null);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Could not load users data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, [page, limit, sortField, sortDirection]);
  
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set to desc by default
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserEdit(true);
  };
  
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await apiService.deleteAdminUser(selectedUser.id);
      
      // Remove from list
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      // Show error message
    }
  };
  
  const handleUserUpdated = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setShowUserEdit(false);
  };
  
  // Format relative date (e.g., "2 days ago")
  const formatRelativeDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Table columns
  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email' },
    { field: 'organization.name', label: 'Organization' },
    { field: 'created_at', label: 'Created' },
    { field: 'action', label: 'Actions' }
  ];
  
  // Render loading skeleton
  if (loading && users.length === 0) {
    return (
      <div className="overflow-hidden">
        <div className="animate-pulse bg-gray-100 h-10 mb-4 rounded"></div>
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-50 rounded-md p-4 mb-2 flex">
            <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  // Render error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
        <div className="text-red-700">
          <p className="font-medium">Error loading users</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    <span>{column.label}</span>
                    {column.field !== 'action' && (
                      <button 
                        onClick={() => handleSort(column.field)}
                        className="ml-1 text-gray-400 hover:text-gray-700"
                      >
                        <ArrowUpDownIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <UserIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.isPlatformAdmin ? 'Platform Admin' : (user.isAdmin ? 'Admin' : 'User')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MailIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.organization?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">ID: {user.organization?.id?.substring(0, 8) || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRelativeDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit User"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete User"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(page - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(Math.min(page + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, users.length + (page - 1) * limit)}</span> of{' '}
                <span className="font-medium">{totalPages * limit}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(Math.max(page - 1, 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Show current page and adjacent pages
                  let pageNum;
                  if (totalPages <= 5) {
                    // Show all pages if 5 or fewer
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    // Show first 5 pages
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    // Show last 5 pages
                    pageNum = totalPages - 4 + i;
                  } else {
                    // Show current page and 2 pages in each direction
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pageNum
                          ? 'z-10 bg-black text-white border-black'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(page + 1, totalPages))}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showUserEdit && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => setShowUserEdit(false)}
          onSave={handleUserUpdated}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName} (${selectedUser?.email})? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeleteUser}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
} 