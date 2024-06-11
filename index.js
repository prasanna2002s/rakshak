const express = require('express');

const app = express();
const nodemailer = require("nodemailer");
const path = require('path'); 

const body_parser = require('body-parser');
const twilio = require('twilio');

const session = require('express-session');

const { exec } = require('child_process');
const { spawn } = require('child_process');

app.use(body_parser.urlencoded({ extended : true }));

app.use(body_parser.json());

//middleware for serving static file
app.use(express.static('public'));

//Set up EJS as template engine
app.set('view engine', 'ejs');

const { ObjectId } = require('mongodb');
const { MongoClient } = require("mongodb")
const uri = "mongodb+srv://admin:admin@cluster0.zpqnfe9.mongodb.net/"
const client = new MongoClient(uri);
const db = client.db('Rakshak');


const connectToDatabase = async () => {
  try {
      await client.connect();
      console.log("Connected to MongoDB")
      }
      catch
      {
          console.log("err");
      }

};

const main = async () => {
  try {
      await connectToDatabase();
  }
  catch (err) {
      console.error('error');
  }
  finally {
      await client.close();
  }
};

//running database 
main();



//---------------------- Javascript to python Communicator ------------------------------------- 

app.post('/run-python', async (req, res) => {
  try {

      const serializedData = JSON.stringify(req.body.data); // Assuming data is already in JSON format
      console.log("Data received from user", serializedData);
      
      const pythonCode = `
from openai import AzureOpenAI
import json
import sys

# Read the serialized data from standard input
data_received = json.loads(sys.stdin.readline())

client = AzureOpenAI(
  azure_endpoint="https://skill-ont.openai.azure.com/",
  api_key="1676a0813fa646f8af1b1badf8bb2b47",
  api_version="2024-02-15-preview"
)

message_text = [{"role": "system", "content": data_received}]

completion = client.chat.completions.create(
  model="skills_ont",
  messages=message_text,
  temperature=0.5,
  max_tokens=800,
  top_p=0.95,
  frequency_penalty=0,
  presence_penalty=0,
  stop=None
)

ans = str(completion.choices[0])
st = ans.find("content") + 9
end = ans.find("assistant") - 9
ans = ans[st:end]

print(ans)
`;
      
      // Execute Python code using exec
      const pythonProcess = exec(`echo '${serializedData}' | python3 -c '${pythonCode}'`, (error, stdout, stderr) => {
          if (error) {
              console.error(`Error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.error(`stderr: ${stderr}`);
              return;
          }
          console.log(`Python output: ${stdout}`);
          res.json({ output: stdout });
      });
      

  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: `Error: ${error.message}` });
  }
});


//-------------------------------------------------------------------------------




//Set up Session Middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

login_error = 'none'

app.get('/', (req, res) => {

  res.render('login', { login_error: req.session.login_error });
  
});

app.post('/signup',async (req,res)=>{

  //personal details

  var User_Name  = req.body.name;
  var User_DOB = req.body.dob;

  var User_Gender = req.body.gender;
  var User_Email = req.body.email;
  var User_Phone = req.body.phone;
  var User_PWD  = req.body.pwd;
  
  
  //Emergency Contact - 1
  var c1_name = req.body.name1;
  var c1_email = req.body.email1;
  var c1_phone = req.body.phone1;


  //Emergency Contact - 2 
  var c2_name = req.body.name2;
  var c2_email = req.body.email2;
  var c2_phone = req.body.phone2;

  //Emergency Contact - 3
  var c3_name = req.body.name3;
  var c3_email = req.body.email3;
  var c3_phone = req.body.phone3;


  try
  {
        // Connect to MongoDB
        await client.connect();

        // Access the database and collection
        const collection = db.collection('Profiles');

        const result = await collection.insertOne({
          Name : User_Name,
          DOB: User_DOB,
          Gender : User_Gender,
          Email : User_Email,
          Phone : User_Phone,
          pwd : User_PWD,
          EmergencyContacts:
          [
            {
              Name:c1_name,
              Email:c1_email,
              Phone:c1_phone
            },
            {
              Name:c2_name,
              Email:c2_email,
              Phone:c2_phone
            },
            {
              Name:c3_name,
              Email:c3_email,
              Phone:c3_phone
            }
          ]

        });
        await client.close();

        res.render('success');

  }
  catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    res.redirect('/');
  }


})



app.post('/signin',async(req,res)=>{
  
  var username = req.body.username;
  var password = req.body.password;

  try{
   
        // Connect to MongoDB
        await client.connect();

        // Access the database and collection
        const collection = db.collection('Profiles');

        // Query document with Candidate_ID and Candidate_Password
        const result = await collection.findOne({ Email: username, pwd : password });

        // Close the connection
        await client.close();

        if (result) {
            // Credentials matched, set session and redirect
            req.session.username = username;
            req.session.user = result;
            res.redirect('/home');
        } else {
            // Credentials not matched, redirect to login page with error
            req.session.login_error = "error";
            res.redirect('/');
        }
  }
  catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    res.redirect('/');
  }

})

//logout area 
app.get('/logout', (req, res) => {
  req.session.login_error = "none";
  req.session.destroy(err => {
      res.redirect('/');
  });
});

app.get('/success', (req,res)=>{
  res.render('success');
})




var currentDate = new Date();
var currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();
const currentDayOfMonth = currentDate.getDate();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${day}-${month}-${currentYear}`;

//Continoulsy store the location

app.post('/save-data-latlang', async (req, res) => {
  try {
      // Access the data sent from the client
      const data = (req.body.data);

      // Connect to MongoDB
      await client.connect();

      const collection = db.collection("Logs");
      
      const currentTime = new Date();
      const hours = currentTime.getHours().toString().padStart(2, '0');
      const minutes = currentTime.getMinutes().toString().padStart(2, '0');
      const seconds = currentTime.getSeconds().toString().padStart(2, '0');
      const current_time = `${hours}:${minutes}:${seconds}`;

      const result = await collection.updateOne({ Email: req.session.user.Email, Status:{$eq:"Pending"} }, 
      { $set: 
        { 
          Latitude:data.Latitude,
          Longitude:data.Longitude,
          Location:data.Location,
          Last_Updated:current_time 
        } 
      });

      await client.close();


      // Close the connection
      // Send a success response to the client
      res.sendStatus(200);
  } catch (error) {
      console.error('Error saving data to MongoDB:', error);
      // Send an error response to the client
      res.status(500).send('Internal Server Error');
  }
});

app.post('/save-data-add', async (req, res) => {
  try {
      // Access the data sent from the client
      const data = (req.body.data);
      console.log(data)
      // Connect to MongoDB
      await client.connect();

      const collection = db.collection("Logs");
      
      // Get current date and time in UTC
      const currentDate = new Date();

      // Adjust the time zone offset to GMT+5:30
      currentDate.setUTCHours(currentDate.getUTCHours() + 5);
      currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 30);

      // Format the date
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0'); // Month is zero-based
      const year = currentDate.getUTCFullYear();

      // Format the time
      const hours = String(currentDate.getUTCHours()).padStart(2, '0');
      const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');

      // Construct the formatted date and time string
      const current_time = `${day}-${month}-${year} ${hours}:${minutes}`;

      const result = await collection.updateOne({ Email: req.session.user.Email, Status:{$eq:"Pending"} }, 
      { $set: 
        { 
          Address : data,
          Last_Updated:current_time 
        } 
      });


      // Close the connection
      // Send a success response to the client
      res.sendStatus(200);
  } catch (error) {
      console.error('Error saving data to MongoDB:', error);
      // Send an error response to the client
      res.status(500).send('Internal Server Error');
  }
});



//---------- send mail from gmail account--------------











app.post('/User_Help', async(req, res) => {

  req.session.login_error = 'none'

// Get current date and time in UTC
const currentDate = new Date();

// Adjust the time zone offset to GMT+5:30
currentDate.setUTCHours(currentDate.getUTCHours() + 5);
currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 30);

// Format the date
const day = String(currentDate.getUTCDate()).padStart(2, '0');
const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0'); // Month is zero-based
const year = currentDate.getUTCFullYear();

// Format the time
const hours = String(currentDate.getUTCHours()).padStart(2, '0');
const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');

// Construct the formatted date and time string
const current_time = `${day}-${month}-${year} ${hours}:${minutes}`;


const { latitude,longitude,location_link,Address} = req.body;
log_info = {
  RequestBy : req.session.user.Name,
  Email : req.session.user.Email,
  Latitude : latitude,
  Longitude : longitude,
  Location : location_link,
  Address : Address,
  EmergencyContacts: req.session.user.EmergencyContacts,
  RequestOn: formattedDate,
  Status : "Pending",

  Last_Updated : current_time

};
req.session.log_info = log_info


  try
  {

      // Connect to MongoDB
      await client.connect();

      const collection = db.collection("Logs");

      const result = await collection.insertOne(req.session.log_info);

      setTimeout(async ()=>{await client.close();},3000);


      let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'rakshak.emergencies@gmail.com',
            pass: 'dtnzxihoflzugfjl'
        }
    });
    R1ID = new ObjectId();
    R1ID = R1ID.toString();

    var html = `

    <p>Hi, ${req.session.user.EmergencyContacts[0].Name} </p>
    <p>Your freind <b>${req.session.user.Name}</b> got into a serious trouble </p> 
    <p> Here is the details of his current location</p>
    <p><b>Latitude:</b> ${latitude} </p>
    <p><b>Longitude:</b> ${longitude} </p>

    <p> Here is your freind live location few minutes ago: </p>
    <p> Address : ${Address} </p>

    <img src=${location_link}></img>


    <br><br><br>
    <p> Hope everything will be set right !! </p>
    <p>Team Rakshak </p>
    

    <small>The information contained in this electronic message and any attachments to this message are intended for the exclusive use of the addressee(s) and may contain proprietary, confidential or privileged information. If you are not the intended recipient, you should not disseminate, distribute, or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. WARNING: The recipient of this email should scan this email and all its attachments. Though we are secure, emails can be intercepted, lost, destroyed, corrupted, contain viruses, or arrive late or incomplete. The sender does not accept liability for any errors or omissions in the contents of this message, which arise because of the email transmission. </small>
    `;

    // Email message options
    let mailOptions1 = {
        from: 'rakshak.emergencies@gmail.com',
        to: req.session.user.EmergencyContacts[0].Email,
        subject: `⚠️ Emergency!! Your friend got into a danger ; #RequestID:${R1ID}`,
        html
    };

    R2ID = new ObjectId();
    R2ID = R2ID.toString();


    var html = `

    <p>Hi, ${req.session.user.EmergencyContacts[1].Name} </p>
    <p>Your freind <b>${req.session.user.Name}</b> got into a serious trouble </p> 
    <p> Here is the details of his current location</p>
    <p><b>Latitude:</b> ${latitude} </p>
    <p><b>Longitude:</b> ${longitude} </p>

    <p> Here is your freind live location few minutes ago: </p>
    <p> Address : ${Address} </p>

    <img src=${location_link}></img>


    <br><br><br>
    <p> Hope everything will be set right !! </p>
    <p>Team Rakshak </p>
    

    <small>The information contained in this electronic message and any attachments to this message are intended for the exclusive use of the addressee(s) and may contain proprietary, confidential or privileged information. If you are not the intended recipient, you should not disseminate, distribute, or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. WARNING: The recipient of this email should scan this email and all its attachments. Though we are secure, emails can be intercepted, lost, destroyed, corrupted, contain viruses, or arrive late or incomplete. The sender does not accept liability for any errors or omissions in the contents of this message, which arise because of the email transmission. </small>
    `;



    let mailOptions2 = {
      from: 'rakshak.emergencies@gmail.com',
      to: req.session.user.EmergencyContacts[1].Email,
      subject: `⚠️ Emergency!! Your friend got into a danger ; #RequestID:${R2ID}`,
      html
    };

    R3ID = new ObjectId();
    R3ID = R3ID.toString();


    var html = `

    <p>Hi, ${req.session.user.EmergencyContacts[2].Name} </p>
    <p>Your freind <b>${req.session.user.Name}</b> got into a serious trouble </p> 
    <p> Here is the details of his current location</p>
    <p><b>Latitude:</b> ${latitude} </p>
    <p><b>Longitude:</b> ${longitude} </p>

    <p> Here is your freind live location few minutes ago: </p>
    <p> Address : ${Address} </p>

    <img src=${location_link}></img>


    <br><br><br>
    <p> Hope everything will be set right !! </p>
    <p>Team <b>Rakshak</b> </p>
    

    <small>The information contained in this electronic message and any attachments to this message are intended for the exclusive use of the addressee(s) and may contain proprietary, confidential or privileged information. If you are not the intended recipient, you should not disseminate, distribute, or copy this e-mail. Please notify the sender immediately and destroy all copies of this message and any attachments. WARNING: The recipient of this email should scan this email and all its attachments. Though we are secure, emails can be intercepted, lost, destroyed, corrupted, contain viruses, or arrive late or incomplete. The sender does not accept liability for any errors or omissions in the contents of this message, which arise because of the email transmission. </small>
    `;

    let mailOptions3 = {
      from: 'rakshak.emergencies@gmail.com',
      to: req.session.user.EmergencyContacts[2].Email,
      subject: `⚠️ Emergency!! Your friend got into a danger ; #RequestID:${R3ID} `,
      html
  };


    // Send mail with defined transport object
    transporter.sendMail(mailOptions1, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
    transporter.sendMail(mailOptions2, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);
     });  
    transporter.sendMail(mailOptions3, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);

      res.redirect('/help-desk')
    });

  }
  catch(error)
  {
    console.log("err",error)
  }
});



app.get('/home', async (req, res) => {

  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (!req.session.username) {
      return res.redirect('/');
  }

  try {
      await client.connect();
      const collection = db.collection('Logs');
      const result = await collection.findOne({ Email: req.session.user.Email, Status:{$eq:"Pending"} });

      if (result) {
          res.redirect('/help-desk');
      } else {
          const user = req.session.user;
          res.render('home', { user });
      }
  } catch (error) {
      console.log("Error:", error);
      // Handle error appropriately, perhaps send an error response
      res.redirect('/home');
    } finally {
  }
});

app.get('/help-desk', async (req, res) => {

  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
      if (!req.session.username) {
          return res.redirect('/');
      }

      // Connect to MongoDB
      await client.connect();

      // Access the database and collection
      const collection = db.collection('Logs');
      const result = await collection.findOne({ Email: req.session.user.Email, Status:{$eq:"Pending"} });

      if (result) {
          const user = req.session.user;
          const log_info = req.session.log_info;
          res.render('help-desk', { user, log_info });
      } else {
          res.redirect('/home');
      }
  }
  catch (error) {
      console.log(error);
      res.redirect('/home');
  } 
  finally {
      await client.close();
  }

});


app.get('/Requests',async (req,res)=>{

  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
    

  login_error = 'none'

  if(req.session.username)
  {
  try
  {
    // Connect to MongoDB
    await client.connect();

    // Access the database and collection
    const collection = db.collection('Logs');

    const result = await collection.find({ $or : [{"EmergencyContacts.0.Email":req.session.user.Email},{"EmergencyContacts.1.Email":req.session.user.Email},{"EmergencyContacts.2.Email":req.session.user.Email}],Status:{$eq:"Pending"} }).toArray();

    // Close the connection
    await client.close();
    var user = req.session.user

    res.render('Requests',{result,user})
    await client.close();

  }
  catch (error)
  {
    res.redirect('/home');
  }
  }
  else
  {
    res.redirect('/')
  }

})

app.post('/delete_request', async(req,res)=>{

  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
    
  const {Email} = req.body
  console.log(Email)

  try {
    if (!req.session.username) {
        return res.redirect('/');
    }

    // Connect to MongoDB
    await client.connect();

    // Access the database and collection
    const collection = db.collection('Logs');
    const result = await collection.updateOne({ Email: Email, Status:"Pending"} ,{$set:{Status:"Resolved"}});

    res.redirect('/home')

}
catch (error) {
    console.log(error);
    res.redirect('/help-desk');
} 
finally {
    await client.close();
}

})




app.listen(5454, () => {
  console.log("Server is started .....")
});
