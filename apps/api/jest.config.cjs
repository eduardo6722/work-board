/** @type {import("jest").Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            decoratorMetadata: true,
            legacyDecorator: true,
          },
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!.*(@nestjs|@prisma|uid|load-esm|file-type|token-types|strtok3|peek-readable|@standard-schema)/)",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/generated/**", "!src/main.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "/node_modules/",
    "src/modules/board/infrastructure/persistence/repositories/prisma-board.repository.spec.ts",
  ],
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  moduleNameMapper: {
    "^@repo/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
  },
};
