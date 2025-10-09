const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// === MongoDB Connection Setup ===
const uri = "mongodb+srv://hunainhanif35_db_user:RqH6ReTJ94DbIRcL@smit-registration-dialo.fghxxjt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
let db;

client.connect()
  .then(() => {
    db = client.db("dialogflowDB");
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => {
    console.error("❌ Failed to connect to MongoDB", err);
  });

// === Express Setup ===
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

// === Root Route ===
app.get("/", (req, res) => {
  res.send("🚀 SMIT Registration Webhook Running...");
});

// === Dialogflow Webhook ===
app.post("/webhook", async (req, res) => {
  const id = (req.body.session || "").substr(43);
  console.log("🆔 Session ID:", id);

  const agent = new WebhookClient({ request: req, response: res });

  // === INTENTS ===
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

  // === REGISTER INTENT ===
  async function register(agent) {
    console.log("👉 Intent: register triggered");

    // Helper function to clean parameter values
    const getValue = (param) => {
      if (!param) return "";
      if (Array.isArray(param)) return param[0];       // pick first if array
      if (typeof param === "object" && param.value) return param.value; // handle object format
      return param;
    };

    // Clean all Dialogflow parameters
    const cleanData = {
      number: getValue(agent.parameters.number),
      name: getValue(agent.parameters.any),
      lastname: getValue(agent.parameters.lastname),
      phone: getValue(agent.parameters.phone),
      courses: getValue(agent.parameters.courses),
      email: getValue(agent.parameters.email),
      timestamp: new Date(),
    };

    console.log("📦 Cleaned Data:", cleanData);

    // Send response back to Dialogflow
    agent.add(`✅ Registration complete!  
👤 Name: ${cleanData.name} ${cleanData.lastname}  
📞 Phone: ${cleanData.phone || "Not provided"}  
📧 Email: ${cleanData.email}  
📘 Course: ${cleanData.courses}  
🔢 CNIC: ${cleanData.number}`);

    // Save to MongoDB
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

  // === Intent Map ===
  let intentMap = new Map();
  intentMap.set("Default Welcome Intent", hi);
  intentMap.set("available_courses", available_courses);
  intentMap.set("course_information", course_information);
  intentMap.set("register", register);

  agent.handleRequest(intentMap);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
