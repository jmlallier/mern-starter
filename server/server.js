const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const items = require("./routes/api/items");

const app = express();

app.use(bodyParser.json());

const serverConfig = require("./config");
const dummyData = require("./dummyData");

// Set native promises as mongoose promise
mongoose.Promise = global.Promise;

// MongoDB Connection

mongoose
  .connect(
    serverConfig.mongoURL,
    error => {
      if (error) {
        console.error("Please make sure Mongodb is installed and running!"); // eslint-disable-line no-console
        throw error;
      }

      // feed some dummy data in DB.
      dummyData();
    }
  )
  .then(() => console.log(`MongoDB Connected...`))
  .catch(err => console.log(err));

app.use("/api/items", items);

app.get("/", (req, res) => {
  res.send(`Success`);
});

const port = process.env.PORT || 5000;
// const port = 5000;

app.listen(port, () =>
  console.log(`Server started at http://localhost:${port}`)
);
