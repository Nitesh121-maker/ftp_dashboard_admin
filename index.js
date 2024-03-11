const express = require('express');
const mySql   = require('mysql');
const cors    = require('cors');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const nodemailer = require('nodemailer');

const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(cors());
app.use(express.json());
const fs = require('fs');
const { error } = require('console');
app.use(session({
  secret: 'super secret',
  resave: false,
  saveUninitialized: true,
}))
const con = mySql.createConnection({
    user: "root",
    host: "localhost",
    password: "",
    database: "ftp",
});
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).send({ message: 'Unauthorized' });
  }
};
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const clientId = req.body.clientId;
      const uploadPath = path.join(__dirname, 'src', 'files', clientId);
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  });
  
  const upload = multer({ storage });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'niteshdkbp806@gmail.com',
      pass: 'Nitesh@dkbp',
    },
  });


app.post('/clientlogin', function(req, res)  {
    const { clientid, password } = req.body;

    con.query(
        "SELECT * FROM clients WHERE clientId = ? AND 	clientPassword = ?",
        [clientid, password],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send({ message: "Internal server error" });
            } else {
                if (result.length === 1) {
                    const user = result[0];
                    const { clientId, clientPassword } = user; 
                    req.session.user = { clientId, clientPassword };
                    res.send({ clientid: clientId, password: clientPassword });
                    console.log('Session after Setting :', req.session.user.clientId ); 
                    console.log('User logged in successfully!');

                } else {
                    res.status(401).send({ message: "Invalid credentials" });
                }
            }
        }
    );
});


  
app.get('/getFileData/:clientid',function(req, res)  {
  try {
    const { clientId, clientPassword } = req.session.user;
    console.log('req.session.user::',req.session.user.clientId);
  } catch (error) {
    console.log(error);
  }
  const clientid = req.params.clientid;


  // if (!req.session.user || req.session.user.clientId !== req.params.clientid) {
  //   console.log('Unauthorized access to Client Data. Session:', req.session);
  //   res.status(401).send({ message: 'Unauthorized' });
  //   return;
  // }
  con.query(`SELECT * FROM \`${clientid}\``, (err, result) => {
      if (err) {
        console.error('Error querying MySQL:', err);
        res.status(500).send({ message: 'Internal server error' });
        return;
      }
      console.log(result);
      res.send(result);
    });
});
  

// Download Files
app.get('/download/:clientid/:file_name', (req, res) => {

  const { clientid, file_name } = req.params;
  const filePath = path.join(__dirname, '..', '..', 'ftp_cms', 'server', 'src', 'files', clientid, file_name);
  console.log('File Path:', filePath);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Set the appropriate headers for the response
    res.setHeader('Content-disposition', `attachment; filename=${file_name}`);
    res.setHeader('Content-type', 'application/octet-stream');

    // Create a read stream from the file and pipe it to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    // If the file doesn't exist, send a 404 response
    res.status(404).send('File not found');
  }
});


// Search Data by month

app.post('/search/:clientid/:fileMonth', (req, res) => {
  const { clientid } = req.params;
  const { month } = req.body;
  console.log("Month",month)
  con.query(`SELECT * FROM \`${clientid}\` WHERE file_month = ?`,
    [month], (error, results) => {
      if (!error) {
        console.log("The data of " + month + " has been returned");
        res.send(results);  // Use results instead of res.results
      } else {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    }
  );
});



app.post('/client-logout', (req, res) => {
  // Clear the session to log the user out
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).send({ message: 'Logout failed' });
    } else {
      res.status(200).send({ message: 'Logout successful' });
    }
  });
});


app.listen(3004, '192.168.1.3', () => {
    console.log("Server is listening on port 3004");
});
