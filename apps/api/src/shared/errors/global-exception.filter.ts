import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { type Response } from "express";

import { apiErrorSchema, type ApiError } from "@repo/contracts";

import { DomainError } from "./domain.error";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const payload = this.toApiError(exception);
    response.status(payload.statusCode).json(payload);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.httpStatus,
        error: HttpStatus[exception.httpStatus] ?? "Error",
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const parsed = apiErrorSchema.safeParse(body);
      if (parsed.success) {
        return parsed.data;
      }
      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : exception.message;
      return {
        statusCode: status,
        error: HttpStatus[status] ?? "Error",
        code: "HTTP_EXCEPTION",
        message,
      };
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }
}
