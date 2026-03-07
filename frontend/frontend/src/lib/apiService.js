// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiService = {
  /**
   * Upload a document to the server
   * @param {File} file - The file to upload
   * @returns {Promise<object>} - The response data 
   */
  async uploadDocument(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
        // No need to set Content-Type as it's automatically set with FormData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },
  
  /**
   * Query a document based on document ID
   * @param {string} documentId - The ID of the document to query
   * @param {string} query - The query text
   * @returns {Promise<object>} - The query response
   */
  async queryDocument(documentId, query) {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Query failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error querying document:', error);
      throw error;
    }
  },
  
  /**
   * Get a list of all documents
   * @returns {Promise<Array>} - List of documents
   */
  async getDocuments() {
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch documents: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }
};

export default apiService; 