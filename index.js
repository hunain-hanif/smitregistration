const dialogflow = require('@google-cloud/dialogflow');
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");
const { WebhookClient } = require("dialogflow-fulfillment");


const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true, // helps if SSL issue occurs
});

let db;

// Connect to MongoDB once at startup
async function connectToMongo() {
  try {
    await client.connect();
    db = client.db("dialogflowDB"); // Database name
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

connectToMongo();

// Test route
app.get("/", (req, res) => {
  res.send("🚀 SMIT Registration Webhook is running...");
});

// Webhook route
app.post("/webhook", async (req, res) => {
  console.log("📩 Webhook request received...");

  const agent = new WebhookClient({ request: req, response: res });

  // ---- INTENTS ----
  function hi(agent) {
    console.log("👉 Intent: hi");
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

  // ---- REGISTER INTENT ----
  async function register(agent) {
    console.log("👉 Intent: register triggered");

    if (!db) {
      console.error("❌ Database not connected");
      agent.add("Database connection error. Please try again later.");
      return;
    }

    // Extract Dialogflow parameters
    const { number, any, lastname, phone, courses, email } = agent.parameters || {};
    console.log("📦 Parameters:", { number, any, lastname, phone, courses, email });

    // Basic validation
    if (!any || !lastname || !number || !email || !courses) {
      agent.add("⚠️ Some details are missing. Please provide your full name, CNIC, course, and email.");
      return;
    }

    try {
      // Save user data in MongoDB
      const registration = {
        name: any,
        lastname,
        cnic: number,
        phone,
        course: courses,
        email,
        createdAt: new Date(),
      };

      const result = await db.collection("registration").insertOne(registration);
      console.log("✅ Data saved to MongoDB:", result.insertedId);

      // Send confirmation email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "webwisdom35@gmail.com",
          pass: "onqr zypr bjod actg",
        },
      });

      const mailOptions = {
        from: "webwisdom35@gmail.com",
        to: email,
        subject: "🎓 SMIT Registration Confirmation",
        html: `
          <div style="border: 2px solid #000; width: 300px; padding: 15px; font-family: Arial;">
            <h3 style="text-align:center;">SMIT Registration Card</h3>
            <p><strong>Name:</strong> ${any}</p>
            <p><strong>Father's Name:</strong> ${lastname}</p>
            <p><strong>CNIC:</strong> ${number}</p>
            <p><strong>Course:</strong> ${courses}</p>
            <hr/>
            <p style="font-size: 12px; text-align:center;">
              Note: This card is for SMIT premises only. If found, please return to SMIT.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("📧 Email sent to:", email);

      agent.add(`✅ Registration complete!  
👤 Name: ${any} ${lastname}  
📞 Phone: ${phone || "Not provided"}  
📧 Email: ${email}  
📘 Course: ${courses}  
🔢 CNIC: ${number}  

Your ID card has been sent to your email.`);

    } catch (error) {
      console.error("❌ Error during registration:", error);
      agent.add("An error occurred while saving your registration. Please try again later.");
    }
  }

  // ---- INTENT MAP ----
  const intentMap = new Map();
  intentMap.set("hi", hi);
  intentMap.set("available_courses", available_courses);
  intentMap.set("course_information", course_information);
  intentMap.set("register", register);

  try {
    await agent.handleRequest(intentMap);
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ---- SERVER START ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
