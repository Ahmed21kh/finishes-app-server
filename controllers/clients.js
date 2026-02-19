const { Client } = require("../models/databaseSchema");

const addClient = async (req, res) => {
  const { name, code, phoneNumber } = req.body;
  if (!name || !code || !phoneNumber) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const client = await Client.create(req.body);
  res
    .status(200)
    .json({ data: client, message: "Client created successfully" });
};

const updateClient = async (req, res) => {
  const { clientId } = req.query;
  const { name, code, phoneNumber } = req.body;
  if (!name || !code || !phoneNumber) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const client = await Client.findByIdAndUpdate(clientId, req.body, {
    new: true,
  });
  res
    .status(200)
    .json({ data: client, message: "Client updated successfully" });
};

const deleteClient = async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ message: "Client ID is required." });
  }
  const client = await Client.findByIdAndDelete(clientId);
  res
    .status(200)
    .json({ data: client, message: "Client deleted successfully" });
};

const getClients = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { name, phoneNumber, code } = req.query;

  const matchData = () => {
    let obj = {};
    if (name) {
        obj.$expr = {
          $regexMatch: {
            input: "$name",
            regex: name,
            options: "i",
          },        
      }
    }
    if (phoneNumber) {
        obj.phoneNumber = { $regex: phoneNumber, $options: "i" }
    }
    if (code) {
        obj.code = Number(code)
    }
    return obj;
  };

  const client = await Client.aggregate([
    {
      $match: {
        ...matchData(),
      },
    },
    {
      $sort: {
        // "name": 1,
        // "updatedAt":1,
        createdAt: 1,
        // "studentDetails.code": 1,
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ]);

  res.status(200).send(client[0]);
};

const getOneClient = async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ message: "Client ID is required." });
  }
  const client = await Client.findById(clientId);
  res.status(200).send(client);
};

const getClientLastCode = async (req, res) => {
  const clientCode = (await Client.find()).length + 1;
  console.log(clientCode);
  
  res.status(200).send({clientCode});
};

const getClientsNames = async (req, res) => {
  const clients = await Client.find();
  const clientsNames = clients.map(client =>{return {id:client._id ,name:client.name}});
  res.status(200).send({clientsNames});
};

module.exports = {
  addClient,
  deleteClient,
  updateClient,
  getClients,
  getOneClient,
  getClientLastCode,
  getClientsNames
};
