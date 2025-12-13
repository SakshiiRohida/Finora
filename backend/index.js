require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const simulatorRoutes = require("./routes/simulatorRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const historyRoutes = require("./routes/historyRoutes");
const timeTravelRoutes = require("./routes/timeTravelRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const questsRoutes = require("./routes/questRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

const corsOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = corsOrigins.length
  ? { origin: corsOrigins, credentials: true }
  : { origin: "*" };

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Sampaket finance backend is running without auth" });
});

app.use("/api/sim", simulatorRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/time-travel", timeTravelRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/quests", questsRoutes);
app.use("/api/profile", profileRoutes);

const clientBuildDir = path.join(__dirname, "../frontend/dist");
const hasClientBuild = fs.existsSync(clientBuildDir);

if (hasClientBuild) {
  app.use(express.static(clientBuildDir));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientBuildDir, "index.html"));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("[express] unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
