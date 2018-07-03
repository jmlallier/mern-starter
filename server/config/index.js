const config = {
  server: {
    mongoURL: process.env.MONGO_URL || "mongodb://localhost:27017/mern",
    port: process.env.PORT || 8000
  },
  auth: {
    secret:
      process.env.NODE_ENV === "production" ? process.env.SECRET : "secret"
  }
};

module.exports = config;
