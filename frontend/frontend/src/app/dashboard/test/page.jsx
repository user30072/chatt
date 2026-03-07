'use client';

import TestUploadComponent from '../test-upload';

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Document Upload & RAG Testing</h1>
      <TestUploadComponent />
    </div>
  );
} 