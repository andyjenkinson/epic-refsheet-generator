module.exports = {
  testEnvironment: 'node',
  //setupFilesAfterEnv: ['./epic-armageddon/js/setupTests.js', './legions-imperialis/js/setupTests.js'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};