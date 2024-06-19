const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // UUID package

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = '54545v5rdfd4e5egfef434fefsxw3w35vfgfdaw2367tg543fe4'; // Change this to a more secure key in production

// Sample user data
const users = [
  { id: 7565765756, email: 'admin@example.com', password: 'admin123', userRole: 'admin' },
  { id: 9087963454, email: 'user@example.com', password: 'user123', userRole: 'user' }
];

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to authenticate token.' });
    }
    const user = users.find((user) => user.id === decoded.id);
    if (!user) {
      return res.status(500).json({ message: 'Failed to authenticate token id.' });
    }
    req.userId = user.id;
    req.userRole = user.userRole;
    next();
  });
};

// Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, message: 'login successful' });
});

// Logged in API
app.get('/loggedin', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found.' });
  }
  const newToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token: newToken });
});

// Waitlist section
app.post('/waitlist', (req, res) => {
  const { Name, Email, CompanyName } = req.body;
  if (!Name || !Email || !CompanyName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const waitlistData = { id: uuidv4(), Name, Email, CompanyName };
  fs.readFile('waitlist.json', (err, data) => {
    const waitlist = err ? [] : JSON.parse(data);
    waitlist.push(waitlistData);
    fs.writeFile('waitlist.json', JSON.stringify(waitlist, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to save waitlist data.' });
      }
      res.json({ message: 'Waitlist data saved successfully.' });
    });
  });
});

app.get('/waitlist', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  fs.readFile('waitlist.json', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read waitlist data.' });
    }
    const waitlist = JSON.parse(data);
    res.json(waitlist);
  });
});

app.delete('/waitlist/:id', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { id } = req.params;
  fs.readFile('waitlist.json', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read waitlist data.' });
    }
    let waitlist = JSON.parse(data);
    waitlist = waitlist.filter(entry => entry.id !== id);
    fs.writeFile('waitlist.json', JSON.stringify(waitlist, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete waitlist entry.' });
      }
      res.json({ message: 'Waitlist entry deleted successfully.' });
    });
  });
});

// Contact section
app.post('/contact', (req, res) => {
  const { Name, Email, Message, Mobile } = req.body;
  if (!Name || !Email || !Message || !Mobile) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const contactData = { id: uuidv4(), Name, Email, Message, Mobile };
  fs.readFile('contact.json', (err, data) => {
    const contacts = err ? [] : JSON.parse(data);
    contacts.push(contactData);
    fs.writeFile('contact.json', JSON.stringify(contacts, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to save contact data.' });
      }
      res.json({ message: 'Contact data saved successfully.' });
    });
  });
});

app.get('/contact', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  fs.readFile('contact.json', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read contact data.' });
    }
    const contacts = JSON.parse(data);
    res.json(contacts);
  });
});

app.delete('/contact/:id', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { id } = req.params;
  fs.readFile('contact.json', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read contact data.' });
    }
    let contacts = JSON.parse(data);
    contacts = contacts.filter(entry => entry.id !== id);
    fs.writeFile('contact.json', JSON.stringify(contacts, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete contact entry.' });
      }
      res.json({ message: 'Contact entry deleted successfully.' });
    });
  });
});

app.use("/", (req, res) => {
  return res.json({ message: "Hello world" });
});

app.listen(3500, () => {
  console.log('listening on 3500');
});
