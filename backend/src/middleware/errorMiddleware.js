function errorMiddleware(error, req, res, next) {
  console.error(error);

  return res.status(500).json({
    message: "Internal server error",
  });
}

module.exports = errorMiddleware;
