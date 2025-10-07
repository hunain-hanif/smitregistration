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

// Connect to MongoDB
client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => {
    console.error("❌ Failed to connect to MongoDB", err);
  });

// === Express App Setup ===
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("🚀 SMIT Registration Webhook Running Successfully!");
});

// === Dialogflow Webhook ===
app.post("/webhook", async (req, res) => {
  const id = (req.body.session || "").substr(43);
  console.log("🆔 Session ID:", id);

  const agent = new WebhookClient({ request: req, response: res });

  // === INTENTS ===
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
Classes are held on weekdays (morning & evening batches).
Duration: 8–10 months.
Attendance is mandatory.
Basic computer knowledge is helpful but not required.`);
  }

  // === REGISTER INTENT ===
  async function register(agent) {
    console.log("👉 Intent: register triggered");

    // Extract parameters
    const { number, any, lastname, phone, courses, email } = agent.parameters;

    // Fix arrays (Dialogflow often sends single values as arrays)
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

    // === Send Confirmation Message to Dialogflow ===
    agent.add(`✅ Registration Complete!  
👤 Name: ${cleanData.name} ${cleanData.lastname}  
📞 Phone: ${cleanData.phone || "Not provided"}  
📧 Email: ${cleanData.email}  
📘 Course: ${cleanData.courses}  
🔢 CNIC: ${cleanData.number}  

Your ID card has been sent to your email. Please check your inbox! 📩`);

    // === Save Data to MongoDB ===
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

    // === Nodemailer Email Sending ===
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for port 465, false for others
        auth: {
          user: "webwisdom35@gmail.com",
          pass: "yghh jqwm oklq onek", // your Gmail app password
        },
      });

      const htmlBody = `
      <div style="width: 350px; border: 2px solid #000; font-family: Arial, sans-serif; padding: 20px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
        <img style="display:block; margin: 0 auto;" width="150px" height="150px"
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="SMIT Logo" />

        <h2 style="text-align:center;">SMIT Registration ID Card</h2>
        <p><strong>Name:</strong> ${cleanData.name}</p>
        <p><strong>Father Name:</strong> ${cleanData.lastname}</p>
        <p><strong>CNIC:</strong> ${cleanData.number}</p>
        <p><strong>Course:</strong> ${cleanData.courses}</p>
        <p><strong>Phone:</strong> ${cleanData.phone}</p>
        <p><strong>Email:</strong> ${cleanData.email}</p>

        <hr>
        <div style="font-size: 12px; text-align: center;">
          <p><strong>Note:</strong> This card is valid for SMIT's premises only. <br>
          If found, please return to SMIT.</p>
          <p><strong>Issuing Authority: SMIT</strong></p>
        </div>
      </div>
      `;

      const info = await transporter.sendMail({
        from: '"SMIT Registration" <webwisdom35@gmail.com>',
        to: cleanData.email,
        subject: "🎓 SMIT Registration Confirmation",
        html: htmlBody,
      });

      console.log("📧 Email sent successfully:", info.messageId);
    } catch (err) {
      console.error("❌ Error sending email:", err);
    }
  }

  // === INTENT MAP ===
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', hi);
  intentMap.set('available_courses', available_courses);
  intentMap.set('course_information', course_information);
  intentMap.set('register', register);

  agent.handleRequest(intentMap);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
