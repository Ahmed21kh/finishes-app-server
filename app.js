const express = require("express");
const dbName = "Finishes";
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const app = express();
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const server = require("http").createServer(app);
const path = require("path");
const DATA_BASE_URL = "mongodb+srv://ah_db_user:Ah20192344@newcluster.iloyqea.mongodb.net"
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

app.use('/api/client', require('./routes/clientsRoutes'));
app.use('/api/invoice', require('./routes/invoicesRoutes'));
app.use('/api/accountStatement', require('./routes/accountStatementsRoutes'));
app.use('/api/transaction', require('./routes/transactionsRoutes'));
app.use('/api/item', require('./routes/itemesRoutes'));
app.use('/api/apartment', require('./routes/apartmentsRoutes'));

app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});

mongoose.connect(`${process.env.DATABASE_URL|| DATA_BASE_URL}/${dbName}`).then((db) => {
  console.log("Connected! to database ");
server.listen(process.env.PORT, () => {
   console.log("Listening on port " + process.env.PORT);
   
  });
});

const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, "static"));

app.use(connectLivereload());

liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});
