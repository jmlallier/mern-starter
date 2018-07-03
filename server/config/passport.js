const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const User = mongoose.model("User");

passport.use(
  new LocalStrategy(
    {
      usernameField: "user[email]",
      passwordField: "user[password]"
    },
    (email, password, done) => {
      console.log(email, password);
      User.authenticate(email, password, done)
        .then(user => done(null, user))
        .catch(done);
    }
  )
);
