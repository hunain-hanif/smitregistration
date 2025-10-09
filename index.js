const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// MongoDB connection setup
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;

// Connect MongoDB
client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => {
    console.error("❌ Failed to connect to MongoDB", err);
  });

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("🚀 SMIT Registration Webhook Running...");
});

app.post("/webhook", async (req, res) => {
  const id = (req.body.session || "").substr(43);
  console.log("🆔 Session ID:", id);

  const agent = new WebhookClient({ request: req, response: res });

  // ---- INTENTS ----
  function hi(agent) {
    console.log(`👉 Intent: hi`);
    agent.add("Hello! 👋 Welcome to SMIT registration.");
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

  async function register(agent) {
    console.log("👉 Intent: register triggered");

    // Get parameters
    const { number, any, lastname, phone, courses, email } = agent.parameters;

    // Fix: Extract first value if it’s an array
    const cleanData = {
      number: Array.isArray(number) ? number[0] : number,
      name: Array.isArray(any) ? any[0] : any,
      lastname: Array.isArray(lastname) ? lastname[0] : lastname,
      phone: Array.isArray(phone) ? phone[0] : phone,
      courses: Array.isArray(courses) ? courses[0] : courses,
      email: Array.isArray(email) ? email[0] : email,
      timestamp: new Date(),
    };

    console.log("📦 Cleaned Data:", cleanData);

    agent.add(`✅ Registration complete!  
👤 Name: ${cleanData.name} ${cleanData.lastname}  
📞 Phone: ${cleanData.phone || "Not provided"}  
📧 Email: ${cleanData.email}  
📘 Course: ${cleanData.courses}  
🔢 CNIC: ${cleanData.number}  

Your ID card has been sent to your email.`);

    if (db) {
      try {
        const result = await db.collection("register").insertOne(cleanData);
        console.log("✅ Lead saved to MongoDB:", result.insertedId);
      } catch (err) {
        console.error("❌ Error saving to MongoDB:", err);
      }
    } else {
      console.error("❌ No MongoDB connection available.");
    }
  }

  // ---- Intent Map ----
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', hi);
  intentMap.set('available_courses', available_courses);
  intentMap.set('course_information', course_information);
  intentMap.set('register', register);

  agent.handleRequest(intentMap);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
