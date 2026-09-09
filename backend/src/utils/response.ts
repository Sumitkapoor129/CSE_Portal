export const successResponse = <T>(data: T, message?: string) => ({
  success: true,
  ...(message && { message }),
  data,
});

export const errorResponse = (message: string, statusCode: number = 400) => ({
  success: false,
  message,
  statusCode,
});
