'use client';

import { useState, useEffect } from 'react';
import { CopyIcon, CheckIcon, CodeIcon, RefreshIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function WebsiteIntegration({ chatbotId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [integration, setIntegration] = useState(null);
  
  useEffect(() => {
    async function loadIntegration() {
      try {
        setLoading(true);
        const response = await api.getWebsiteIntegration(chatbotId);
        setIntegration(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading integration:', error);
        showToast('Failed to load integration settings', 'error');
        setLoading(false);
      }
    }
    
    if (chatbotId) {
      loadIntegration();
    }
  }, [chatbotId, showToast]);
  
  const handleCopy = () => {
    if (!integration) return;
    
    const scriptTag = `<script id="ai-chatbot-script" src="${process.env.NEXT_PUBLIC_WIDGET_URL || '/widget.js'}" data-chatbot-id="${chatbotId}" data-api-key="${integration.api_key}"></script>`;
    
    navigator.clipboard.writeText(scriptTag)
      .then(() => {
        setCopied(true);
        showToast('Code copied to clipboard', 'success');
        
        setTimeout(() => {
          setCopied(false);
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy code', 'error');
      });
  };
  
  const handleRegenerateKey = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? This will invalidate your current key and require updating the script on your website.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.post(`/chatbots/${chatbotId}/integration/regenerate-key`);
      setIntegration(response.data);
      showToast('API key regenerated successfully', 'success');
      setLoading(false);
    } catch (error) {
      console.error('Error regenerating API key:', error);
      showToast('Failed to regenerate API key', 'error');
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
    </div>;
  }
  
  if (!integration) {
    return <div className="p-6 text-center text-gray-500">
      Integration information not available
    </div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Website Integration</h3>
        <Button 
          onClick={handleRegenerateKey}
          variant="outline"
          className="flex items-center text-sm"
          size="sm"
        >
          <RefreshIcon className="mr-1 h-4 w-4" />
          Regenerate Key
        </Button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <CodeIcon className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm font-medium">Installation Script</span>
          </div>
          <Button 
            onClick={handleCopy} 
            variant="ghost" 
            size="sm"
            className="text-sm flex items-center"
          >
            {copied ? (
              <>
                <CheckIcon className="mr-1 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="mr-1 h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
        </div>
        
        <pre className="bg-gray-800 text-white p-3 rounded text-sm overflow-x-auto">
          {`<script id="ai-chatbot-script" src="${process.env.NEXT_PUBLIC_WIDGET_URL || '/widget.js'}" data-chatbot-id="${chatbotId}" data-api-key="${integration.api_key}"></script>`}
        </pre>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Add this script to the bottom of your HTML body tag to enable the chatbot on your website.</p>
      </div>
    </div>
  );
}