const asyncHandler = (fn) => async (req, resp, next) => {
  try {
    await fn(req, resp, next);
  } catch (error) {
    resp.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export { asyncHandler };
