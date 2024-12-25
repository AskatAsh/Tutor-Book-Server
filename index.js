require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors());

// mongoDB database connection codes

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fisbs9h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const tutorialCollection = client.db("tutorBook").collection("tutorials");

    app.get("/findTutorials", async (req, res) => {
      const result = await tutorialCollection.find().toArray();
      res.send(result);
    });

    app.get("/findCategories", async (req, res) => {
      const tutorials = await tutorialCollection.find().toArray();

      // used set method to filter unique languages
      const languages = [
        ...new Set(tutorials.map((tutorial) => tutorial.language)),
      ];
      res.send(languages);
    });

    app.get("/", (req, res) => {
      res.send("Tutor Booking Server is Running...");
    });

    app.listen(port, () => {
      console.log("Server is running at port: ", port);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
