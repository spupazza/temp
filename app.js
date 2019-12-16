var express = require("express"); 
var app = express();
var nodemailer = require('nodemailer');
var bodyParser = require("body-parser"); // call body parser module and make use of it
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var localStorage = require('node-localstorage');
var session  = require('express-session');
var cookieParser = require('cookie-parser');
var flash    = require('connect-flash');
var bcrypt = require('bcrypt-nodejs');
var mysql = require('mysql');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(cookieParser()); // read cookies (needed for auth)

// required for passport
app.use(session({
	secret: 'secretdatakeythatyoucanchange',
	resave: true,
	saveUninitialized: true
 } )); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session



app.use(express.static("views"));
app.use(express.static("scripts"));
app.use(express.static("images"));

app.set('view engine', 'ejs');
var contact = require("./model/contact.json"); // allow the app to access the contact.json 


app.get('/', function(req, res) {
res.render("index");  // we set the response to send back the string hello world
console.log("Hello World"); // used to output activity in the console
});

app.get('/contacts', function(req, res) {
res.render("contacts", {contact}); // we use the res.render command to on the response object to display the jade page as html
console.log("contactss page has been displayed"); // used to output activity in the console
});

app.get('/register', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('register');
	});
	
	
// process the signup form
		app.post('/profile', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/register', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));
	
app.get('/profile', function(req, res) {
		res.render('profile', {
			user : req.user // get the user out of session and pass to template
		});
	});
	

// POST route from contact form: reference website:https://tylerkrys.ca/blog/adding-nodemailer-email-contact-form-node-express-app

app.post('/contacts', (req, res) => {  
    var output = `
    <p>You have a new contact request</p> 
    <h3>Contact Details</h3>
    <ul>  
      <li>Name: ${req.body.name}</li>
      <li>Email: ${req.body.email}</li>
    </ul>
    <h3>Message</h3>
    <p>${req.body.message}</p>
  `; //reference: https://github.com/bradtraversy/nodecontactform/blob/master/app.js

  // Instantiate the SMTP server
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'll6621692',
      pass: '1q2w3e4r='
    }
  })

  // Specify what the email will look like
 
  var mailOpts = {
    from: 'll6621692', // This is ignored by Gmail
    to: 'll6621692',
    subject: 'New message from contact form',
    text: 'output',
}

  // Attempt to send the email
   transporter.sendMail(mailOpts, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

      res.render('contacts', {msg:'Email has been sent'});
  });
  });
  
  
  // end post send email
  
  //*******************start sql****************//
  //Register and Profile section//
  
  // First we need to tell the application where to find the database

const db = mysql.createConnection({
host: 'den1.mysql6.gear.host',
    user: 'register2',
    password: 'Si0qJ-UH5Z2-',
    database: 'register2'
 });
// Next we need to create a connection to the database

db.connect((err) =>{
     if(err){
        console.log("go back and check the connection details. Something is wrong.")
        // throw(err)
    } 
     else{
        
        console.log('Looking good the database connected')
    }
    
    
})

//create table for register section
  
  app.get('/createusers', function(req, res){
let sql = 'CREATE TABLE users (Id int NOT NULL AUTO_INCREMENT PRIMARY KEY, username varchar(255), email varchar(255), password varchar(255));'
let query = db.query(sql, (err,res) => {
 if(err) throw err;
});
    
res.send("SQL Worked");
});

    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.Id); // Very important to ensure the case if the Id from your database table is the same as it is here
    });

    // used to deserialize the 
    passport.deserializeUser(function(Id, done) {    // LOCAL SIGNUP ============================================================

       db.query("SELECT * FROM users WHERE Id = ? ",[Id], function(err, rows){
            done(err, rows[0]);
        });
    });

    // =========================================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
passport.use(
        'local-signup',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            db.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
                } else {
                    // if there is no user with that username
                    // create the user
                    var newUserMysql = {
                        username: username,
                        email: req.body.email,
                        password: bcrypt.hashSync(password, null, null)  // use the generateHash function in our user model
                    };

                    var insertQuery = "INSERT INTO users ( username, email, password ) values (?,?,?)";

                    db.query(insertQuery,[newUserMysql.username, newUserMysql.email, newUserMysql.password],function(err, rows) {
                        newUserMysql.Id = rows.insertId;
                        return done(null, newUserMysql);
                    });
                }
            });
        })
    );

  


app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
console.log("Yippee its running");
  
});
