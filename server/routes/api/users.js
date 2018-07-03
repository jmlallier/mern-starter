const express = require("express");
const router = express.Router();
const passport = require("passport");
const auth = require("../auth");
// Item Model
const User = require("../../models/User");

// @route GET api/users
// @desc Get all users
// @access public
router.get("/", (req, res) => {
  User.find()
    .sort({ username: -1 })
    .then(users => res.json(users));
});

// @route GET api/user
// @desc Get specified user
// @params _id
// @access public
router.get("/:username", (req, res) => {
  User.findOne({ username: req.params.username }).then(users =>
    res.json(users)
  );
});

// @route POST api/user/login
// @desc Authenticate user
// @access public
router.post("/login", (req, res, next) => {
  User.authenticate(req.body.email, req.body.password, function(
    err,
    user,
    reason
  ) {
    if (err) throw err;

    // login was successful if we have a user
    if (user) {
      // handle login success

      passport.authenticate("local", { session: false }, function(
        err,
        user,
        info
      ) {
        // pass session:false so passport doesn't try to serialize user into session (yet?)
        if (err) {
          console.log("auth fail");
          return next(err);
        }

        if (user) {
          user.token = user.generateJWT();
          return res.json({ user: user.toAuthJSON() });
        } else {
          console.log("didn't find user");
          return res.status(422).json(info);
        }
      })(req, res, next);

      res.json(user);
      next();
    }

    // otherwise we can determine why we failed
    var reasons = User.failedLogin;
    switch (reason) {
      case reasons.NOT_FOUND:
      case reasons.PASSWORD_INCORRECT:
        // note: these cases are usually treated the same - don't tell
        // the user *why* the login failed, only that it did
        break;
      case reasons.MAX_ATTEMPTS:
        // send email or otherwise notify user that account is
        // temporarily locked
        break;
    }
    res.json(reason);
  });
});

// @route POST api/users
// @desc Create an user
// @access public
router.post("/", (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;
  const newUser = new User({
    name: {
      first: firstName,
      last: lastName
    },
    username,
    email,
    password
  });

  newUser
    .save()
    .then(user => res.json(user))
    .catch(err => res.json(err));
});

// @route PUT api/users/:id
// @desc Update an user
// @access public
router.put("/:id", (req, res) => {
  console.log(req.params);
  const { firstName, lastName, username, email, password } = req.body;
  User.findByIdAndUpdate(req.params.id, {
    name: { first: firstName, last: lastName },
    username,
    email,
    password
  })
    .then(user => res.json(user))
    .catch(err => res.json(err));
});

// @route DELETE api/users/:id
// @desc Delete an user
// @access public
router.delete("/:id", (req, res) => {
  User.findById(req.params.id)
    .then(user =>
      user.remove().then(() =>
        res.json({
          success: true,
          errors: [],
          message: `User successfully deleted`
        })
      )
    )
    .catch(err =>
      res
        .status(404)
        .json({ success: false, errors: err, message: `An error occurred` })
    );
});

module.exports = router;
