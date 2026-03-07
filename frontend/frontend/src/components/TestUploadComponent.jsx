"use client";

import { useState, useEffect } from 'react';
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";
import apiService from '@/lib/api';

// Inline Label component
const Label = ({ children, htmlFor, className = '', ...props }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium ${className}`} {...props}>
    {children}
  </label>
);

// Inline Select components as they might be missing
const Select = ({ children, value, onValueChange, ...props }) => (
  <div className="relative" {...props}>{children}</div>
);
const SelectTrigger = ({ children, className, ...props }) => (
  <div className={`border p-2 rounded flex justify-between items-center cursor-pointer ${className}`} {...props}>
    {children}
  </div>
);
const SelectValue = ({ children, placeholder, ...props }) => (
  <span {...props}>{children || placeholder}</span>
);
const SelectContent = ({ children, ...props }) => (
  <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg" {...props}>{children}</div>
);
const SelectItem = ({ children, value, disabled, ...props }) => (
  <div className={`p-2 hover:bg-gray-100 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>
    {children}
  </div>
);

// Simple toast implementation for now
const toast = { 
  error: (msg) => console.error(msg) || alert(msg), 
  success: (msg) => console.log(msg) || alert(msg),
  warning: (msg) => console.warn(msg) || alert(msg)
};

export function TestUploadComponent() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [querying, setQuerying] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [uploadSuccess]);

  const fetchDocuments = async () => {
    try {
      const docsData = await apiService.getDocuments();
      setDocuments(docsData.documents || []);
    } catch (error) {
      toast.error("Failed to fetch documents");
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      const result = await apiService.uploadDocument(file);
      toast.success("Document uploaded successfully!");
      setFile(null);
      setUploadSuccess(prev => !prev); // Toggle to trigger useEffect
    } catch (error) {
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!selectedDocument) {
      toast.warning("Please select a document first");
      return;
    }

    if (!query.trim()) {
      toast.warning("Please enter a query");
      return;
    }

    setQuerying(true);
    setAnswer("");
    
    try {
      const result = await apiService.queryDocument(selectedDocument, query);
      setAnswer(result.answer || "No answer found");
    } catch (error) {
      toast.error(error.message || "Query failed");
      setAnswer("Error: Failed to get an answer");
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or TXT files to query later
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Document File</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".pdf,.docx,.txt" 
              onChange={handleFileChange} 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : "Upload Document"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ask Questions</CardTitle>
          <CardDescription>
            Select a document and ask questions about its content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="document">Select Document</Label>
            <Select 
              value={selectedDocument} 
              onValueChange={setSelectedDocument}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                {documents.length === 0 ? (
                  <SelectItem value="none" disabled>No documents available</SelectItem>
                ) : (
                  documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.filename}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="query">Your Question</Label>
            <Textarea
              id="query"
              placeholder="Ask something about the document..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleQuery} 
            disabled={!selectedDocument || !query.trim() || querying}
          >
            {querying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : "Ask Question"}
          </Button>

          {answer && (
            <div className="mt-4 space-y-2">
              <Label>Answer</Label>
              <div className="rounded-md border bg-muted p-4">
                <p className="whitespace-pre-wrap">{answer}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

 