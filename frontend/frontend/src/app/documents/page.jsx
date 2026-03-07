import { TestUploadComponent } from "@/components/TestUploadComponent";

export const metadata = {
  title: "Document Management",
  description: "Upload and query documents using AI",
};

export default function DocumentsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Document Management</h1>
      <p className="text-muted-foreground mb-8">
        Upload documents and ask questions about their content using AI.
      </p>
      <TestUploadComponent />
    </div>
  );
} 