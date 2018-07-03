const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    name: {
      first: {
        type: String,
        required: true
      },
      last: {
        type: String,
        required: true
      }
    },
    username: {
      type: String,
      lowercase: true,
      required: [true, "can't be blank"],
      match: [/^[a-zA-Z0-9]+$/, "is invalid"],
      index: { unique: true },
      alias: "u"
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      required: [true, "can't be blank"],
      match: [/\S+@\S+\.\S+/, "is invalid"],
      index: {
        unique: true
      },
      alias: "e"
    },
    bio: String,
    image: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Article" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    password: String,
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number }
  },
  { timestamps: true }
);
