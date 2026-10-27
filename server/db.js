require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MONGODB_URI is missing from .env");
}

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000
});
let db;

async function connectDB() {
    try {
        await client.connect();

        db = client.db("interviewAI");

        // Helpful indexes for unique accounts and latest user reports.
        await db.collection("users").createIndex({ email: 1 }, { unique: true });
        await db.collection("feedback").createIndex({ userId: 1, createdAt: -1 });
        await db.collection("interviews").createIndex({ userId: 1, startedAt: -1 });
        await db.collection("atsScores").createIndex({ userId: 1, createdAt: -1 });
        await db.collection("resumes").createIndex(
            { userId: 1 },
            { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
        );

        console.log("✅ MongoDB connected successfully!");

        return db;

    } catch (error) {

        console.error("❌ MongoDB connection failed:");
        console.error(error.message);

        throw error;
    }
}

function getDB() {

    if (!db) {
        throw new Error("Database is not connected.");
    }

    return db;
}

module.exports = {
    connectDB,
    getDB
};