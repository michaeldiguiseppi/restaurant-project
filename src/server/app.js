// *** main dependencies *** //
var express       = require('express');
var path          = require('path');
var favicon       = require('serve-favicon');
var logger        = require('morgan');
var cookieParser  = require('cookie-parser');
var bodyParser    = require('body-parser');
var swig          = require('swig');
var flash         = require('connect-flash');
var session       = require('express-session');
var cookieSession = require('cookie-session');
var passport      = require('passport');


require('dotenv').load();
var FacebookStrategy = require('passport-facebook').Strategy;
if ( !process.env.NODE_ENV ) { require('dotenv').config(); }
var knex = require('../../db/knex');
function Users () {
  return knex('users');
}


// *** routes *** //
var routes = require('./routes/index.js');
var apiRoutes = require('./routes/apiRoutes.js');
var auth = require('./routes/auth.js');


// *** express instance *** //
var app = express();


// *** view engine *** //
var swig = new swig.Swig();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');


// *** static directory *** //
app.set('views', path.join(__dirname, 'views'));


// *** config middleware *** //
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'secret kitten',
  resave: false,
  saveUninitialized: true
}));
// app.use(cookieSession({
//   name: 'facebook-oauth',
//   keys: [process.env.COOKIE_KEY1, process.env.COOKIE_KEY2]
// }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../client')));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.HOST + "/auth/facebook/callback",
    profileFields: ['name', 'displayName']
  },
  function(accessToken, refreshToken, profile, done) {

      Users().where('facebook_id', profile.id).then(function(data) {
    if (data.length) {
      return data[0].id;
    } else {
      return Users().insert({
        facebook_id: profile.id,
        first_name: profile.name.givenName,
        last_name: profile.name.familyName
      },'id').then(function(id) {
        return id[0];
      });
    }
  }).then(function(user) {
      return done(null, user);
  });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  Users().where('id', user).then(function(data) {
    done(null, data);
  });
});


// *** main routes *** //
app.use('/', routes);
app.use('/api', apiRoutes);
app.use('/auth', auth);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// *** error handlers *** //

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
