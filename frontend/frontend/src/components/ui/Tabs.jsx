import React, { createContext, useContext, useState } from 'react';

// Create context
const TabsContext = createContext(null);

export function Tabs({ 
  defaultValue, 
  value,
  onValueChange,
  className = '',
  children, 
  ...props 
}) {
  const [selectedTab, setSelectedTab] = useState(value || defaultValue || '');
  
  const handleValueChange = (newValue) => {
    setSelectedTab(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <TabsContext.Provider value={{ value: value || selectedTab, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ 
  className = '',
  children, 
  ...props 
}) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ 
  value,
  className = '',
  children, 
  ...props 
}) {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isActive = selectedValue === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${isActive 
          ? 'bg-background text-foreground shadow-sm' 
          : 'hover:bg-background/50 hover:text-foreground'
        } 
        ${className}`}
      onClick={() => onValueChange(value)}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ 
  value,
  className = '',
  children, 
  ...props 
}) {
  const { value: selectedValue } = useContext(TabsContext);
  const isActive = selectedValue === value;
  
  if (!isActive) return null;
  
  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    >
      {children}
    </div>
  );
} 