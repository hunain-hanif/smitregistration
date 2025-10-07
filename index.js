const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Suggestion } = require('dialogflow-fulfillment');
const express = require("express")
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb"); // <-- Add this line

// MongoDB connection URI and client setup
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority"; // Change this to your MongoDB URI if needed
const client = new MongoClient(uri);

let db;
client.connect()
  .then(() => {
    db = client.db("dialogflowDB"); // Use your DB name
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });

const app = express();
app.use(express.json())
app.use(cors());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/webhook", async (req, res) => {
  var id = (res.req.body.session).substr(43);
  console.log(id)
  const agent = new WebhookClient({ request: req, response: res });

  function hi(agent) {
    console.log(`intent  =>  hi`);
    agent.add("Hi from server")
  }

function available_courses(agent) {
    console.log("👉 Intent: available_courses");
    agent.add(`We offer the following IT courses:
1️⃣ Web & Mobile App Development
2️⃣ Graphic Designing
3️⃣ Data Science & AI
4️⃣ Cloud Computing
5️⃣ Cyber Security
Would you like to register for one of these?`);
  }

function course_information(agent) {
    console.log("👉 Intent: course_information");
    agent.add(`📘 Course Information:
Classes are held on weekdays, morning and evening batches.
Duration: 8–10 months.
Attendance is mandatory.
Basic computer knowledge is helpful but not required.`);
  }

  function register(agent) {

    const { number, any, lastname, phone, courses, email } = agent.parameters;
    agent.add(`✅ Registration complete!  
👤 Name: ${any} ${lastname}  
📞 Phone: ${phone || "Not provided"}  
📧 Email: ${email}  
📘 Course: ${courses}  
🔢 CNIC: ${number}  

Your ID card has been sent to your email.`)

    // Save to MongoDB
    if (db) {
      db.collection("register").insertOne({ number, any, lastname, phone, courses, email, timestamp: new Date() })
        .then(result => {
          console.log("Lead saved to MongoDB", result.insertedId);
        })
        .catch(err => {
          console.error("Error saving lead to MongoDB", err);
        });
    } else {
      console.error("No MongoDB connection");
    }

  }

  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', hi);
  intentMap.set('available_courses', available_courses);
  intentMap.set('course_information', course_information);
  intentMap.set('register', register);
  agent.handleRequest(intentMap);
})

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
