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
const joinEventCollection = db.collection("join-events");


try {
  await joinEventCollection.createIndex(
    { eventId: 1, userId: 1 },
    { unique: true },
  );
} catch (error) {
  console.error("Join event index create failed:", error);
}

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

app.post("/join-event/:id", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { userId } = req.body;

  if (
    !ObjectId.isValid(id) ||
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    return res.status(400).json({ message: "Invalid event ID or user ID" });
  }

  const event = await createEventCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1 } },
  );

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  await joinEventCollection.updateOne(
    { eventId: id, userId },
    { $setOnInsert: { eventId: id, userId, joinedAt: new Date() } },
    { upsert: true },
  );

  const count = await joinEventCollection.countDocuments({ eventId: id });

  res.json({ joined: true, count });
});

app.get("/join-event/:id", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { userId } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const [count, joinedEvent] = await Promise.all([
    joinEventCollection.countDocuments({ eventId: id }),
    typeof userId === "string" && userId.trim()
      ? joinEventCollection.findOne({ eventId: id, userId })
      : null,
  ]);

  res.json({ joined: Boolean(joinedEvent), count });
});

app.get("/my-joined-events", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { userId } = req.query;

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const joins = await joinEventCollection
    .find({ userId })
    .sort({ joinedAt: -1 })
    .toArray();

  const eventIds = joins
    .map((join) => join.eventId)
    .filter((eventId) => ObjectId.isValid(eventId));

  if (eventIds.length === 0) {
    return res.json([]);
  }

  const events = await createEventCollection
    .find({ _id: { $in: eventIds.map((eventId) => new ObjectId(eventId)) } })
    .toArray();

  // Join order (latest first) maintain koro.
  const eventsById = new Map(
    events.map((event) => [event._id.toString(), event]),
  );

  res.json(
    joins
      .map((join) => eventsById.get(join.eventId))
      .filter((event) => Boolean(event)),
  );
});

app.delete("/leave-event/:id", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { userId } = req.query;

  if (
    !ObjectId.isValid(id) ||
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    return res.status(400).json({ message: "Invalid event ID or user ID" });
  }

  const result = await joinEventCollection.deleteOne({
    eventId: id,
    userId,
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Join not found" });
  }

  res.json({ message: "Left event successfully" });
});

app.post("/my-events", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
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

  res.json({
    message: "Event created successfully",
    insertedId: result.insertedId,
  });
});

app.get("/my-events", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];
  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const { createdBy } = req.query;
  if (!createdBy) {
    return res.status(400).json({
      message: "User ID is required",
    });
  }
  const result = await createEventCollection.find({ createdBy }).toArray();
  res.json(result);
});

app.put("/my-events/:id", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { createdBy, _id, ...eventData } = req.body;

  if (!createdBy) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid event id" });
  }

  const result = await createEventCollection.updateOne(
    { _id: new ObjectId(id), createdBy },
    { $set: eventData },
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.json({ message: "Event updated successfully" });
});

app.delete("/delete-event/:id", async (req, res) => {
  const secret = req.headers["x-internal-api-secret"];

  if (
    !process.env.INTERNAL_API_SECRET ||
    secret !== process.env.INTERNAL_API_SECRET
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const { createdBy } = req.query;

  if (!ObjectId.isValid(id) || !createdBy) {
    return res.status(400).json({
      message: "Invalid event ID or user ID",
    });
  }

  const result = await createEventCollection.deleteOne({
    _id: new ObjectId(id),
    createdBy: createdBy,
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({
      message: "Event not found",
    });
  }

  res.json({
    message: "Event deleted successfully",
  });
});



app.get("/", (req, res) => {
  res.json({ message: "server is runing" });
});
// http://localhost:8000/event
app.listen(PORT, () => {
  console.log(`server port${PORT}`);
});
