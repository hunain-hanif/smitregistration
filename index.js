const express = require("express");
const cors = require("cors");
const { WebhookClient } = require("dialogflow-fulfillment");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");

// === MongoDB ===
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
let db;

client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("✅ MongoDB connected");
  })
  .catch(err => console.error("❌ MongoDB error:", err));

// === Express ===
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

app.get("/", (_, res) => res.send("🚀 Webhook running"));

// === Webhook ===
app.post("/webhook", async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  // --- INTENTS ---
  function hi(agent) {
    agent.add("👋 Hello! Welcome to SMIT registration.");
  }

  function available_courses(agent) {
    agent.add(`📘 Available Courses:
1️⃣ Web & Mobile App Development
2️⃣ Graphic Designing
3️⃣ Data Science & AI
4️⃣ Cloud Computing
5️⃣ Cyber Security`);
  }

  function course_information(agent) {
    agent.add(`🧠 Classes are held weekdays (morning/evening).
Duration: 8–10 months. Attendance mandatory.`);
  }

  async function register(agent) {
    const { number, any, lastname, phone, courses, email } = agent.parameters;

    const data = {
      name: Array.isArray(any) ? any[0] : any,
      fatherName: Array.isArray(lastname) ? lastname[0] : lastname,
      cnic: Array.isArray(number) ? number[0] : number,
      phone: Array.isArray(phone) ? phone[0] : phone,
      course: Array.isArray(courses) ? courses[0] : courses,
      email: Array.isArray(email) ? email[0] : email,
      timestamp: new Date(),
    };

    console.log("📦 Received:", data);

    // Respond immediately to Dialogflow to prevent timeout
    agent.add(`✅ Registration received!
👤 ${data.name} ${data.fatherName}
📧 ${data.email}
📘 ${data.course}
Your confirmation email will arrive soon.`);

    // Background async task (MongoDB + Nodemailer)
    (async () => {
      try {
        // Save to MongoDB
        if (db) {
          await db.collection("register").insertOne(data);
          console.log("✅ Saved to MongoDB");
        }

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "webwisdom35@gmail.com",
            pass: "onqr zypr bjod actg", // your Gmail app password
          },
        });

        // Email HTML
        const html = `
        <div style="width:320px;border:2px solid #000;padding:20px;font-family:Arial">
          <img style="display:block;margin:auto" width="150"
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="">
          <h3 style="text-align:center;">🎓 SMIT Registration</h3>
          <p><b>Name:</b> ${data.name}</p>
          <p><b>Father Name:</b> ${data.fatherName}</p>
          <p><b>CNIC:</b> ${data.cnic}</p>
          <p><b>Course:</b> ${data.course}</p>
          <p><b>Phone:</b> ${data.phone}</p>
          <p><b>Email:</b> ${data.email}</p>
          <hr>
          <p style="font-size:12px;text-align:center;">Valid for SMIT’s premises only.</p>
        </div>`;

        const info = await transporter.sendMail({
          from: '"SMIT Registration" <webwisdom35@gmail.com>',
          to: data.email,
          subject: "🎓 SMIT Registration Confirmation",
          html,
        });

        console.log("📧 Email sent:", info.messageId);
      } catch (err) {
        console.error("❌ Background process failed:", err);
      }
    })();
  }

  // === Intent Map ===
  const intentMap = new Map([
    ["Default Welcome Intent", hi],
    ["available_courses", available_courses],
    ["course_information", course_information],
    ["register", register],
  ]);

  agent.handleRequest(intentMap);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
