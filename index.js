import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
const app = express();
const port = process.env.PORT;
app.use(cors({ origin: process.env.FRONTEND_ORIGINE }));
app.use(express.json());
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connection = await connectToMongoDB();
const myDB = connection.db("Wanderlast");
const allDestinations = myDB.collection("destinations");
const allBookings = myDB.collection("allBookings");

//middle ware 
const verifyUser = (req, res, next) => {
  const verify = req.headers.authorization;
  if (verify !== "user loged in") {
    return res.status(401).send({ message: "You are a hacker" })
  }
  next();
}


app.get("/", (req, res) => {
  res.send("Hello cuty!");
});

app.post("/add-new-destination", verifyUser, async (req, res) => {
  const body = req.body ?? {};
  const required = [
    "destinationName",
    "country",
    "category",
    "duration",
    "departureDate",
    "description",
  ];

  for (const field of required) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return res.status(400).json({ message: `${field} is required.` });
    }
  }
  const price = Number(body.price);
  if (
    body.price === undefined ||
    body.price === null ||
    body.price === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return res
      .status(400)
      .json({ message: "price must be a non-negative number." });
  }

  try {
    const result = await allDestinations.insertOne({
      destinationName: body.destinationName.trim(),
      country: body.country.trim(),
      category: body.category.trim(),
      price,
      duration: body.duration.trim(),
      departureDate: body.departureDate,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() : "",
      description: body.description.trim(),
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Travel package added successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Failed to create the travel package." });
  }
});

app.get("/destinations", async (req, res) => {
  const cursor = await allDestinations.find({}).toArray();
  res.send(cursor);
});


app.get("/destinations/:id", verifyUser ,async (req, res) => {
  const { id } = req.params;
  const result = await allDestinations.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.patch("/destinations/:id", verifyUser ,async (req, res) => {
  const { id } = req.params;
  const newData = req.body;
  const result = await allDestinations.updateOne(
    { _id: new ObjectId(id) },
    { $set: newData },
  );
  res.json(result);
});

app.delete("/destinations/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await allDestinations.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete destination" });
  }
});

app.post("/booking", verifyUser ,async (req, res) => {
  const data = req.body;
  const result = await allBookings.insertOne(data);
  res.json(result);
});

app.get("/bookings/:email", verifyUser, async (req, res) => {
  const { email } = req.params;
  const result = await allBookings.find({ "user.email": email }).toArray();
  res.json(result);
});

app.delete("/bookings/:id", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.query.email;
    const filter = { _id: new ObjectId(id) };

    if (typeof email === "string" && email.trim()) {
      filter["user.email"] = email;
    }

    const result = await allBookings.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete booking." });
  }
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
