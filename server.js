const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// MongoDB Atlas Connection
const dbUri = 'mongodb+srv://adityadeb:eCunNWFwpyZpHdul@testid.hyqwjw5.mongodb.net/?retryWrites=true&w=majority&appName=testid';
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Could not connect to MongoDB Atlas', err));

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const noteSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: String,
    content: String
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup.html');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
        return res.redirect('/signup?message=User already exists.');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username: username,
        password: hashedPassword
    });

    try {
        await newUser.save();
        res.redirect('/?message=User signed up successfully.');
    } catch (err) {
        res.redirect('/signup?message=Error signing up user.');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username });
    if (!user) {
        return res.redirect('/?message=User not found.');
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } else {
        res.redirect('/?message=Invalid password.');
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/?message=Please log in first.');
    }
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.post('/add-note', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/?message=Please log in first.');
    }

    const { title, content } = req.body;

    const newNote = new Note({
        userId: req.session.userId,
        title: title,
        content: content
    });

    try {
        await newNote.save();
        res.redirect('/dashboard');
    } catch (err) {
        res.redirect('/dashboard?message=Error adding note.');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.sendStatus(200);
    });
});

app.get('/notes', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const notes = await Note.find({ userId: req.session.userId });
    res.json(notes);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
