export class PostInputError extends Error {
  readonly expose = true;
  readonly status = 400;
}

export class PostConflictError extends Error {
  readonly expose = true;
  readonly status = 409;
}
