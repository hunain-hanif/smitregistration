const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// === MongoDB Connection ===
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
let db;

client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// === Express Setup ===
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

// === Default Route ===
app.get("/", (req, res) => res.send("🚀 Webhook Running"));

// === Dialogflow Webhook ===
app.post("/webhook", async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  // === INTENTS ===
  function hi(agent) {
    console.log("👉 Intent: hi");
    agent.add("Hello! 👋 Welcome to SMIT registration.");
  }

  function available_courses(agent) {
    agent.add(`We offer the following IT courses:
1️⃣ Web & Mobile App Development
2️⃣ Graphic Designing
3️⃣ Data Science & AI
4️⃣ Cloud Computing
5️⃣ Cyber Security
Would you like to register for one of these?`);
  }

  function course_information(agent) {
    agent.add(`📘 Course Information:
Classes are held weekdays (morning & evening batches).
Duration: 8–10 months.
Attendance is mandatory.`);
  }

  // === REGISTER INTENT ===
  async function register(agent) {
    console.log("👉 Intent: register");

    // Extract & clean parameters
    const { number, any, lastname, phone, courses, email } = agent.parameters;
    const clean = {
      number: Array.isArray(number) ? number[0] : number,
      name: Array.isArray(any) ? any[0] : any,
      lastname: Array.isArray(lastname) ? lastname[0] : lastname,
      phone: Array.isArray(phone) ? phone[0] : phone,
      courses: Array.isArray(courses) ? courses[0] : courses,
      email: Array.isArray(email) ? email[0] : email,
      timestamp: new Date(),
    };

    console.log("📦 Clean Data:", clean);

    // 🟢 Respond to Dialogflow first (so no timeout)
    agent.add(`✅ Registration received!  
👤 ${clean.name} ${clean.lastname}  
📧 ${clean.email}  
Your confirmation email will arrive soon!`);

    // 🔵 Process saving + email in background (non-blocking)
    setTimeout(async () => {
      try {
        // Save to MongoDB
        if (db) {
          const result = await db.collection("register").insertOne(clean);
          console.log("✅ Saved to MongoDB:", result.insertedId);
        }

        // Send Email
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "webwisdom35@gmail.com",
            pass: "onqr zypr bjod actg", // Gmail App Password
          },
        });

        const htmlBody = `
        <div style="width: 350px; border: 2px solid #000; font-family: Arial; padding: 20px;">
          <img style="display:block;margin:auto" width="150" height="150"
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="">
          <h3 style="text-align:center;">SMIT Registration Card</h3>
          <p><strong>Name:</strong> ${clean.name}</p>
          <p><strong>Father Name:</strong> ${clean.lastname}</p>
          <p><strong>CNIC:</strong> ${clean.number}</p>
          <p><strong>Course:</strong> ${clean.courses}</p>
          <p><strong>Phone:</strong> ${clean.phone}</p>
          <p><strong>Email:</strong> ${clean.email}</p>
          <hr>
          <p style="font-size:12px;text-align:center;">This card is valid for SMIT's premises only.<br>If found, please return to SMIT.</p>
        </div>
        `;

        const info = await transporter.sendMail({
          from: '"SMIT Registration" <webwisdom35@gmail.com>',
          to: clean.email,
          subject: "🎓 SMIT Registration Confirmation",
          html: htmlBody,
        });

        console.log("📧 Email sent:", info.messageId);
      } catch (err) {
        console.error("❌ Background error:", err);
      }
    }, 500);
  }

  // === Intent Map ===
  const intentMap = new Map();
  intentMap.set("Default Welcome Intent", hi);
  intentMap.set("available_courses", available_courses);
  intentMap.set("course_information", course_information);
  intentMap.set("register", register);

  agent.handleRequest(intentMap);
});

// === Start Server ===
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
