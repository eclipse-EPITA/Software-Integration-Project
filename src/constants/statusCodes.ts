export const statusCodes = {
  success: 200,
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  serverError: 500,
  queryError: 500,
  userAlreadyExists: 409
} as const;

export const badGateway = 502; 