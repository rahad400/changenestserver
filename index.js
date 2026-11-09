import express from "express";
import "dotenv/config";
const app = express();
const PORT = 8000;

import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

connectToMongoDB();

app.get("/", (req, res) => {
  res.send({ message: "server is runing" });
});

// http://localhost:8000
app.listen(PORT, () => {
  console.log(`server port${PORT}`);
});
