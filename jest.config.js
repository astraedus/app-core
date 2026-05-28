/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: {
          // Only type-check test files, not source files (source is consumed via Metro)
          ignoreDiagnostics: [
            2307, // Cannot find module (dynamic imports like expo-auth-session)
            2339, // Property does not exist (AsyncStorage multiGet/multiSet in v3 types)
          ],
        },
      },
    ],
  },
};
