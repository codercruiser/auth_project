const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt');
const path = require('path');


// Connect to MongoDB
mongoose
  .connect('mongodb+srv://samuel:U18me1085@cluster0.obz0x78.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Create a user schema
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  address: String,
  documents: String,
  username: String,
  password: String,
  email: String,
});

// Create a user model
const User = mongoose.model('User', userSchema);

// Configure session storage
const store = new MongoDBStore({
  uri: 'mongodb+srv://samuel:U18me1085@cluster0.obz0x78.mongodb.net/?retryWrites=true&w=majority',
  collection: 'sessions',
});

// Catch errors in session storage
store.on('error', (error) => {
  console.error('Session store error:', error);
});

// Parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Configure session middleware
app.use(
  session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: true,
    store: store,
  })
);

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the User Registration App');
});

// User registration route
app.get('/register', (req, res) => {
  res.render('user-registration');
});

app.post('/next', (req, res) => {
  const { name, username, email, age, address, documents, password } = req.body;
  console.log(req.body);

  // Store the data in the session
  req.session.userData = { name, username, email };

  res.render('user-registration2', { name, username, email });
});

app.post('/register_user', (req, res) => {
  const { age, address, documents, password } = req.body;
  console.log(req.body);

  // Retrieve the data from the session
  const { name, email, username } = req.session.userData;

  // Check if the password is empty
  if (!password) {
    return res.status(400).send('Password is required');
  }
  
  bcrypt
  .hash(password, 10)
  .then((hashedPassword) => {
    console.log('Hashed password:', hashedPassword);

    // Create a new user with the hashed password and retrieved data
    const newUser = new User({
      name,
      email,
      username,
      age,
      address,
      documents,
      password: hashedPassword,
    });
    console.log('New User:', newUser);

    // Save the user to the database
    newUser
      .save()
      .then(() => {
        res.redirect('/login');
      })
      .catch((error) => {
        console.error('Error registering user:', error);
        res.send('Error registering user');
      });
  })
  .catch((error) => {
    console.error('Error hashing password:', error);
    res.send('Error registering user');
  })});


app.get('/login', (req, res) => {
  const loginMessage = req.session.loginMessage; // Get the login message from the session
  req.session.loginMessage = null; // Clear the login message from the session
  const successMessage = req.session.successMessage; // Get the success message from the session
  req.session.successMessage = null; // Clear the success message from the session
  res.render('user-login', { successMessage, loginMessage }); // Pass the messages to the login view
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find the user by username
  User.findOne({ username })
    .then((user) => {
      if (user) {
        // Compare passwords
        bcrypt
          .compare(password, user.password)
          .then((result) => {
            if (result) {
              // Password is correct
              req.session.username = username;
              req.session.successMessage = 'Login successful'
              res.redirect('/profile');
            } else {
              // Invalid password
              req.session.loginMessage = 'Invalid username or password';
              res.redirect('/login');
            }
          })
          .catch((error) => {
            console.error('Error comparing passwords:', error);
            req.session.loginMessage = 'Error logging in';
            res.redirect('/login');
          });
      } else {
        // User not found
        req.session.loginMessage = 'Invalid username or password';
        res.redirect('/login');
      }
    })
    .catch((error) => {
      console.error('Error logging in:', error);
      res.send('Error logging in');
    });
});

// Profile update route
app.post('/profile-reset', (req, res) => {
  const username = req.session.username;
  console.log(username)
  User.findOne({ username }) // Find the user by username
    .then((user) => {
      if (user) {
        res.render('profile-update', { user })
      } else {
        console.error(error)
      }
    })
});

app.get('/profile', (req,res) => {
  const username = req.session.username;
  User.findOne({ username }) // Find the user by username
    .then((user) => {
      if (user) {
        const loginMessage = req.session.loginMessage; // Get the login message from the session
        req.session.loginMessage = null; // Clear the login message from the session
        res.render('dashboard', { user, loginMessage }); // Pass the user and login message to the dashboard view
      } else {
        req.session.loginMessage = 'User not found';
        res.redirect('/login');
      }
    })
    .catch((error) => {
      console.error('Error retrieving user:', error);
      res.send('Error retrieving user');
    });
})

app.post('/profile-now', (req, res) => {
  const { name, username, age, address, documents } = req.body;

  // Check if any changes were made
  if (!name && !username && !age && !address && !documents) {
    return res.send('No changes were made to the profile');
  }

  // Find the user based on the username in the session
  User.findOne({ username: req.session.username })
    .then((user) => {
      if (!user) {
        return res.send('User not found');
      }

      // Update the user's profile with the new values
      if (name) {
        user.name = name;
      }
      if (username) {
        user.username = username;
      }
      if (age) {
        user.age = age;
      }
      if (address) {
        user.address = address;
      }
      if (documents) {
        user.documents = documents;
      }

      // Save the updated user to the database
      return user.save();
    })
    .then(() => {
      req.session.successMessage = 'Profile updated successfully';
      res.redirect('/profile')
    })
    .catch((error) => {
      console.error('Error updating profile:', error);
      res.send('Error updating profile');
    });
});



// Password reset route
app.get('/password-reset', (req, res) => {
  res.render('password-reset');
});


app.post('/password-reset', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      console.log('User found', user);
      res.redirect(`/reset-password/${user._id}`);
    } else {
      console.log('User not found.');
      // Send a failure response
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error(error);
    // Send an error response
    res.status(500).send('An error occurred');
  }
});

app.get('/reset-password/:id', async (req, res) => {
  const { id } = req.params;
  res.render('reset-req', { id });
});

app.post('/reset-password/:id', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || newPassword !== confirmPassword) {
      console.log('Passwords do not match.');
      // Send a failure response
      return res.status(400).send('Passwords do not match');
    }

    const user = await User.findById(id);
    if (!user) {
      console.log('User not found.');
      // Send a failure response
      return res.status(404).send('User not found');
    }

    // Verify the current password before updating
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      console.log('Current password is incorrect.');
      // Send a failure response
      return res.status(401).send('Current password is incorrect');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Send a success response
    req.session.successMessage
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    // Send an error response
    res.status(500).send('An error occurred');
  }
});


// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Error logging out:', error);
    }
    res.redirect('/login');
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
