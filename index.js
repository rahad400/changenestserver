import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
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

const changeClient = await connectToMongoDB();
const db = changeClient.db("ChangeNest");
const createEventCollection = db.collection("create-events");

app.post("/create-event", async (req, res) => {
  const event = req.body;
  const result = await createEventCollection.insertOne(event);
  console.log(result);
  res.send(result);
});

app.get("/upcoming-events", async (req, res) => {
  const result = await createEventCollection.find().toArray();
  res.send(result);
});

app.get("/details-event/:id", async (req, res) => {
  const { id } = req.params;
  const result = await createEventCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.post("my-events", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !porcess.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { createdBy, ...eventData } = req.body;

  if (!createdBy) {
    return res.status(400).json({
      message: "User ID is required",
    });
  }
  const result = await createEventCollection.insertOne({
    ...eventData,
    createdBy,
  });

  res.send(result);
  // res.send('my is there events');
});

app.get("/", (req, res) => {
  res.send({ message: "server is runing" });
});
// http://localhost:8000/event
app.listen(PORT, () => {
  console.log(`server port${PORT}`);
});
