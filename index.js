require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tutor-books.web.app",
      "https://tutor-books.firebaseapp.com",
    ],
    credentials: true,
  })
);

const verifyToken = (req, res, next) => {
  const email = req.query.email;
  const token = req?.cookies?.jwtToken;
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized Access." });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

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
    const bookTutorCollection = client
      .db("tutorBook")
      .collection("bookedTutors");

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    // auth related api's
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.cookie("jwtToken", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", (req, res) => {
      // console.log("User Logged Out");
      res
        .clearCookie("jwtToken", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });
    // ==========X=========

    // book a tutor
    app.post("/bookTutor", async (req, res) => {
      const bookedTutor = req.body;
      // console.log(bookedTutor);
      const result = await bookTutorCollection.insertOne(bookedTutor);
      res.send(result);
    });

    // get booked tutors data
    app.get("/myBookedTutors", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      if (req.user?.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const result = await bookTutorCollection.find(query).toArray();
      res.send(result);
    });

    // add review
    app.post("/addReview", async (req, res) => {
      const { id } = req.body;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await tutorialCollection.updateOne(query, {
        $inc: { review: 1 },
      });

      if (result.modifiedCount > 0) {
        const updatedReview = await tutorialCollection.findOne(query, {
          projection: { review: 1 },
        });

        res.status(200).send({
          success: true,
          message: "Review added successfully!",
          review: updatedReview.review,
        });
      } else {
        res.status(404).send({
          success: false,
          message: "No document found to update!",
        });
      }
      //   res.send(result);
    });

    // tutorials related api's

    // add a tutorial
    app.post("/addTutorial", async (req, res) => {
      const tutorial = req.body;
      const result = await tutorialCollection.insertOne(tutorial);
      res.send(result);
    });

    app.get("/findTutorials", async (req, res) => {
      const category = req.query.category;
      const sortBy = req.query.sortBy;
      // console.log(sortBy);
      let sortQuery = {};
      if (sortBy === "low2high") {
        sortQuery = { price: 1 };
      } else if (sortBy === "high2low") {
        sortQuery = { price: -1 };
      } else {
        sortQuery = {};
      }

      let query = {}
      if (category) {
        query = { language: category };
      } else {
        query = {};
      }

      const result = await tutorialCollection.find(query).sort(sortQuery).toArray();
      res.send(result);
    });

    // get tutors by category
    app.get("/findTutors/:category", async (req, res) => {
      const category = req.params.category;
      query = { language: category };
      const result = await tutorialCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    // get tutor details
    app.get("/tutor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorialCollection.findOne(query);
      res.send(result);
    });

    // get my tutorials data
    app.get("/myTutorials", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await tutorialCollection.find(query).toArray();
      res.send(result);
    });

    // update tutorial
    app.put("/updateTutorial/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await tutorialCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete a tutorial
    app.delete("/deleteTutorial/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorialCollection.deleteOne(query);
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

    // get tutorial stats
    app.get("/stats", async (req, res) => {
      const tutorials = await tutorialCollection.find().toArray();

      // use set method to calculate and add total
      let totalReviews = 0;
      const languagesSet = new Set();
      const usersSet = new Set();

      tutorials.forEach((tutorial) => {
        totalReviews += tutorial.review || 0;
        languagesSet.add(tutorial.language);
        usersSet.add(tutorial.email);
      });

      const stats = {
        totalReviews,
        numberOfLanguages: languagesSet.size,
        totalTutorials: tutorials.length,
        totalUsers: usersSet.size,
      };

      res.send(stats);
    });

    // =========X========

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
