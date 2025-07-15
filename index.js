const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const router = express.Router();
app.use(router);
const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// model

app.use(express.urlencoded({ extended: true }));
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
const createUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
  return res.status(400).json({ error: "Username is compulsory" });
}
    const user = await User.create({
      username,
    });
    if (!user) {
      res.status(400).json({arror : "User not found..."});
    }
    const _id = user._id;
    res.status(200).json({
      username,
      _id,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({error : "User creation failed..."});
    throw error;
  }
};
const findAllUsers = async (req, res) => {
  const findUser = await User.find({});
  if(!findUser){
    return res.status(400).json({ error: "couldn't find the user" });
  }
  res.status(200).json({
    users: findUser,
  });
};
const exerciseRouteWithoutLog = async (req,res) => {
  try {
    const {_id} = req.params;
    const user = await User.findOne({_id});
    const {description, duration, date} = req.body
    const exercise = await Exercise.create({
      userId : _id,
      description,
      duration,
      date : date.toDateString()
    });
    if(!user){
      return res.status(400).json({ error: "User not found" });
    }
    res.status(200)
    .json({
      user,
      exercise
    });
  } catch (error) {
    res.status(400)
    .json({error : "Operation failed.."});
  }
}
const exerciseRouteWithLog = async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let { description, duration, date } = req.body;
    if (!description) {
      return res.status(400).json({ error: "description not found" });
    }
    if (!duration) {
      return res.status(400).json({ error: "duration not found" });
    }
    if (!date) {
      date = new Date();
    }

    const exercise = await Exercise.create({
      userId: _id,
      description,
      duration,
      date: date.toDateString(),
    });

    const count = await Exercise.countDocuments({ userId: _id });

    const { from, to, limit } = req.query;

    const UserID = {
      userId: mongoose.Types.ObjectId(_id),
    };

    if (from || to) {
      UserID.date = {};
      if (from) UserID.date.$gte = new Date(from);
      if (to) UserID.date.$lte = new Date(to);
    }

    let pipeline = [
      { $match: UserID },
      {
        $project: {
          _id: 0,
          description: 1,
          duration: 1,
          date: {
            $dateToString: {
              format: "%a %b %d %Y",
              date: "$date",
            },
          },
        },
      },
    ];

    if (limit) {
      pipeline.push({ $limit: parseInt(limit) });
    }

    const logs = await Exercise.aggregate(pipeline);

    res.status(200).json({
      user,
      exercise,
      count,
      log: logs,
    });
  } catch (error) {
    res.status(400).json({ error: "Operation failed.." });
  }
};


// router

router.route("/api/users").post(createUser);
router.route("/api/users").get(findAllUsers);
router.route("/api/users/:_id/exercises").post(exerciseRouteWithoutLog);
router.route("/api/users/:_id/logs").get(exerciseRouteWithLog);
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
