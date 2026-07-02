import { defineConfig } from "vitest/config";

const coverageDirectory = process.env.COVERAGE_DIR ?? "coverage";
const junitOutputFile = process.env.JUNIT_REPORT ?? "reports/junit.xml";
const branchThreshold = Number(process.env.BRANCH_THRESHOLD ?? 70);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: coverageDirectory,
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/server.ts",
        "**/*.config.ts",
      ],
      thresholds: {
        branches: branchThreshold,
      },
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: junitOutputFile,
    },
  },
});
