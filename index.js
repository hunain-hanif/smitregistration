const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb"); // MongoDB driver

// ====== MongoDB Connection ======
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority&appName=smit-registration-dialogflow";
const client = new MongoClient(uri);
let db;

client.connect()
  .then(() => {
    db = client.db("dialogflowDB"); // database name
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => {
    console.error("❌ Failed to connect to MongoDB", err);
  });

// ====== Express Setup ======
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ====== Webhook ======
app.post("/webhook", async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  console.log("🔥 Webhook triggered for intent:", agent.intent);

  // === Intent Handlers ===
  function hi(agent) {
    console.log("👉 Intent: hi");
    agent.add("Hello! 👋 Welcome to SMIT registration.");
  }

  function available_courses(agent) {
    console.log("👉 Intent: available_courses");
    agent.add(`We offer the following IT courses:
1. Web & Mobile App Development
2. Graphic Designing
3. Data Science & AI
4. Cloud Computing
5. Cyber Security
Let me know if you would like to register!
`);
  }

  function course_information(agent) {
    console.log("👉 Intent: course_information");
    agent.add(`Classes are held weekdays in the morning and evening batches.
Duration: 8-10 months.
Basic computer knowledge is recommended but not required.
Attendance is mandatory.
`);
  }

  async function register(agent) {
    console.log("👉 Intent: register");
    console.log("📥 Parameters received:", agent.parameters);

    const { number, any, lastname, phone, courses, email } = agent.parameters;
    const courseName = Array.isArray(courses) ? courses[0] : courses;

    // === Nodemailer Setup ===
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "webwisdom35@gmail.com",
        pass: "onqr zypr bjod actg", // App password, not Gmail password
      },
    });

    // === Data to Save ===
    const rowData = {
      name: any,
      fatherName: lastname,
      email: email,
      phoneNumber: phone,
      cnic: number,
      course: courseName,
      registrationTime: new Date()
    };

    // === ID Card HTML ===
    const htmlContent = `
      <div style="width: 300px; height: 420px; border: 2px solid #000; font-family: Arial, sans-serif; padding: 20px; position: relative; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
        <img style="padding-left: 72px;" width="150px" height="150px" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="">
        <p><strong>Name:</strong> ${any}</p>
        <p><strong>Father Name:</strong> ${lastname}</p>
        <p><strong>CNIC:</strong> ${number}</p>
        <p><strong>Course:</strong> ${courseName}</p>
        <div style="margin-top: 40px; font-size: 12px; text-align: center;">
          <p><strong>Note:</strong> This card is for SMIT's premises only.<br>If found please return to SMIT</p>
        </div>
        <div style="height: 1px; background-color: black; margin: 20px 0;"></div>
        <div style="text-align: center; font-size: 12px;">
          <strong>Issuing authority</strong>
        </div>
      </div>
    `;

    try {
      // === Save to MongoDB ===
      if (db) {
        const result = await db.collection("registrations").insertOne(rowData);
        console.log("✅ Registration saved to MongoDB:", result.insertedId);
      } else {
        console.error("❌ MongoDB not connected!");
      }

      // === Send Email ===
      const emailResponse = await transporter.sendMail({
        from: "webwisdom35@gmail.com",
        to: email,
        subject: "✅ Registration Successful",
        html: htmlContent,
      });

      console.log("✅ Email sent:", emailResponse.messageId);

      // === Response to Dialogflow ===
      agent.add(`✅ Registration Complete!
👤 Name: ${any} ${lastname}
📞 Phone: ${phone}
📧 Email: ${email}
📘 Course: ${courseName}
🔢 CNIC: ${number}
Your data has been saved to our database and ID card sent to your email.`);
    } catch (error) {
      console.error("❌ Error in DB or Email:", error);
      agent.add("❌ Something went wrong while processing your registration. Please try again later.");
    }
  }

  // === Map Intents ===
  let intentMap = new Map();
  intentMap.set("hi", hi);
  intentMap.set("available_courses", available_courses);
  intentMap.set("course_information", course_information);
  intentMap.set("register", register);

  agent.handleRequest(intentMap);
});
