const { Item } = require("../models/databaseSchema");

const addItem = async (req, res) => {
  const { name, price, invoiceId , date , code} = req.body;
  if (!name || !price || !invoiceId || !date || !code) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const item = await Item.create(req.body);
  res
    .status(200)
    .json({ data: item, message: "Item created successfully" });
};

const updateItem = async (req, res) => {
  const { itemId } = req.query;
  const { name, price, invoiceId , date , code} = req.body;
  if (!name || !price || !invoiceId || !date || !code) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const item = await Item.findByIdAndUpdate(itemId, req.body, {
    new: true,
  });
  res
    .status(200)
    .json({ data: item, message: "Item updated successfully" });
};

const deleteItem = async (req, res) => {
  const { itemId } = req.query;
  if (!itemId) {
    return res.status(400).json({ message: "Item ID is required." });
  }
  const item = await Item.findByIdAndDelete(itemId);
  res
    .status(200)
    .json({ data: item, message: "Item deleted successfully" });
};

const getItems = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { name, invoiceId, code } = req.query;

  const matchData = () => {
    if (name) {
      return {
        $expr: {
          $regexMatch: {
            input: "$name",
            regex: name,
            options: "i",
          },
        },
      };
    }
    if (invoiceId) {
      return {
        invoiceId:invoiceId,
      };
    }
    if (code) {
      return {
        code:code ,
      };
    }
    if (!name && !invoiceId && !code) return {};
  };

  const item = await Item.aggregate([
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

  res.status(200).send(item[0]);
};

const getOneItem = async (req, res) => {
  const { itemId } = req.query;
  if (!itemId) {
    return res.status(400).json({ message: "Item ID is required." });
  }
  const item = await Item.findById(itemId);
  res.status(200).send(item);
};

const getItemLastCode = async (req, res) => {
  const itemCode = (await Item.find()).length + 1;
  res.status(200).send(itemCode);
};
module.exports = {
  addItem,
  deleteItem,
  updateItem,
  getItems,
  getOneItem,
  getItemLastCode
};
