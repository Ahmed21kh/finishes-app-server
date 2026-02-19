const { Apartment } = require("../models/databaseSchema");
const objectId = require("mongodb").ObjectId;
const addApartment = async (req, res) => {
  const { address, code , client  } = req.body;
  if (!address || !code || !client) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const apartment = await Apartment.create(req.body);
  res
    .status(200)
    .json({ data: apartment, message: "Apartment created successfully" });
};

const updateApartment = async (req, res) => {
  const { apartmentId } = req.query;
  const { address, code , client  } = req.body;
  if (!address || !code || !client) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const apartment = await Apartment.findByIdAndUpdate(apartmentId, req.body, {
    new: true,
  });
  res
    .status(200)
    .json({ data: apartment, message: "Apartment updated successfully" });
};

const deleteApartment = async (req, res) => {
  const { apartmentId } = req.query;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required." });
  }
  const apartment = await Apartment.findByIdAndDelete(apartmentId);
  res
    .status(200)
    .json({ data: apartment, message: "Apartment deleted successfully" });
};

const getApartments = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { address, code , client , clientName} = req.query;

  const matchData = () => {
    let obj = {}
    if (address) {
      obj.$expr = {
          $regexMatch: {
            input: "$address",
            regex: address,
            options: "i",
          },
        }
    }
    if (clientName) {
      obj.$expr = {
          $regexMatch: {
            input: "$clientDetails.name",
            regex: clientName,
            options: "i",
          },
        }
    }
    if (code) {
        obj.code = Number(code)
    }
    if (client) {
        obj.client = new objectId(client)
    }
    return obj;
  };

  const apartment = await Apartment.aggregate([
    {
      $lookup: {
        from: "clients", // Name of the other collection
        localField: "client", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "clientDetails", // Output array field
      },
    },
    {
      $unwind: {
        path: "$clientDetails", // Unwind the clientDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
        clientDetails: "$clientDetails", // Move clientDetails back to top level
      },
    },
    {
      $match: {
        ...matchData(),
      },
    },
    {
      $sort: {
        // "address": 1,
        // "updatedAt":1,
        createdAt: 1,
        // "clientDetails.code": 1,
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

  res.status(200).send(apartment[0]);
};

const getOneApartment = async (req, res) => {
  const { apartmentId } = req.query;
  if (!apartmentId) {
    return res.status(400).json({ message: "Apartment ID is required." });
  }
  const apartment = await Apartment.aggregate([
    {
      $lookup: {
        from: "clients", // Name of the other collection
        localField: "client", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "clientDetails", // Output array field
      },
    },
    {
      $unwind: {
        path: "$clientDetails", // Unwind the clientDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
        clientDetails: "$clientDetails", // Move clientDetails back to top level
      },
    },
    {
      $match: {
        _id: new objectId(apartmentId),
      },
    },
  ]);
  res.status(200).send(apartment[0]);
};

const getApartmentLastCode = async (req, res) => {
  const { clientId } = req.query;  
  const apartments = await Apartment.find({client: new objectId(clientId)});  
  const apartmentCode = apartments.length + 1;
  res.status(200).send({apartmentCode});
};

const getApartmentsNames = async (req, res) => {
  const { clientId } = req.query;
  const apartments = await Apartment.find({client: clientId});
  const apartmentsNames = apartments.map(apartment =>{return {id:apartment._id ,name:apartment.address}});
  res.status(200).send({apartmentsNames});
};
module.exports = {
  addApartment,
  deleteApartment,
  updateApartment,
  getApartments,
  getOneApartment,
  getApartmentLastCode,
  getApartmentsNames
};
