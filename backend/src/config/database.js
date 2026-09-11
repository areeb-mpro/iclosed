const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty'
});

// Handle database connection errors
prisma.$on('error', (e) => {
  console.error('Database error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Database warning:', e);
});

prisma.$on('info', (e) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database info:', e);
  }
});

module.exports = prisma;
