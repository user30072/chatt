'use client';

import { useState } from 'react';
import PageTemplate from '@/components/landing/PageTemplate';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '',
    message: ''
  });
  
  const [status, setStatus] = useState({
    submitted: false,
    submitting: false,
    info: { error: false, msg: null }
  });

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus(prevStatus => ({ ...prevStatus, submitting: true }));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const text = await res.text();
      
      if (res.status === 200) {
        setStatus({
          submitted: true,
          submitting: false,
          info: { error: false, msg: 'Message sent successfully!' }
        });
        setFormData({
          name: '',
          email: '',
          businessName: '',
          phone: '',
          message: ''
        });
      } else {
        setStatus({
          submitted: false,
          submitting: false,
          info: { error: true, msg: text || 'Something went wrong. Please try again later.' }
        });
      }
    } catch (error) {
      setStatus({
        submitted: false,
        submitting: false,
        info: { error: true, msg: 'Something went wrong. Please try again later.' }
      });
    }
  };

  return (
    <PageTemplate title="Contact Us">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Get in Touch</h1>
        <p className="text-gray-300 mb-8">
          Have questions or feedback? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
        </p>

        {status.submitted ? (
          <div className="bg-green-900/50 border border-green-500 text-green-100 px-6 py-8 rounded-xl mb-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p>Your message has been sent successfully. We'll get back to you soon.</p>
            <button
              onClick={() => setStatus({ submitted: false, submitting: false, info: { error: false, msg: null } })}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl">
            <div className="mb-6">
              <label htmlFor="name" className="block mb-2 font-medium">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="businessName" className="block mb-2 font-medium">
                Business Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="businessName"
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="email" className="block mb-2 font-medium">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block mb-2 font-medium">
                  Phone Number <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="message" className="block mb-2 font-medium">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={status.submitting}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors ${
                  status.submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {status.submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
            
            {status.info.error && (
              <div className="mt-4 bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg">
                {status.info.msg}
              </div>
            )}
          </form>
        )}
      </div>
    </PageTemplate>
  );
} 