// Here are the modules (libraries) we want to use for our project
// Some of the may need to be installed via npm (node paackage manager)
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const db = mongoose.connect('mongodb://localhost:27017/SE475_Final_Task', {useNewUrlParser: true, useUnifiedTopology: true});

//Express is a framework for a web server, it makes things super easy
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https')
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cookie = require('cookie-parser');

//This is the port we want the web server to listen and start our application on
const port = 7000;

//This will create an app using express' functions
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname)));
app.set('views', path.join(__dirname, '/views'));
//use cookie for tracking logins
app.use(cookie());

const options = {
	key: fs.readFileSync('key.pem'),
	cert: fs.readFileSync('cert.pem')
};

let names = []

//Create models for mongo db - Start
const Accounts = mongoose.model('Accounts', {
	Name: String,
	Username: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	Email: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	Password: {
		type: String,
		required: true,
	}
});


//HTTP --------------------------------------- Start
//Paths -- These are functions to handle if someone goes to a specific endpoint

//for this one, if someone went to localhost:7000/ we would return what ever we have in this function
//If we had a user list we wanted to show, we could create a path of /users and that would display the user list
app.get('/', function(req, res) {
	try {
		//This will send a response (res is short for response, req is short for request)
		//We can set a specific HTTP code (if we want but we dont need too)
		//The .send will send what ever we have inside it.
		// res.status(200).send("Hello There :)")
		//To display HTML we do this:
		res.render('index', {'Settings': {'Username':`${getName(req)}`}, 'Error': ''})
	} catch (error) {
		console.log("Caught Error in /: " + error);
		res.status(500).send("Ran into an Error, please try again")
	}
});

app.get('/sign_up', function(req, res) {
	try {
		res.render(`sign_up`, {
			'Settings': {
				'Username':``,
				'Email':``,
				'Password':``,
				'Error': {
					message: ""
				}
			}
		});
	} catch (error) {
		console.log(`Caught Error in get /sign_up: ${error}`);
		res.status(500).send("Ran into an Error, please try again")
	}
});

app.post('/sign_up', async function(req, res) {
	try {
		console.log("IN SIGN_UP POST");
		console.log(req.body);

		var user = await Accounts.findOne({ Username: req.body.Username }).exec();
		if(!user) {
			var salt = bcrypt.genSaltSync(10);
			req.body.Password = bcrypt.hashSync(req.body.Password, salt);

			let newAccount = new Accounts(req.body);
			newAccount.save((error, results) => {
				if (error) {
					console.log(`ERRRR in creating user: ${error}`);
					res.render(`sign_up`, {
						'Settings': {
							'Username':`${req.body.Username}`,
							'Email':`${req.body.Email}`,
							'Password':`${req.body.Password}`,
							'Error': {
								message: "Username or Email Already Exists"
							}
						}
					});
				} else {
					res.redirect('/');
				}
			});
		} else {
			console.log("Account Exists");
			res.render(`sign_up`, {
				'Settings': {
					'Username':`${req.body.Username}`,
					'Email':`${req.body.Email}`,
					'Password':`${req.body.Password}`,
					'Error': {
						message: "Username or Email Already Exists"
					}
				}
			});
		}



	} catch (error) {
		console.log(`Caught Error in post /sign_up: ${error}`);
		res.status(500).send("Ran into an Error, please try again")
	}
});

app.get('/login', function(req, res) {
	try {
		res.render(`login`, {'Settings': {'Username':`${getName(req)}`, 'Error': {message: ""}}});
	} catch (error) {
		console.log(`Caught Error in get /login: ${error}`);
		res.status(500).send("Ran into an Error, please try again")
	}
});

app.post('/login', async function(req, res) {
	try {
			var user = await Accounts.findOne({ Username: req.body.Username }).exec();
			if(!user || !bcrypt.compareSync(req.body.Password, user.Password)) {
				res.render(`login`, {'Settings': {'Username':`${getName(req)}`, 'Error': {message: "Username or Password Incorrect"}}});
				// break;
			} else{
				res.cookie("Username", user.Username, {maxAge: 7000000});
				console.log("Login Successful");
				res.render('chat', {'Username': user.Username})
			}
		} catch (error) {
			console.log(`Caught Error in post /login: ${error}`);
			res.status(500).send("Ran into an Error, please try again")
		}
});

app.get('/logout', function(req, res) {
	try {
		console.log("in logout");
		res.clearCookie("Username");
		res.redirect('/')
	} catch (error) {
		console.log("Caught Error in /logout" + error);
		res.status(500).send("Ran into an Error, please try again")
	}
});



let server = https.createServer(options, app);
server.listen(port, () => console.log('App started on port: ' + port))
//HTTP --------------------------------------- End



//Functions --------------------------------- Start
function getName (req) {
	var name;
	if (req.cookies.Username === undefined) {
		name = "";
	} else {
		name = req.cookies.Username;
	}
	return name;
}
//Functions --------------------------------- End
