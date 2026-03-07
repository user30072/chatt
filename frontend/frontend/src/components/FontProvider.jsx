'use client';

import { useEffect } from 'react';

export default function FontProvider() {
  useEffect(() => {
    // Apply Roboto font
    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: 'Roboto' !important;
      }
      
      html, body, div, span, applet, object, iframe,
      h1, h2, h3, h4, h5, h6, p, blockquote, pre,
      a, abbr, acronym, address, big, cite, code,
      del, dfn, em, img, ins, kbd, q, s, samp,
      small, strike, strong, sub, sup, tt, var,
      b, u, i, center,
      dl, dt, dd, ol, ul, li,
      fieldset, form, label, legend,
      table, caption, tbody, tfoot, thead, tr, th, td,
      article, aside, canvas, details, embed, 
      figure, figcaption, footer, header, hgroup, 
      menu, nav, output, ruby, section, summary,
      time, mark, audio, video, button, input, textarea, select {
        font-family: 'Roboto' !important;
      }
    `;
    document.head.appendChild(style);
    
    // Add a more robust Roboto import just to be sure
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(linkElement);
    
    return () => {
      document.head.removeChild(style);
      document.head.removeChild(linkElement);
    };
  }, []);
  
  return null; // This component doesn't render anything
} 