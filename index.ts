import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/authentication";
// Load environment variables from .env file

dotenv.config();
const app = express();
app.use(
  cors({
    origin:process.env.FRONTEND_URL!,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies to be sent with requests
    optionsSuccessStatus: 200, // For legacy browser support
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "User-Agent",
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
//authentication routes
app.use("/api/user", router);

//port configuration
const PORT = process.env.PORT || 4000;
// Dummy route to test the server
app.get("/", (req, res) => {
  res.send("Welcome to the Learn In XR Backend!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
