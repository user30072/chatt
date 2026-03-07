// Script to verify import paths before building
const fs = require('fs');
const path = require('path');

console.log('Verifying import paths...');

// Verify the dashboard layout imports
const layoutPath = path.join(__dirname, 'src/app/dashboard/layout.jsx');

if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // Check for potentially problematic imports
  if (layoutContent.includes('@/components/dashboard/')) {
    console.error('❌ Error: layout.jsx contains @/components/dashboard/ imports, but these components are in app/dashboard/');
    console.log('Fixing import paths...');
    
    const fixedContent = layoutContent
      .replace(/import\s+(\w+)\s+from\s+['"]@\/components\/dashboard\/(\w+)['"]/g, 
               "import $1 from './$2'");
    
    fs.writeFileSync(layoutPath, fixedContent, 'utf8');
    console.log('✅ Fixed dashboard layout imports');
  } else {
    console.log('✅ Dashboard layout imports look good');
  }
} else {
  console.log('⚠️ Warning: Could not find dashboard layout file');
}

// Check for other common issues
const componentsToVerify = [
  { importPath: '@/components/ui/Loading', filePath: 'src/components/ui/Loading.jsx' },
  { importPath: '@/components/ui/Button', filePath: 'src/components/ui/Button.jsx' }
];

componentsToVerify.forEach(component => {
  const componentPath = path.join(__dirname, component.filePath);
  if (!fs.existsSync(componentPath)) {
    console.error(`❌ Error: ${component.importPath} is imported but ${component.filePath} does not exist`);
  } else {
    console.log(`✅ Verified ${component.importPath}`);
  }
});

console.log('Import verification complete!'); 