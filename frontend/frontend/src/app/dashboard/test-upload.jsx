'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
// Inline Label component since file might be missing
const Label = ({ children, htmlFor, className = '', ...props }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium ${className}`} {...props}>
    {children}
  </label>
);
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import apiService from '@/lib/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
// Simple toast implementation for now
const toast = { 
  error: (msg) => console.error(msg) || alert(msg), 
  success: (msg) => console.log(msg) || alert(msg)
};

export default function TestUploadComponent() {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [queryResult, setQueryResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.uploadDocument(formData);
      
      setUploadResult({
        success: true,
        document: response.data
      });
      
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        error: error.response?.data?.message || 'Error uploading document'
      });
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (!uploadResult?.document?.id) {
      toast.error('Please upload a document first');
      return;
    }

    setLoading(true);
    setQueryResult(null);
    
    try {
      const response = await apiService.apiClient.post('/api/chatbots/test-query', {
        query: query,
        document_ids: [uploadResult.document.id]
      });
      
      setQueryResult({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('Query error:', error);
      setQueryResult({
        success: false,
        error: error.response?.data?.message || 'Error processing query'
      });
      toast.error('Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Upload a PDF document to test document processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="document">Document</Label>
            <Input id="document" type="file" accept=".pdf" onChange={handleFileChange} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload'}
          </Button>
        </CardFooter>
      </Card>

      {uploadResult && (
        <Card className={uploadResult.success ? "border-green-200" : "border-red-200"}>
          <CardHeader>
            <CardTitle className="flex items-center">
              {uploadResult.success ? 
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> : 
                <XCircle className="mr-2 h-5 w-5 text-red-500" />}
              Upload Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult.success ? (
              <div>
                <p className="font-medium">Document uploaded successfully</p>
                <p>ID: {uploadResult.document.id}</p>
                <p>Name: {uploadResult.document.name}</p>
                <p>Status: {uploadResult.document.status}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-red-500">Upload failed</p>
                <p>{uploadResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult?.success && (
        <Card>
          <CardHeader>
            <CardTitle>Test RAG Query</CardTitle>
            <CardDescription>Test querying the uploaded document</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="query">Query</Label>
              <Textarea 
                id="query" 
                placeholder="Enter your query here..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleQuery} disabled={loading || !query.trim()}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Submit Query'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {queryResult && (
        <Card className={queryResult.success ? "border-green-200" : "border-red-200"}>
          <CardHeader>
            <CardTitle className="flex items-center">
              {queryResult.success ? 
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> : 
                <XCircle className="mr-2 h-5 w-5 text-red-500" />}
              Query Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queryResult.success ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Response:</h3>
                  <p className="whitespace-pre-wrap mt-1 p-3 bg-gray-50 rounded-md">{queryResult.data.message}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Tokens Used:</h3>
                  <p>{queryResult.data.tokens_used}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Documents Used:</h3>
                  <ul className="list-disc pl-5">
                    {queryResult.data.documents_used.map((doc, index) => (
                      <li key={index}>{doc.name || doc.id}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium text-red-500">Query failed</p>
                <p>{queryResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 