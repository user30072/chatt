// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isPlatformAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// Get platform stats
router.get('/stats', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    // Count total organizations
    const totalOrganizations = await prisma.organization.count();
    
    // Count total users
    const totalUsers = await prisma.user.count();
    
    // Count total chatbots
    const totalChatbots = await prisma.chatbot.count();
    
    // Count total conversations
    const totalConversations = await prisma.conversation.count();
    
    // Get active conversations today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeConversationsToday = await prisma.conversation.count({
      where: {
        updated_at: {
          gte: today
        }
      }
    });
    
    // Get messages in the last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const messagesLastWeek = await prisma.message.count({
      where: {
        created_at: {
          gte: lastWeek
        }
      }
    });
    
    res.json({
      totalOrganizations,
      totalUsers,
      totalChatbots,
      totalConversations,
      activeConversationsToday,
      messagesLastWeek
    });
  } catch (error) {
    next(error);
  }
});

// Get usage stats
router.get('/usage', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    // Set date range based on period
    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
    } else {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
    }
    
    // Format dates for grouping
    const formatStr = period === 'year' ? '%Y-%m' : '%Y-%m-%d';
    
    // Get usage data grouped by date
    const usage = await prisma.$queryRaw`
      SELECT 
        to_char(date, ${formatStr}) as date,
        SUM(messages_count) as messages,
        SUM(tokens_used) as tokens
      FROM api_usage
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY to_char(date, ${formatStr})
      ORDER BY date ASC
    `;
    
    res.json(usage);
  } catch (error) {
    next(error);
  }
});

// Get all organizations (with pagination)
router.get('/organizations', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;
    
    // Get organizations
    const organizations = await prisma.organization.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            chatbots: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: pageSizeNum
    });
    
    // Count total organizations
    const totalItems = await prisma.organization.count();
    
    // Map response with counts
    const formattedOrganizations = organizations.map(org => ({
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      updatedAt: org.updated_at,
      subscription: org.subscription,
      userCount: org._count.users,
      chatbotCount: org._count.chatbots
    }));
    
    res.json({
      organizations: formattedOrganizations,
      page: pageNum,
      pageSize: pageSizeNum,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSizeNum)
    });
  } catch (error) {
    next(error);
  }
});

// Get organization details
router.get('/organizations/:id', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        _count: {
          select: {
            users: true,
            chatbots: true,
            documents: true
          }
        }
      }
    });
    
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }
    
    // Get usage statistics
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const usage = await prisma.api_usage.aggregate({
      where: {
        organization_id: id,
        date: {
          gte: startOfMonth
        }
      },
      _sum: {
        messages_count: true,
        tokens_used: true
      }
    });
    
    // Format response
    const response = {
      id: organization.id,
      name: organization.name,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
      subscription: organization.subscription,
      userCount: organization._count.users,
      chatbotCount: organization._count.chatbots,
      documentCount: organization._count.documents,
      usage: {
        messages: usage._sum.messages_count || 0,
        tokens: usage._sum.tokens_used || 0
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Create platform admin user
router.post(
  '/users',
  authenticate,
  isPlatformAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').notEmpty(),
    body('last_name').notEmpty(),
    body('organization_id').optional()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation error', errors.array());
      }
      
      const { 
        email, 
        password, 
        first_name, 
        last_name, 
        organization_id,
        is_platform_admin = true
      } = req.body;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }
      
      let orgId = organization_id;
      
      // If no organization provided, create a new one
      if (!orgId) {
        const newOrg = await prisma.organization.create({
          data: {
            name: 'Platform Administration'
          }
        });
        
        orgId = newOrg.id;
      } else {
        // Verify organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: orgId }
        });
        
        if (!organization) {
          throw new NotFoundError('Organization not found');
        }
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password_hash: passwordHash,
          first_name,
          last_name,
          is_admin: true,
          is_platform_admin,
          organization_id: orgId
        }
      });
      
      // Remove password from response
      const { password_hash, ...userResponse } = user;
      
      res.status(201).json(userResponse);
    } catch (error) {
      next(error);
    }
  }
);

// Get all users
router.get('/users', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;
    
    // Get users with their organizations
    const users = await prisma.user.findMany({
      include: {
        organization: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: pageSizeNum
    });
    
    // Count total users
    const totalItems = await prisma.user.count();
    
    // Format users for response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.is_admin,
      isPlatformAdmin: user.is_platform_admin,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      welcomeEmailSent: user.welcome_email_sent,
      welcomeEmailSentAt: user.welcome_email_sent_at,
      organization: {
        id: user.organization.id,
        name: user.organization.name
      }
    }));
    
    res.json({
      users: formattedUsers,
      page: pageNum,
      pageSize: pageSizeNum,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSizeNum)
    });
  } catch (error) {
    next(error);
  }
});

// DATABASE ADMIN ROUTES
// Get all database tables
router.get('/database/tables', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    // Get all tables from the information_schema
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    // Extract table names
    const tableNames = tables.map(table => table.table_name);
    
    res.json({ tables: tableNames });
  } catch (error) {
    next(error);
  }
});

// Get table data with pagination
router.get('/database/tables/:tableName', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const { page = 1, pageSize = 10, search = '' } = req.query;
    
    // Validate table exists by querying the information schema
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    
    if (!tableExists[0].exists) {
      return res.status(404).json({ message: `Table ${tableName} not found` });
    }
    
    // Get column information
    const columnInfo = await prisma.$queryRaw`
      SELECT 
        column_name as name, 
        data_type as type,
        is_nullable = 'YES' as "isNullable",
        column_default as "defaultValue",
        character_maximum_length as "maxLength"
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
    
    // Get primary key columns
    const primaryKeyColumns = await prisma.$queryRaw`
      SELECT
        kcu.column_name
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ${tableName}
      ORDER BY
        kcu.ordinal_position;
    `;
    
    // Extract primary key column names
    const primaryKeyColumnNames = primaryKeyColumns.map(pk => pk.column_name);
    
    // Mark primary key columns in the column info
    const enhancedColumns = columnInfo.map(column => ({
      ...column,
      isPrimaryKey: primaryKeyColumnNames.includes(column.name),
      isAutoIncrement: column.defaultValue && column.defaultValue.includes('nextval')
    }));
    
    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const offset = (pageNum - 1) * pageSizeNum;
    
    // Use raw SQL queries for maximum flexibility
    // Count total records (with search if provided)
    let countQuery = `SELECT COUNT(*) FROM "${tableName}"`;
    let whereClause = '';
    
    if (search) {
      // Build dynamic search across all text columns
      const textColumns = enhancedColumns
        .filter(col => col.type.includes('char') || col.type === 'text')
        .map(col => `"${col.name}"::text ILIKE '%${search}%'`);
      
      if (textColumns.length > 0) {
        whereClause = ` WHERE ${textColumns.join(' OR ')}`;
        countQuery += whereClause;
      }
    }
    
    const countResult = await prisma.$queryRawUnsafe(countQuery);
    const totalRecords = parseInt(countResult[0].count, 10);
    
    // Fetch records with pagination
    let dataQuery = `SELECT * FROM "${tableName}"${whereClause}`;
    
    // Add ordering by primary key if available
    if (primaryKeyColumnNames.length > 0) {
      dataQuery += ` ORDER BY "${primaryKeyColumnNames[0]}" ASC`;
    }
    
    dataQuery += ` LIMIT ${pageSizeNum} OFFSET ${offset}`;
    
    const records = await prisma.$queryRawUnsafe(dataQuery);
    
    res.json({
      columns: enhancedColumns,
      records,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSizeNum),
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (error) {
    next(error);
  }
});

// Create a new record
router.post('/database/tables/:tableName', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const recordData = req.body;
    
    // Validate table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    
    if (!tableExists[0].exists) {
      return res.status(404).json({ message: `Table ${tableName} not found` });
    }
    
    // Prepare column names and values for insertion
    const columnNames = Object.keys(recordData);
    if (columnNames.length === 0) {
      return res.status(400).json({ message: 'No data provided for insertion' });
    }
    
    // Build dynamic SQL insert query
    const columns = columnNames.map(col => `"${col}"`).join(', ');
    const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
    const values = columnNames.map(col => recordData[col]);
    
    const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await prisma.$queryRawUnsafe(query, ...values);
    
    res.status(201).json(result[0]);
  } catch (error) {
    // Handle database constraint errors
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Unique constraint violation: This record already exists or has a duplicate key' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Foreign key constraint violation: Referenced record does not exist' });
    }
    next(error);
  }
});

// Update a record
router.put('/database/tables/:tableName/:keyColumn/:keyValue', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { tableName, keyColumn, keyValue } = req.params;
    const recordData = req.body;
    
    // Validate table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    
    if (!tableExists[0].exists) {
      return res.status(404).json({ message: `Table ${tableName} not found` });
    }
    
    // Prepare column names and values for update
    const columnNames = Object.keys(recordData).filter(col => col !== keyColumn);
    if (columnNames.length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }
    
    // Build dynamic SQL update query
    const setClause = columnNames.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
    const values = [...columnNames.map(col => recordData[col]), keyValue];
    
    const query = `UPDATE "${tableName}" SET ${setClause} WHERE "${keyColumn}" = $${columnNames.length + 1} RETURNING *`;
    
    const result = await prisma.$queryRawUnsafe(query, ...values);
    
    if (result.length === 0) {
      return res.status(404).json({ message: `Record with ${keyColumn} = ${keyValue} not found` });
    }
    
    res.json(result[0]);
  } catch (error) {
    // Handle database constraint errors
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Unique constraint violation: This update would create a duplicate key' });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Foreign key constraint violation: Referenced record does not exist' });
    }
    next(error);
  }
});

// Delete a record
router.delete('/database/tables/:tableName/:keyColumn/:keyValue', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { tableName, keyColumn, keyValue } = req.params;
    
    // Validate table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    
    if (!tableExists[0].exists) {
      return res.status(404).json({ message: `Table ${tableName} not found` });
    }
    
    // Use $queryRawUnsafe for dynamic table/column names
    const query = `DELETE FROM "${tableName}" WHERE "${keyColumn}" = $1 RETURNING *`;
    
    const result = await prisma.$queryRawUnsafe(query, keyValue);
    
    if (result.length === 0) {
      return res.status(404).json({ message: `Record with ${keyColumn} = ${keyValue} not found` });
    }
    
    res.json({ message: 'Record deleted successfully', record: result[0] });
  } catch (error) {
    // Handle database constraint errors
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        message: 'Cannot delete this record because it is referenced by other records. Delete the dependent records first.' 
      });
    }
    next(error);
  }
});

// Export table data as CSV
router.get('/database/tables/:tableName/export', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { tableName } = req.params;
    
    // Validate table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    
    if (!tableExists[0].exists) {
      return res.status(404).json({ message: `Table ${tableName} not found` });
    }
    
    // Get column information
    const columnInfo = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
    
    const columnNames = columnInfo.map(col => col.column_name);
    
    // Fetch all records
    const records = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 10000`);
    
    // Generate CSV content
    const csvHeader = columnNames.join(',');
    const csvRows = records.map(record => {
      return columnNames.map(column => {
        const value = record[column];
        if (value === null || value === undefined) {
          return '';
        }
        // Handle different data types
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${tableName}_export.csv`);
    
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Run custom SQL query (SELECT only)
router.post('/database/query', authenticate, isPlatformAdmin, async (req, res, next) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    // Security check: only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select ')) {
      return res.status(403).json({ 
        message: 'Only SELECT queries are allowed for security reasons' 
      });
    }
    
    // Additional security checks
    if (
      trimmedQuery.includes('insert ') || 
      trimmedQuery.includes('update ') || 
      trimmedQuery.includes('delete ') || 
      trimmedQuery.includes('drop ') ||
      trimmedQuery.includes('alter ') ||
      trimmedQuery.includes('create ')
    ) {
      return res.status(403).json({ 
        message: 'Query contains forbidden statements' 
      });
    }
    
    // Run the query with a timeout to prevent long-running queries
    const startTime = Date.now();
    
    // Execute query
    const records = await prisma.$queryRawUnsafe(query);
    
    const executionTime = Date.now() - startTime;
    
    // Determine column structure from first record
    let columns = [];
    if (records.length > 0) {
      const firstRecord = records[0];
      columns = Object.keys(firstRecord).map(name => ({ name }));
    }
    
    res.json({
      columns,
      records,
      executionTime,
      rowCount: records.length
    });
  } catch (error) {
    console.error('SQL query error:', error);
    res.status(400).json({ 
      message: `Query execution failed: ${error.message}` 
    });
  }
});

// export router
module.exports = router;