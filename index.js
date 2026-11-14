import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient } from 'mongodb';
const app = express()
const port = process.env.PORT
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
const connection = await connectToMongoDB()
const myDB = connection.db("WanderLast_Server");
const allDestinations = myDB.collection("destinations");


app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.post('/add-new-destination', async (req, res) => {
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
    if (body.price === undefined ||
        body.price === null ||
        body.price === "" ||
        !Number.isFinite(price) ||
        price < 0) {
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

app.get('/destinations', async (req, res) => {
     const cursor = await allDestinations.find({}).toArray();
     res.send(cursor)
})


app.use((err, req, res, next) => {
    if (err?.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body." });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong." });
});



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})