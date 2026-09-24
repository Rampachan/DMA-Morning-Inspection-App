import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@users/(.*)$': '<rootDir>/src/users/$1',
    '^@ulb/(.*)$': '<rootDir>/src/ulb/$1',
    '^@geo/(.*)$': '<rootDir>/src/geo/$1',
    '^@photo/(.*)$': '<rootDir>/src/photo/$1',
    '^@submission/(.*)$': '<rootDir>/src/submission/$1',
    '^@notifications/(.*)$': '<rootDir>/src/notifications/$1',
    '^@tasks/(.*)$': '<rootDir>/src/tasks/$1',
    '^@reports/(.*)$': '<rootDir>/src/reports/$1',
    '^@audit-log/(.*)$': '<rootDir>/src/audit-log/$1',
    '^@inspection-category/(.*)$': '<rootDir>/src/inspection-category/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

export default config;
