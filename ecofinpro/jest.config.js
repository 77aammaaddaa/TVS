/**
 * Jest Configuration for EcoFine Pro
 * مكتبة الاختبارات الشاملة لنظام إيكو فاين
 */

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!dist/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
  testTimeout: 10000,
  globals: {
    React: true,
  },
};
