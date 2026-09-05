export class PostInputError extends Error {
  readonly status = 400;
}

export class PostConflictError extends Error {
  readonly status = 409;
}
