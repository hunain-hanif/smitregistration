    const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Suggestion } = require('dialogflow-fulfillment');
const express = require("express")
const cors = require("cors");
const nodemailer = require("nodemailer");
const axios = require("axios");

const app = express();
app.use(express.json())
app.use(cors());

const PORT = process.env.PORT || 8080;

app.post("/webhook", async (req, res) => {
    var id = (res.req.body.session).substr(43);
    console.log(id)
    const agent = new WebhookClient({ request: req, response: res });

    function hi(agent) {
        console.log(`intent  =>  hi`);
        agent.add("")
    }

    function available_courses(agent) {
        const { number , date , email} = agent.parameters;
       agent.add(`We offer the following IT courses:
1. Web & Mobile App Development
2. Graphic Designing
3. Data Science & AI
4. Cloud Computing
5. Cyber Security
Let me know if you would like to register!
`)
    }

    function course_information(agent) {
       
       agent.add(`Classes are held weekdays in the morning and evening batches.
Duration: 8-10 months.
Basic computer knowledge is recommended but not required.
Attendance is mandatory .
`)
    }

     function register(agent) {
  const { number, any, lastname, phone, courses, email } = agent.parameters;

  const courseName = Array.isArray(courses) ? courses[0] : courses;
  const sheetBestURL = "https://api.sheetbest.com/sheets/bd00daba-2a5a-48ee-bed0-39b4d706e0a2";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "webwisdom35@gmail.com",
      pass: "onqr zypr bjod actg",
    },
  });

  const rowData = {
    name: any,
    fatherName: lastname,
    email: email,
    phonenumber: phone,
    "cnic-number": number,
    course: courseName,
    "time of registration": new Date().toLocaleString()
  };

  const htmlContent = `
    <div style="width: 300px; height: 420px; border: 2px solid #000; font-family: Arial, sans-serif; padding: 20px; position: relative; box-shadow: 0 0 8px rgba(0,0,0,0.2);">
      
      <!-- Header Bar -->

      <img style="padding-left: 72px; " width="150px" height="150px" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-cXFuavrc6SQ1s7DJvs55FQ-BF0bqYSM-iw&s" alt="">


      <!-- ID Content -->
      <p><strong>Name:</strong> ${any}</p>
      <p><strong>Father Name:</strong> ${lastname}</p>
      <p><strong>CNIC:</strong> ${number}</p>
      <p><strong>Course:</strong> ${courses}</p>

      <!-- Note -->
      <div style="margin-top: 40px; font-size: 12px; text-align: center;">
        <p><strong>Note:</strong> This card is for SMIT's premises only.<br>If found please return to SMIT</p>
      </div>

      <!-- Footer Line -->
      <div style="height: 1px; background-color: black; margin: 20px 0;"></div>

      <!-- Footer Text -->
      <div style="text-align: center; font-size: 12px;">
        <strong>Issuing authority</strong>
      </div>

      <!-- Bottom Strip -->
       
    </div>
  `;

  // ✅ Return the promise to ensure Dialogflow waits
  return Promise.all([
    axios.post(sheetBestURL, rowData),
    transporter.sendMail({
      from: "webwisdom35@gmail.com",
      to: email,
      subject: "Email Sent ✔",
      html: htmlContent,
    }),
  ])
    .then(([sheetResponse, emailResponse]) => {
      console.log("✅ Sheet response:", sheetResponse.data);
      console.log("✅ Email sent:", emailResponse.messageId);
      console.log("EMAIL SENT TO:", email);

      agent.add(`✅ Registration Complete!
👤 Name: ${any} ${lastname}
📞 Phone: ${phone}
📧 Email: ${email}
📘 Course: ${courses}
🔢 CNIC: ${number}
Your data has been saved and ID card sent to your email.`);
    })
    .catch(error => {
      console.error("❌ Error in sheet or email:", error);
      agent.add("❌ Something went wrong while processing your registration. Please try again later.");
    });
}

    let intentMap = new Map();
    intentMap.set('hi', hi); 
    intentMap.set('available_courses', available_courses);
    intentMap.set('course_information', course_information);
    intentMap.set('register', register);

    agent.handleRequest(intentMap);
})
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
