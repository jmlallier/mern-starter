const mongoose = require("mongoose");
const { Schema } = mongoose;

const bcrypt = require("bcrypt");
const SALT_WORK_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000;
const reasons = {
  NOT_FOUND: 0,
  PASSWORD_INCORRECT: 1,
  MAX_ATTEMPTS: 2
};
const jwt = require("jsonwebtoken");
const { secret } = require("../config").auth;

const userSchema = require("./schemas/UserSchema");

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

userSchema.methods.incLoginAttempts = function(cb) {
  // if we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update(
      {
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 }
      },
      cb
    );
  }
  // otherwise we're incrementing
  var updates = { $inc: { loginAttempts: 1 } };
  // lock the account if we've reached max attempts and it's not locked already
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.update(updates, cb);
};

// this returns json representation of user to be passed to front end,
// includes user id, and username + expiration... btw is this 60 days? yes
userSchema.methods.generateJWT = function() {
  var today = new Date();
  var exp = new Date(today); //expiry
  exp.setDate(today.getDate() + 60);

  return jwt.sign(
    {
      id: this._id,
      username: this.username,
      exp: parseInt(exp.getTime() / 1000) // i have no idea why this comma is legit
    },
    secret
  );
};

userSchema.methods.toAuthJSON = function() {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT()
  };
};

//this accepts user but its not for 'this' object
//also not used anywhere... set up for later on?
// userSchema.methods.toProfileJSONFor = function(user) {
//   return {
//     username: this.username,
//     bio: this.bio,
//     image:
//       this.image || "https://static.productionready.io/images/smiley-cyrus.jpg",
//     following: user ? user.isFollowing(this._id) : false
//     //if user is logged in, run the isfollowing method to find out if they're following this person profile
//   };
// };

userSchema.methods.favorite = function(id) {
  if (this.favorites.indexOf(id) === -1) {
    //if doesn't already exist as fave
    this.favorites.push(id); //add to faves
  }

  return this.save(); //save to mongodb
};

userSchema.methods.follow = function(id) {
  //BUG: in https://thinkster.io/tutorials/node-json-api/adding-followers-and-article-feeds
  // 2nd step, shows 'favorites' instead of 'following'
  if (this.following.indexOf(id) === -1) {
    this.following.push(id);
  }
  return this.save();
};

userSchema.methods.unfollow = function(id) {
  this.following.remove(id);
  return this.save();
};

userSchema.methods.isFollowing = function(id) {
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
  // basically a map/reduce type of way to see if an id is in an array
  return this.following.some(function(followId) {
    return followId.toString() === id.toString();
  });
};

userSchema.methods.unfavorite = function(id) {
  // don't need to check if exist... i guess remove will not error
  this.favorites.remove(id);
  return this.save();
};

userSchema.methods.isFavorite = function(id) {
  return this.favorites.some(function(favoriteId) {
    return favoriteId.toString() == id.toString();
  });
};

userSchema.virtual("fullName").get(function() {
  return `${this.name.first} ${this.name.last}`;
});

userSchema.virtual("isLocked").get(function() {
  // check for a future lockUntil timestamp
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", function(next) {
  const self = this;
  if (!self.isModified("password")) return next();

  try {
    bcrypt.hash(self.password, SALT_WORK_FACTOR, (err, hash) => {
      if (err) return next(err);

      self.password = hash;
      next();
    });
  } catch (error) {
    return next(error);
  }
});

userSchema.pre("save", function(next) {
  const self = this;
  try {
    mongoose.models["User"].findOne({ username: self.username }, function(
      err,
      user
    ) {
      if (err) {
        next(err);
      } else if (user) {
        if (user._id.equals(self._id)) return next(); // If id's are equal, then we don't care about false dupe username error because its the same user!

        self.invalidate("username", "Sorry but this username is already taken");
        return next(new Error("Sorry but this username is already taken"));
      } else {
        next();
      }
    });
  } catch (error) {
    return next(error);
  }
});

// userSchema.pre("update", function(next) {
//   const self = this;
//   if (!self.isModified("password")) return next();
//   const password = this.getUpdate().$set.password;
//   if (!password) {
//     return next();
//   }
//   try {
//     bcrypt.hash(self.password, SALT_WORK_FACTOR, (err, hash) => {
//       if (err) return next(err);

//       self.password = hash;
//       next();
//     });
//   } catch (error) {
//     return next(error);
//   }
// });

userSchema.set("toJSON", {
  getters: true,
  transform: (doc, ret, options) => {
    delete ret.password;
    return ret;
  }
});

userSchema.statics.failedLogin = reasons;

userSchema.statics.authenticate = function(email, password, cb) {
  this.findOne({ email }, (err, user) => {
    if (err) return cb(err);

    // make sure the user exists
    if (!user) {
      return cb(null, null, reasons.NOT_FOUND);
    }

    // check if the account is currently locked
    if (user.isLocked) {
      // just increment login attempts if account is already locked
      return user.incLoginAttempts(err => {
        if (err) return cb(err);
        return cb(null, null, reasons.MAX_ATTEMPTS);
      });
    }

    // test for a matching password
    user.comparePassword(password, (err, isMatch) => {
      if (err) return cb(err);

      // check if the password was a match
      if (isMatch) {
        // if there's no lock or failed attempts, just return the user
        if (!user.loginAttempts && !user.lockUntil) return cb(null, user);
        // reset attempts and lock info
        var updates = {
          $set: { loginAttempts: 0 },
          $unset: { lockUntil: 1 }
        };
        return user.update(updates, function(err) {
          if (err) return cb(err);
          return cb(null, user);
        });
      }

      // password is incorrect, so increment login attempts before responding
      user.incLoginAttempts(err => {
        if (err) return cb(err);
        return cb(null, null, reasons.PASSWORD_INCORRECT);
      });
    });
  });
};

module.exports = User = mongoose.model("User", userSchema);
