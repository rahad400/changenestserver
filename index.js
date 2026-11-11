import express from "express";
import "dotenv/config";
import { MongoClient } from "mongodb";
import cors from "cors";
const app = express();
app.use(cors());
const PORT = 8000;

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

app.post("/create-event", async (req, res) => {
  console.log("api is working");
  res.send({ message: "event created suscessfully" });
});

// http://localhost:8000/create-event
app.listen(PORT, () => {
  console.log(`server port${PORT}`);
});
