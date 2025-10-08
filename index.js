const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

// === MongoDB Connection ===
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
let db;

async function connectDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db("dialogflowDB");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
connectDB();

// === Default Route ===
app.get("/", (req, res) => res.send("🚀 Webhook Running"));

// === Dialogflow Webhook ===
app.post("/webhook", async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function hi(agent) {
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

  async function register(agent) {
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

    agent.add(`✅ Registration received!  
👤 ${clean.name} ${clean.lastname}  
📧 ${clean.email}  
Your confirmation email will arrive soon!`);

    // === Background save + email ===
    try {
      if (!db) return console.error("❌ No DB connection yet");

      const result = await db.collection("register").insertOne(clean);
      console.log("✅ Saved to MongoDB:", result.insertedId);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "webwisdom35@gmail.com",
          pass: "onqr zypr bjod actg", // Gmail App Password
        },
      });

      const htmlBody = `
        <div style="border:2px solid #000;padding:15px;font-family:Arial">
          <h3>🎓 SMIT Registration Card</h3>
          <p><strong>Name:</strong> ${clean.name} ${clean.lastname}</p>
          <p><strong>CNIC:</strong> ${clean.number}</p>
          <p><strong>Phone:</strong> ${clean.phone}</p>
          <p><strong>Course:</strong> ${clean.courses}</p>
          <p><strong>Email:</strong> ${clean.email}</p>
        </div>`;

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
  }

  const intentMap = new Map([
    ["Default Welcome Intent", hi],
    ["available_courses", available_courses],
    ["course_information", course_information],
    ["register", register],
  ]);
  agent.handleRequest(intentMap);
});

// === Start Server ===
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
