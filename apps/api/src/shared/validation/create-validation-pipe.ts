import { BadRequestException, StandardSchemaValidationPipe } from "@nestjs/common";
import { type StandardSchemaV1 } from "@standard-schema/spec";

export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues: readonly StandardSchemaV1.Issue[]) => {
      return new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: issues.map((issue) => ({
          path: Array.isArray(issue.path)
            ? issue.path.map((segment) => String(segment)).join(".")
            : "",
          message: issue.message,
        })),
      });
    },
  });
}
