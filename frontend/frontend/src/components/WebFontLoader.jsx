'use client';

import { useEffect } from 'react';

export default function WebFontLoader() {
  useEffect(() => {
    // Dynamically load the WebFont loader script
    const loadWebFontLoader = () => {
      const script = document.createElement('script');
      script.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
      script.async = true;
      
      script.onload = () => {
        // Once the script is loaded, load Roboto
        window.WebFont.load({
          google: {
            families: ['Roboto:300,400,500,700']
          },
          active: () => {
            // Force apply Roboto to all elements
            const robotoStyle = document.createElement('style');
            robotoStyle.textContent = `
              * {
                font-family: 'Roboto' !important;
              }
            `;
            document.head.appendChild(robotoStyle);
          },
          inactive: () => {
            // Font loading failed, but we'll continue silently
          }
        });
      };
      
      document.head.appendChild(script);
    };
    
    loadWebFontLoader();
    
    // No cleanup needed since we want the fonts to remain
  }, []);
  
  return null;
} 