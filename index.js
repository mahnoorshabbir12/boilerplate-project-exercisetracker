const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // ✅ Ensure req.body is parsed

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// model

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST /api/users
const createUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is compulsory" });
    }
    const user = await User.create({ username });
    if (!user) {
      return res.status(400).json({ error: "User not created" });
    }
    res.status(200).json({
      username: user.username,
      _id: user._id,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "User creation failed..." });
  }
};

// GET /api/users
const findAllUsers = async (req, res) => {
  const findUser = await User.find({});
  if (!findUser) {
    return res.status(400).json({ error: "couldn't find the user" });
  }
  res.status(200).json(findUser);
};

// POST /api/users/:_id/exercises
const exerciseRouteWithoutLog = async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    const { description, duration, date } = req.body;

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const exercise = await Exercise.create({
      userId: _id,
      description,
      duration: parseInt(duration), // ✅ Ensure number
      date: date ? new Date(date) : new Date()
    });

    res.status(200).json({
      _id: user._id,
      username: user.username,
      description,
      duration: parseInt(duration), 
      date: new Date(date ? date : Date.now()).toDateString() 
    });
  } catch (error) {
    res.status(400).json({ error: "Operation failed.." });
  }
};

// GET /api/users/:_id/logs
const exerciseRouteWithLog = async (req, res) => {
  try {
    const { _id } = req.params;
    console.log(" _id param:", _id);

    const user = await User.findById(_id);
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ error: "User not found" });
    }

    const { from, to, limit } = req.query;
    console.log("Query params:", { from, to, limit });

    const matchQuery = {
      userId: new mongoose.Types.ObjectId(_id),
    };

    if (from || to) {
      matchQuery.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) throw new Error("Invalid 'from' date");
        matchQuery.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) throw new Error("Invalid 'to' date");
        matchQuery.date.$lte = toDate;
      }
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $project: {
          _id: 0,
          description: 1,
          duration: 1,
          date: 1
        },
      },
    ];

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit)) throw new Error("Invalid limit");
      pipeline.push({ $limit: parsedLimit });
    }

    const logs = await Exercise.aggregate(pipeline);
    console.log("Logs:", logs);
    const formattedLogs = logs.map(log => ({
  description: log.description,
  duration: log.duration,
  date: new Date(log.date).toDateString(),
}));

    res.status(200).json({
  _id: user._id,
  username: user.username,
  count: formattedLogs.length,
  log: formattedLogs,
});
  } catch (error) {
    console.error("Error in exerciseRouteWithLog:", error.message);
    res.status(400).json({ error: "Operation failed.." });
  }
};

app.post("/api/users", createUser);
app.get("/api/users", findAllUsers);
app.post("/api/users/:_id/exercises", exerciseRouteWithoutLog);
app.get("/api/users/:_id/logs", exerciseRouteWithLog);

// Listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
