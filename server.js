// server/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mysql = require("mysql2");
const path = require("path");
const dotenv = require("dotenv");
const requestIp = require("request-ip");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, "../public"))); // serve static files

// ✅ Admin credentials
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "12345";

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "070701",
  database: process.env.DB_NAME || "portfolio_db",
});

db.connect((err) => {
  if (err) console.error("❌ Database connection failed:", err);
  else console.log("✅ Connected to MySQL database");
});

// ✅ Create necessary tables
db.query(`
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  subject VARCHAR(150),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.query(`
CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.query(`
CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(50),
  user_agent TEXT,
  page_visited VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

/* --------------------------------------
   ✅ Track Every Visitor (IP + Page)
--------------------------------------- */
app.use((req, res, next) => {
  const ip = req.clientIp || req.ip || "unknown";
  const page = req.originalUrl;
  const agent = req.headers["user-agent"] || "unknown";

  db.query(
    "INSERT INTO visitors (ip_address, user_agent, page_visited) VALUES (?, ?, ?)",
    [ip, agent, page],
    (err) => {
      if (err) console.error("❌ Visitor log failed:", err);
      else console.log(`👀 Visitor: ${ip} → ${page}`);
    }
  );
  next();
});

/* -------------------------------
   CONTACT FORM
--------------------------------*/
app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ success: false, message: "Missing fields" });

  const sql = "INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, email, subject, message], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "DB Error" });
    console.log("✅ Message saved:", result.insertId);
    res.json({ success: true });
  });
});

/* -------------------------------
   BLOG API
--------------------------------*/
app.get("/blogs", (req, res) => {
  db.query("SELECT * FROM blogs ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.json(results);
  });
});

/* -------------------------------
   ADMIN VISITOR LOG VIEW
--------------------------------*/
app.get("/admin/visitors", (req, res) => {
  db.query("SELECT * FROM visitors ORDER BY created_at DESC LIMIT 100", (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.json(results);
  });
});

/* -------------------------------
   Serve Pages
--------------------------------*/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
app.get("/blog", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/blog.html"));
});

/* -------------------------------
   Start Server
--------------------------------*/
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
