import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dbConnect from "../api/src/database/db.js";

dotenv.config();
const app = express();

app.use(cors({
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Project-ID']
}));

app.use(express.json({ 
    limit: "10mb"
}));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    dbConnect(); // ✅ Make sure to invoke the function
});
