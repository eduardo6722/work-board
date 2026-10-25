import { DomainError } from "../../../shared/errors/domain.error";

export class BoardUnavailableError extends DomainError {
  constructor(message: string) {
    super(message, "BOARD_UNAVAILABLE", 503);
  }
}
