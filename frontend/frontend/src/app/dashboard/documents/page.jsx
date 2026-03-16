'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { FileText, Upload, File, Trash, X, Loader2 } from 'lucide-react';
import apiService from '@/lib/api';
import { useToast } from '@/lib/toast';

// Cache bust version 2 - force new chunk generation

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    file: null
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getAllDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
        type: 'error'
      });
      // If API fails, show empty state
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await apiService.deleteDocument(documentId);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
        type: 'success'
      });
      // Remove from local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        type: 'error'
      });
    }
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'file' && files?.length) {
      const file = files[0];
      // Validate file type
      const validTypes = ['.pdf', 'application/pdf', '.txt', 'text/plain', '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!validTypes.some(type => file.name.endsWith(type) || file.type === type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF, TXT, or DOCX file.',
          type: 'error'
        });
        return;
      }
      
      // Auto-fill name if empty
      if (!uploadData.name) {
        // Remove extension from filename
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setUploadData(prev => ({ ...prev, name: fileName, file }));
      } else {
        setUploadData(prev => ({ ...prev, file }));
      }
    } else {
      setUploadData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    console.log('[DEBUG] handleUploadSubmit called');
    console.log('[DEBUG] uploadData:', { name: uploadData.name, hasFile: !!uploadData.file });
    
    if (!uploadData.name || !uploadData.file) {
      toast({
        title: 'Missing information',
        description: 'Please provide a name and select a file',
        type: 'error'
      });
      return;
    }
    
    setIsUploading(true);
    console.log('[DEBUG] Starting upload process...');
    
    try {
      console.log('[DEBUG] About to read file as base64...');
      // Convert file to base64 to avoid multipart/Railway proxy issues (v3)
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get base64 part only
        reader.onerror = reject;
        reader.readAsDataURL(uploadData.file);
      });
      
      const base64Data = await base64Promise;
      
      const payload = {
        name: uploadData.name,
        file_data: base64Data,
        file_name: uploadData.file.name,
        file_type: uploadData.file.type || uploadData.file.name.split('.').pop(),
        file_size: uploadData.file.size
      };
      
      console.log('[FRONTEND] Upload payload:', {
        name: payload.name,
        file_name: payload.file_name,
        file_type: payload.file_type,
        file_size: payload.file_size,
        file_data_length: payload.file_data?.length || 0,
        payload_keys: Object.keys(payload)
      });
      
      // Direct upload to bypass cache issues
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backy-production-a439.up.railway.app/api';
      const { getCookie } = await import('@/lib/cookies');
      const token = getCookie('token');
      const axios = (await import('axios')).default;
      
      console.log('[DIRECT UPLOAD] Backend URL:', backendUrl);
      console.log('[DIRECT UPLOAD] Payload size:', JSON.stringify(payload).length);
      
      const response = await axios.post(`${backendUrl}/documents`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        },
        timeout: 60000
      });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully and is now processing',
        type: 'success'
      });
      
      // Add to local state
      setDocuments([response.data.document, ...documents]);
      
      // Close modal and reset form
      setIsUploadModalOpen(false);
      setUploadData({ name: '', file: null });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <Button 
          className="bg-black hover:bg-gray-900 text-white"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Documents</h3>
            <span className="text-sm text-gray-500">{documents.length} documents</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading documents...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.length > 0 ? (
              documents.map(doc => (
                <li key={doc.id}>
                  <div className="px-4 py-4 flex items-center sm:px-6 hover:bg-gray-50">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <File className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-primary">{doc.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatFileSize(doc.file_size)} • 
                            Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                        <div className="flex space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${doc.status === 'processed' ? 'bg-green-100 text-green-800' : 
                              doc.status === 'failed' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {doc.status === 'processed' ? 'Processed' : 
                             doc.status === 'failed' ? 'Failed' : 'Processing...'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-5 sm:px-6 text-center">
                <p className="text-gray-500">No documents found. Upload documents to build your knowledge base.</p>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Document</h3>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => setIsUploadModalOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <form onSubmit={handleUploadSubmit}>
                      <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Document Name</label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={uploadData.name}
                          onChange={handleUploadChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          placeholder="Enter document name"
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label htmlFor="file" className="block text-sm font-medium text-gray-700">File</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="file"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="file"
                                  name="file"
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  onChange={handleUploadChange}
                                  required
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, TXT, or DOCX up to 10MB</p>
                            {uploadData.file && (
                              <p className="text-xs text-gray-700 bg-gray-100 p-1 rounded mt-2">
                                Selected: {uploadData.file.name} ({formatFileSize(uploadData.file.size)})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-black hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                      Uploading...
                    </>
                  ) : 'Upload'}
                </Button>
                <Button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 