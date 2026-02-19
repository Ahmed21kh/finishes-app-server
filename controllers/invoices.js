const { Invoice } = require("../models/databaseSchema");
const ObjectId = require("mongodb").ObjectId;

const addInvoice = async (req, res) => {
  const { date ,client , code , payedPatch , apartment , items} = req.body;
  if ( !date || !client || !code || !apartment || !payedPatch || !items) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const invoice = await Invoice.create(req.body);
  res
    .status(200)
    .json({ data: invoice, message: "Invoice created successfully" });
};

const updateInvoice = async (req, res) => {
  const { invoiceId } = req.query;
  const { date ,client, code , payedPatch , apartment , items} = req.body;
  if ( !date || !client || !code || !apartment || !payedPatch || !items) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const invoice = await Invoice.findByIdAndUpdate(invoiceId, req.body, {
    new: true,
  });
  res
    .status(200)
    .json({ data: invoice, message: "Invoice updated successfully" });
};

const deleteInvoice = async (req, res) => {
  const { invoiceId } = req.query;
  if (!invoiceId) {
    return res.status(400).json({ message: "Invoice ID is required." });
  }
  const invoice = await Invoice.findByIdAndDelete(invoiceId);
  res
    .status(200)
    .json({ data: invoice, message: "Invoice deleted successfully" });
};

const getInvoices = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { date , client , code , apartment} = req.query;

  const matchData = () => {
    let obj = {};
    if (date) {
      obj.date = date
    }
    if (client) {
      obj.client = new ObjectId(client);
    }
    if (code) {
      obj.code = code;
    }
    if (apartment) {
      obj.apartment = new ObjectId(apartment);
    }
    return obj;
  };


  const invoice = await Invoice.aggregate([
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
      $addFields: {
        totalPrice: { $sum: "$items.price" }, // Summing up the 'price' field from 'items'
        remainingAmount: { $subtract: ["$payedPatch",{ $sum: "$items.price" }] }, // totalPrice - payedPatch
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

  res.status(200).send(invoice[0]);
};

const getOneInvoice = async (req, res) => {
  const { invoiceId } = req.query;
  if (!invoiceId) {
    return res.status(400).json({ message: "Invoice ID is required." });
  }
  const invoice = await Invoice.findById(invoiceId);
  res.status(200).send(invoice);
};

const getInvoiceLastCode = async (req, res) => {
  const {client} = req.query;
  const invoiceCode = (await Invoice.find({client: new ObjectId(client)})).length + 1;
  res.status(200).send({invoiceCode});
};

module.exports = {
  addInvoice,
  deleteInvoice,
  updateInvoice,
  getInvoices,
  getOneInvoice,
  getInvoiceLastCode
};
