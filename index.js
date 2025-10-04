const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Suggestion } = require('dialogflow-fulfillment');
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// MongoDB connection URI and client setup
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority&appName=smit-registration-dialogflow";
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: false,
});

let db;

client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("Connected to MongoDB");

    const app = express();
    app.use(express.json());
    app.use(cors());

    const PORT = process.env.PORT || 8080;

    app.get("/", (req, res) => {
      res.send("Hello World");
    });

    app.post("/webhook", async (req, res) => {
      const id = (req.body.session || "").substr(43);
      console.log(id);
      const agent = new WebhookClient({ request: req, response: res });

      function hi(agent) {
        console.log(`intent => hi`);
        agent.add("Hello! 👋 Welcome to SMIT registration.");
      }

      function available_courses(agent) {
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
        agent.add(`Classes are held weekdays in the morning and evening batches.
Duration: 8-10 months.
Basic computer knowledge is recommended but not required.
Attendance is mandatory.
`);
      }

      // Make register async so we can await DB and email
      async function register(agent) {
        const { number, any, lastname, phone, courses, email } = agent.parameters;

        // Save to MongoDB first
        try {
          if (!db) {
            agent.add("Database connection error. Please try again later.");
            return;
          }

          const lead = {
            number,
            name: any,
            lastname,
            phone,
            courses,
            email,
            timestamp: new Date()
          };

          const result = await db.collection("register").insertOne(lead);
          console.log("Lead saved to MongoDB", result.insertedId);

          // Send email
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: "webwisdom35@gmail.com",
              pass: "onqr zypr bjod actg",
            },
          });

          await transporter.sendMail({
            from: "webwisdom35@gmail.com",
            to: email,
            subject: "SMIT Registration Confirmation",
            html: `
            <div style="width: 300px; height: 420px; border: 2px solid #000; font-family: Arial, sans-serif; padding: 20px; position: relative; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
              <img style="padding-left: 72px;" width="150px" height="150px" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="">
              <p><strong>Name:</strong> ${any}</p>
              <p><strong>Father Name:</strong> ${lastname}</p>
              <p><strong>CNIC:</strong> ${number}</p>
              <p><strong>Course:</strong> ${courses}</p>
              <div style="margin-top: 40px; font-size: 12px; text-align: center;">
                <p><strong>Note:</strong> This card is for SMIT's premises only.<br>If found please return to SMIT</p>
              </div>
              <div style="height: 1px; background-color: black; margin: 20px 0;"></div>
              <div style="text-align: center; font-size: 12px;">
                <strong>Issuing authority</strong>
              </div>
            </div>
            `
          });

          agent.add(`✅ Registration Complete!
👤 Name: ${any} ${lastname}
📞 Phone: ${phone}
📧 Email: ${email}
📘 Course: ${courses}
🔢 CNIC: ${number}
Your data has been saved and ID card sent to your email.`);
        } catch (err) {
          console.error("Error in register:", err);
          agent.add("There was an error processing your registration. Please try again later.");
        }
      }

      let intentMap = new Map();
      intentMap.set('hi', hi);
      intentMap.set('available_courses', available_courses);
      intentMap.set('course_information', course_information);
      intentMap.set('register', register);

      agent.handleRequest(intentMap);
    });

    app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });