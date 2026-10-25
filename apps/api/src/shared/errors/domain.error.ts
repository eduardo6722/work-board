export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
