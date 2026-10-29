const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Grab the token from the frontend's request headers
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied." });
  }

  try {
    // Unpack the token using your secret key
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_for_development",
    );

    // Attach the unpacked data (which contains the user's ID) to req.user
    req.user = decoded;

    // Move on to the actual route
    next();
  } catch (err) {
    res.status(401).json({ error: "Token is not valid." });
  }
};
