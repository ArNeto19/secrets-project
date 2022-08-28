//-- App Generals --//
//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passLocalMongo = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb+srv://admin-${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.wx5ya.mongodb.net/secretspageDB`, {
  useNewUrlParser: true
});

//-- SCHEMAS

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});
userSchema.plugin(passLocalMongo);
userSchema.plugin(findOrCreate);
const User = mongoose.model('user', userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET_KEY,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//-- ROUTES

app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

app.get("/auth/google", passport.authenticate('google', {
  scope: ['profile']
}));


app.route("/register")
  .get(function(req, res) {
    res.render('register');
  })
  .post(function(req, res) {

    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (!err) {
        passport.authenticate('local')(req, res, function() {
          res.redirect("/secrets");
        });
      } else {
        console.log(err);
        res.redirect("/register");
      }
    });

  });


app.route("/login")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/secrets");
    } else {
      res.render('login');
    }
  })
  .post(function(req, res) {

    let user = new User({
      email: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err) {
      if (!err) {
        passport.authenticate('local')(req, res, function() {
          res.redirect("/secrets");
        });
      } else {
        console.log(err);
        res.redirect("/login");
      }
    });

  });

app.get("/auth/google/secrets", passport.authenticate('google', {failureRedirect: '/login'}),
function(req, res) {
  res.redirect('/secrets');
}
);

app.route("/secrets")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render('secrets');
    } else {
      res.redirect("/login");
    }
  });


app.route("/submit")
  .get(function(req, res) {
    res.render('submit');
  });


app.route("/logout")
  .get(function(req, res) {
    req.logout(function(err) {
      res.redirect('/');
    });
  });



//-- SERVER
app.listen(process.env.PORT || 3000, function() {
  console.log('Server running smoothly');
});
