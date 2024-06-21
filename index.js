const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // UUID package
const cors = require('cors');
const cron = require('node-cron');
const XLSX = require('xlsx');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const app = express();
app.use(cors())
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

const counterSchema = new mongoose.Schema({
  count: { type: Number, default: 400 }
});




const User = mongoose.model('User', userSchema);
const Waitlist = mongoose.model('Waitlist', waitlistSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Counter = mongoose.model('Counter', counterSchema);

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.query?.token;
  if (!token) {
    return res.status(403).json({ message: 'No token provided.' });
  }
  jwt.verify(token, SECRET_KEY, async(err, decoded) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to authenticate token.' });
    }
   const user = await User.findOne({ _id: decoded.id })
   req.userId = user._id;
   req.userRole = user.userRole;
   next();

  });
};

// Login API
app.post('/login', async(req, res) => {
  const { email, password } = req.body;
 try {
    const user =  await User.findOne({ email, password });
    if(!user) return res.status(404).json({ message: 'user not found' });
  const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
   return  res.status(200).json({ token, message: 'login successful' });
 } catch (error) {
    return res.status(500).json({ error: error})
 }
});

// Logged in API
app.get('/loggedin', verifyToken, (req, res) => {
  const newToken = jwt.sign({ id: req.userId }, SECRET_KEY, { expiresIn: '1h' });
  res.status(200).json({ token: newToken });
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

  const { page = 1, limit = 10, exportFormat, searchText } = req.query;
  const query = {};

  if (searchText) {
    query.$or = [
      { Name: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
      { Email: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
      { CompanyName: { $regex: searchText, $options: 'i' } } // Case-insensitive search
    ];
  }
  
  try {
    if (exportFormat) {
      // Fetch all data for exporting
      const waitlistData = await Waitlist.find(query,{_id:0,__v:0}).lean().exec();

      if (exportFormat === 'excel') {
        
        const worksheet = XLSX.utils.json_to_sheet(waitlistData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Waitlist');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=waitlist.xlsx');
        res.send(excelBuffer);
      } else if (exportFormat === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]); // Increase the height for more content
        const { width, height } = page.getSize();
        const fontSize = 12;
  
        page.drawText('Waitlist', {
          x: 50,
          y: height - 30,
          size: 24,
          color: rgb(0, 0.53, 0.71),
        });
  
        // Define starting positions
        let yPosition = height - 60;
        const xPosition = 50;
  
        // Define column widths
        const columnWidths = [20, 100, 200, 150];
        
        // Define headers
        const headers = ['#', 'Name', 'Email', 'CompanyName'];
  
        // Draw headers
        headers.forEach((header, index) => {
          page.drawText(header, {
            x: xPosition + columnWidths.slice(0, index).reduce((a, b) => a + b, 0),
            y: yPosition,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        });
  
        // Draw a line under headers
        yPosition -= 15;
        page.drawLine({
          start: { x: xPosition, y: yPosition },
          end: { x: xPosition + columnWidths.reduce((a, b) => a + b, 0), y: yPosition },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
  
        yPosition -= 10;
  
        // Draw table rows
        waitlistData.forEach((entry, index) => {
          const row = [
            (index + 1).toString(),
            entry.Name,
            entry.Email,
            entry.CompanyName,
          ];
  
          row.forEach((text, colIndex) => {
            page.drawText(text, {
              x: xPosition + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0),
              y: yPosition,
              size: fontSize,
              color: rgb(0, 0, 0),
            });
          });
  
          yPosition -= 20;
  
          // Draw a line under each row
          if (index < waitlistData.length - 1) {
            page.drawLine({
              start: { x: xPosition, y: yPosition + 10 },
              end: { x: xPosition + columnWidths.reduce((a, b) => a + b, 0), y: yPosition + 10 },
              thickness: 0.5,
              color: rgb(0.7, 0.7, 0.7),
            });
          }
        });
  
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=waitlist.pdf');
        res.send(Buffer.from(pdfBytes));
      }
    } else {
      // Fetch data with pagination
      const totalDocuments = await Waitlist.countDocuments(query);
      const totalPages = Math.ceil(totalDocuments / limit);

      const data = await Waitlist.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean()
        .exec();
      
      res.json({
        data,
        totalPages,
        totalDocuments
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving waitlist data', error });
  }
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

  const { page = 1, limit = 10, exportFormat, searchText } = req.query;
  const query = {};

  if (searchText) {
    query.$or = [
      { Name: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
      { Email: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
      { Message: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
      { Mobile: { $regex: searchText, $options: 'i' } }, // Case-insensitive search
    ];
  }
  
  try {
    if (exportFormat) {
      // Fetch all data for exporting
      const contactsData = await Contact.find(query, {_id: 0, __v: 0}).lean().exec();

      if (exportFormat === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(contactsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.xlsx');
        res.send(excelBuffer);
      } else if (exportFormat === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]); // Increase the height for more content
        const { width, height } = page.getSize();
        const fontSize = 12;
  
        page.drawText('Contacts', {
          x: 50,
          y: height - 30,
          size: 24,
          color: rgb(0, 0.53, 0.71),
        });
  
        // Define starting positions
        let yPosition = height - 60;
        const xPosition = 50;
  
        // Define column widths
        const columnWidths = [30, 100, 150, 100, 200];
        
        // Define headers
        const headers = ['#', 'Name', 'Email', 'Mobile', 'Message'];
  
        // Draw headers
        headers.forEach((header, index) => {
          page.drawText(header, {
            x: xPosition + columnWidths.slice(0, index).reduce((a, b) => a + b, 0),
            y: yPosition,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        });
  
        // Draw a line under headers
        yPosition -= 15;
        page.drawLine({
          start: { x: xPosition, y: yPosition },
          end: { x: xPosition + columnWidths.reduce((a, b) => a + b, 0), y: yPosition },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
  
        yPosition -= 10;
  
        // Draw table rows
        contactsData.forEach((entry, index) => {
          const row = [
            (index + 1).toString(),
            entry.Name,
            entry.Email,
            entry.Mobile,
            entry.Message,
          ];
  
          row.forEach((text, colIndex) => {
            page.drawText(text, {
              x: xPosition + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0),
              y: yPosition,
              size: fontSize,
              color: rgb(0, 0, 0),
            });
          });
  
          yPosition -= 20;
  
          // Draw a line under each row
          if (index < contactsData.length - 1) {
            page.drawLine({
              start: { x: xPosition, y: yPosition + 10 },
              end: { x: xPosition + columnWidths.reduce((a, b) => a + b, 0), y: yPosition + 10 },
              thickness: 0.5,
              color: rgb(0.7, 0.7, 0.7),
            });
          }
        });
  
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.pdf');
        res.send(Buffer.from(pdfBytes));
      }
    } else {
      // Fetch data with pagination
      const totalDocuments = await Contact.countDocuments(query);
      const totalPages = Math.ceil(totalDocuments / limit);

      const data = await Contact.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean()
        .exec();
      
      res.json({
        data,
        totalPages,
        totalDocuments
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving contact data', error });
  }
});

app.delete('/contact/:id', verifyToken, async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { id } = req.params;
  await Contact.deleteOne({ id })
 return  res.json({ message: 'Contact entry deleted successfully.' });
 
});



// Function to increment the counter
const incrementCounter = async () => {
  const counter = await Counter.findOne();
  if (counter) {
    counter.count += 1;
    await counter.save();
  } else {
    const newCounter = new Counter({ count: 401 });
    await newCounter.save();
  }
  console.log('Counter incremented:', counter ? counter.count : 401);
};

// Schedule the task to run every half hour
cron.schedule('*/30 * * * *', incrementCounter);


app.get('/counter', async (req, res) => {
  try {
    const counter = await Counter.findOne();
    if (counter) {
      res.json({ count: counter.count });
    } else {
      res.status(404).json({ message: 'Counter not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

incrementCounter()

app.use("/", (req, res) => {
  return res.json({ message: "Hello world" });
});

app.listen(3500, () => {
  console.log('listening on 3500');
});
