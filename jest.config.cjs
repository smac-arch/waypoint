module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@craftzdog/react-native-buffer$': '<rootDir>/__mocks__/buffer.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/netinfo.ts',
    '^react-native-quick-crypto$': '<rootDir>/__mocks__/quick-crypto.ts',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageDirectory: 'coverage',
};
