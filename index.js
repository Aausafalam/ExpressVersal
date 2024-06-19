const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // UUID package

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = '54545v5rdfd4e5egfef434fefsxw3w35vfgfdaw2367tg543fe4'; // Change this to a more secure key in production

// Connect to MongoDB
mongoose.connect('mongodb+srv://nitesh785282:Gautam785282@cluster0.tp8sua5.mongodb.net/jobpost?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  id: Number,
  email: String,
  password: String,
  userRole: String
});

const waitlistSchema = new mongoose.Schema({
  id: String,
  Name: String,
  Email: String,
  CompanyName: String
});

const contactSchema = new mongoose.Schema({
  id: String,
  Name: String,
  Email: String,
  Message: String,
  Mobile: String
});

const User = mongoose.model('User', userSchema);
const Waitlist = mongoose.model('Waitlist', waitlistSchema);
const Contact = mongoose.model('Contact', contactSchema);

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }
  jwt.verify(token, SECRET_KEY, async(err, decoded) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to authenticate token.' });
    }
   const user = await User.findOne({ id: decoded.id })
   req.userId = user.id;
   req.userRole = user.userRole;
   next();

  });
};

// Login API
app.post('/login', async(req, res) => {
  const { email, password } = req.body;
 const user =  await User.findOne({ email, password });
  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
   return  res.json({ token, message: 'login successful' });
});

// Logged in API
app.get('/loggedin', verifyToken, (req, res) => {
  const newToken = jwt.sign({ id: req.userId }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token: newToken });
});

// Waitlist section
app.post('/waitlist', async(req, res) => {
  const { Name, Email, CompanyName } = req.body;
  if (!Name || !Email || !CompanyName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const waitlistData = await Waitlist({ id: uuidv4(), Name, Email, CompanyName });
  await waitlistData.save();
 return res.json({ message: 'Waitlist data saved successfully.' });
});

app.get('/waitlist', verifyToken, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const waitlist = await Waitlist.find({})
   return res.json(waitlist);

});

app.delete('/waitlist/:id', verifyToken, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { id } = req.params;
  await Waitlist.deleteOne({ id })
  return res.json({ message: 'Waitlist entry deleted successfully.' });
});

// Contact section
app.post('/contact', async(req, res) => {
  const { Name, Email, Message, Mobile } = req.body;
  if (!Name || !Email || !Message || !Mobile) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const contactData = await Contact({ id: uuidv4(), Name, Email, Message, Mobile });
  await contactData.save();
  return res.json({ message: 'Contact data saved successfully.' });
});

app.get('/contact', verifyToken, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
 const contacts =  await Contact.find({});
    return res.json(contacts);
});

app.delete('/contact/:id', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { id } = req.params;
  Contact.deleteOne({ id })
 return  res.json({ message: 'Contact entry deleted successfully.' });
 
});

app.use("/", (req, res) => {
  return res.json({ message: "Hello world" });
});

app.listen(3500, () => {
  console.log('listening on 3500');
});
