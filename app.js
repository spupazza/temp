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
var fs = require('fs');


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
console.log("contacts page has been displayed"); // used to output activity in the console
});

app.get('/register', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('register');
	});
	
app.get('/profile', function(req, res) {
		res.render('profile', {
			user : req.user // get the user out of session and pass to template
		});
	});

app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login', { message: req.flash('loginMessage') });
	});
	
	
const fileUpload = require('express-fileupload');

app.use(fileUpload());

app.get('/upload', function(req, res){

  res.render('upload')  

});

app.get('/swaps', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('swaps');
	});
	
	
	app.get('/donations', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('donations');
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

    // used to deserialize the user
    passport.deserializeUser(function(Id, done) {    // LOCAL SIGNUP ============================================================

       db.query("SELECT * FROM users WHERE Id = ? ",[Id], function(err, rows){
            done(err, rows[0]);
        });
    });

    // =========================================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
passport.use('local-signup', new LocalStrategy({
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

  // process the signup form
		app.post('/register', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/register', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

// process the login form
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });



   // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(
        'local-login',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) { // callback with email and password from our form
            db.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
                }

                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(password, rows[0].password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                return done(null, rows[0]);
            });
        })
    );
//};

function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}

app.get('/alter', function(req, res){
let sql = 'ALTER TABLE users ADD COLUMN admin BOOLEAN DEFAULT FALSE;'
 let query = db.query(sql, (err, res) => {
  if(err) throw err;
 console.log(res); 
 });
 res.send("altered");
 });

function isAdmin(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.user.admin)
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}


//post request for upload image
app.post('/upload', function(req, res){

 //    need to get the image from the form

 
 let sampleFile = req.files.sampleFile

 var filename = sampleFile.name;

 // we use the middleware (file upload ) to move the data from the form to the desired location

    sampleFile.mv('./images/' + filename, function(err){

        if(err)

        return res.status(500).send(err);

        console.log("Image is " + req.files.sampleFile)

        res.redirect('/');

    });

});

//table for posting

app.get('/createtable', function(req,res){
 let sql = 'CREATE TABLE posts (Id int NOT NULL AUTO_INCREMENT PRIMARY KEY, Title varchar(255), Image varchar(255), Descr varchar(255))';
    
 let query = db.query(sql, (err,res) => {
        
        if(err) throw err;
        
       console.log(res);
        
   });
         res.send("You created your first DB Table")
     })


// This route will create posting infos


app.get('/insert', function(req,res){
   let sql = 'INSERT INTO posts (Title, Image, Descr) VALUES ("Upcycled Dress", "", "Look at my new dress made from old t-shirts") ';
    
 let query = db.query(sql, (err,res) => {
        
   if(err) throw err;
        
   console.log(res);
        
    });
    
    res.send("You created your first Product")
    
 })
 


// Url to get the posts infos

app.get('/ba', function(req,res){
    
    let sql = 'SELECT * FROM posts';
    
    let query = db.query(sql, (err,result) => {
        
        if(err) throw err;
        
        console.log(result);
        
        res.render('ba', {result})
        
    });
    
    
})

// URL to get the add post page
app.get('/add', function(req,res){
  
        res.render('add')
    
});

// post request to write info to the database


app.post('/add', function(req,res){
    
 let sampleFile = req.files.sampleFile;
  const filename = sampleFile.name;
    
     sampleFile.mv('./images/' + filename, function(err){
        
        if(err)
        
        return res.status(500).send(err);
        console.log("Image you are uploading is " + filename)
       // res.redirect('/');
    })
    
    
    // Create a table that will show the posts
    let sql = 'INSERT INTO posts (Title, Image, Descr) VALUES ("   '+req.body.title+'   ", "'+filename+'", "'+req.body.descr+'") ';
    
    let query = db.query(sql, (err,res) => {
        
        if(err) throw err;
        
        console.log(res);
        
    });
    
    res.redirect('/ba')
   
    
});

// URL to get the edit post page 

app.get('/editpost/:id', function(req,res){
    
        let sql = 'SELECT * FROM posts WHERE Id =  "'+req.params.id+'" ';
    
    let query = db.query(sql, (err,result) => {
        
        if(err) throw err;
        
        console.log(result);
        
        res.render('editpost', {result})
        
    });
    
    
    
    
});


// Url to see individual posts
app.get('/ba/:id', function(req,res){
    
    let sql = 'SELECT * FROM posts WHERE Id = "'+req.params.id+'" ';
    
    let query = db.query(sql, (err,result) => {
        
        if(err) throw err;
        
        console.log(res);
        res.render('posts', {result})
    });
    
    
})

// URL TO delete a post

app.get('/delete/:id', function(req,res){
    
        let sql = 'DELETE FROM posts WHERE Id =  "'+req.params.id+'" ';
    
    let query = db.query(sql, (err,result) => {
        
        if(err) throw err;
        
        console.log(result);
  
    });
    
    res.redirect('/ba')
    
    
})


// Search

app.post('/search', function(req,res){
    
        let sql = 'SELECT * FROM posts WHERE Title LIKE  "%'+req.body.search+'%" ';
            let query = db.query(sql, (err,result) => {
        
        if(err) throw err;
        console.log(req.body.search);
        res.render('ba', {result})
        
    });
    
    
    
    
})



// Search End



 app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
console.log("Yippee its running");
  
});