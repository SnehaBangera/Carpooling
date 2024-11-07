const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'ride_sharing',
    password: 'ammanilaya@12' // Replace with your actual password
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.render('home', { user: req.session.user });
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/booking', isAuthenticated, (req, res) => {
    res.render('booking', { user: req.session.user });
});

app.get('/notification', isAuthenticated, (req, res) => {
    res.render('notification', { user: req.session.user });
});

app.get('/payment', isAuthenticated, (req, res) => {
    res.render('payment', { user: req.session.user });
});

app.get('/ride_history', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    connection.query('SELECT * FROM rides WHERE user_id = ?', [userId], (err, rides) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('ride_history', { user: req.session.user, rides });
    });
});

app.get('/ride_request', isAuthenticated, (req, res) => {
    res.render('ride_request', { user: req.session.user });
});

app.get('/vehicle', isAuthenticated, (req, res) => {
    res.render('vehicle', { user: req.session.user });
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, email, password, 'confirm-password': confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    try {
        const checkEmailSql = 'SELECT * FROM users WHERE email = ?';
        connection.query(checkEmailSql, [email], async (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Server error');
            }

            if (results.length > 0) {
                return res.redirect('/login?error=emailInUse');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            connection.query(sql, [username, email, hashedPassword], (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Server error');
                }
                res.redirect('/login');
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid email or password');
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }

            if (!match) {
                return res.status(401).send('Invalid email or password');
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };

            res.redirect('/');
        });
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
