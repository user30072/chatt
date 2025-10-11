/**
 * Middleware to validate authentication data
 */
const validateAuth = (req, res, next) => {
  const { email, password } = req.body;
  
  // Validate email
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  // Validate password for signup
  if (req.path === '/signup') {
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Validate username for signup (replacing organization name)
    const { username, firstName, lastName } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        message: 'Username format invalid. Use only letters, numbers, underscore and hyphen (3-20 chars)'
      });
    }
    
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
  }
  
  // Validate password for login
  if (req.path === '/login') {
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
  }
  
  next();
};

/**
 * Middleware to validate chatbot data
 */
const validateChatbot = (req, res, next) => {
  const { name, prompt_template, system_message } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Chatbot name is required' });
  }
  
  if (!prompt_template) {
    return res.status(400).json({ message: 'Prompt template is required' });
  }
  
  if (!system_message) {
    return res.status(400).json({ message: 'System message is required' });
  }
  
  next();
};

/**
 * Middleware to validate document data
 */
const validateDocument = (req, res, next) => {
  const { name, file_type } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Document name is required' });
  }
  
  if (!file_type) {
    return res.status(400).json({ message: 'File type is required' });
  }
  
  if (!req.file && !req.body.file_url) {
    return res.status(400).json({ message: 'File or file URL is required' });
  }
  
  next();
};

/**
 * Helper function to validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  validateAuth,
  validateChatbot,
  validateDocument
}; 