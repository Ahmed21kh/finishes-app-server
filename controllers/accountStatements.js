const { AccountStatement } = require("../models/databaseSchema");
const ObjectId = require("mongodb").ObjectId;

const addAccountStatement = async (req, res) => {
  const { clientName, phoneNumber, address, date, code, notes, patches, payments } = req.body;
  console.log({body:req.body})
  
  if (!clientName || !address || !date || !code) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const accountStatement = await AccountStatement.create({
      clientName,
      phoneNumber,
      address,
      date: new Date(date),
      code: Number(code),
      notes: notes || '',
      patches: patches || [],
      payments: payments || []
    });

    res.status(200).json({ 
      data: accountStatement, 
      message: "تم فتح الحساب بنجاح" 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "حدث خطأ أثناء فتح الحساب", 
      error: error.message 
    });
  }
};

const updateAccountStatement = async (req, res) => {
  const { accountStatementId } = req.query;
  const { clientName, phoneNumber, address, date, code, notes, patches, payments } = req.body;

  if (!accountStatementId) {
    return res.status(400).json({ message: "AccountStatement ID is required." });
  }

  if (!clientName || !address || !date || !code) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const accountStatement = await AccountStatement.findByIdAndUpdate(
      accountStatementId,
      {
        clientName,
        phoneNumber,
        address,
        date: new Date(date),
        code: Number(code),
        notes: notes || '',
        patches: patches || [],
        payments: payments || []
      },
      { new: true, runValidators: true }
    );

    if (!accountStatement) {
      return res.status(404).json({ message: "AccountStatement not found" });
    }

    res.status(200).json({ 
      data: accountStatement, 
      message: "تم تحديث الحساب بنجاح" 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "حدث خطأ أثناء تحديث الحساب", 
      error: error.message 
    });
  }
};

const deleteAccountStatement = async (req, res) => {
  const { accountStatementId } = req.query;
  
  if (!accountStatementId) {
    return res.status(400).json({ message: "AccountStatement ID is required." });
  }

  try {
    const accountStatement = await AccountStatement.findByIdAndDelete(accountStatementId);
    
    if (!accountStatement) {
      return res.status(404).json({ message: "AccountStatement not found" });
    }

    res.status(200).json({ 
      data: accountStatement, 
      message: "تم حذف الحساب بنجاح" 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "حدث خطأ أثناء حذف الحساب", 
      error: error.message 
    });
  }
};

const getAccountStatements = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const {  date , clientName , code , address , phoneNumber, status } = req.query;

  const matchData = () => {
    let obj = {}
    if (status === "active") {
      obj.isActive = { $ne: false };
    } else if (status === "inactive") {
      obj.isActive = false;
    }
    if (date) {
        obj.date = new Date(date)
    }
    if (code) {
        obj.code = Number(code)
    }
    if (clientName) {
      obj.$expr = {
        $regexMatch: {
          input: "$clientName",
          regex: clientName,
          options: "i",
        },        
    }
      }
    if (address) {
      obj.$expr = {
        $regexMatch: {
          input: "$address",
          regex: address,
          options: "i",
        },
      }
    }
    if (phoneNumber) {
      obj.phoneNumber = { $regex: phoneNumber, $options: "i" }    
    }
    return obj;
  };

  const accountStatement = await AccountStatement.aggregate([
    {
      $match: {
        ...matchData(),
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "_id",
        foreignField: "accountStatement",
        as: "clientTransactions",
      },
    },
    {
      $addFields: {
        transactionsCount: { $size: "$clientTransactions" },
        totalPatches: {
          $cond: {
            if: { $gt: [{ $size: "$clientTransactions" }, 0] },
            then: {
              $reduce: {
                input: "$clientTransactions",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $reduce: {
                        input: "$$this.patches",
                        initialValue: 0,
                        in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
                      },
                    },
                  ],
                },
              },
            },
            else: {
              $reduce: {
                input: "$patches",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
              },
            },
          },
        },
        totalPayments: {
          $cond: {
            if: { $gt: [{ $size: "$clientTransactions" }, 0] },
            then: {
              $reduce: {
                input: "$clientTransactions",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $reduce: {
                        input: "$$this.payments",
                        initialValue: 0,
                        in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
                      },
                    },
                  ],
                },
              },
            },
            else: {
              $reduce: {
                input: "$payments",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        creditor: {
          $cond: {
            if: { $gt: ["$totalPatches", "$totalPayments"] },
            then: { $subtract: ["$totalPatches", "$totalPayments"] },
            else: 0
          }
        },
        debtor: {
          $cond: {
            if: { $gt: ["$totalPayments", "$totalPatches"] },
            then: { $subtract: ["$totalPayments", "$totalPatches"] },
            else: 0
          }
        }
      }
    },
    {
      $sort: {
        "code": 1,
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

  res.status(200).send(accountStatement[0]);
};

const getOneAccountStatement = async (req, res) => {
  const { accountStatementId } = req.query;
  if (!accountStatementId) {
    return res.status(400).json({ message: "AccountStatement ID is required." });
  }
  const accountStatement = await AccountStatement.aggregate([
    {
      $match: {
        _id: new ObjectId(accountStatementId),
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "_id",
        foreignField: "accountStatement",
        as: "clientTransactions",
      },
    },
    {
      $addFields: {
        transactionsCount: { $size: "$clientTransactions" },
        totalPatches: {
          $cond: {
            if: { $gt: [{ $size: "$clientTransactions" }, 0] },
            then: {
              $reduce: {
                input: "$clientTransactions",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $reduce: {
                        input: "$$this.patches",
                        initialValue: 0,
                        in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
                      },
                    },
                  ],
                },
              },
            },
            else: {
              $reduce: {
                input: "$patches",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
              },
            },
          },
        },
        totalPayments: {
          $cond: {
            if: { $gt: [{ $size: "$clientTransactions" }, 0] },
            then: {
              $reduce: {
                input: "$clientTransactions",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $reduce: {
                        input: "$$this.payments",
                        initialValue: 0,
                        in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
                      },
                    },
                  ],
                },
              },
            },
            else: {
              $reduce: {
                input: "$payments",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        creditor: {
          $cond: {
            if: { $gt: ["$totalPatches", "$totalPayments"] },
            then: { $subtract: ["$totalPatches", "$totalPayments"] },
            else: 0
          }
        },
        debtor: {
          $cond: {
            if: { $gt: ["$totalPayments", "$totalPatches"] },
            then: { $subtract: ["$totalPayments", "$totalPatches"] },
            else: 0
          }
        }
      }
    },
  ]);
  // const accountStatement = await AccountStatement.findById(accountStatementId);
  res.status(200).send(accountStatement[0]);
};

const getAccountStatementLastCode = async (req, res) => {
  const {client } = req.query;
  const accountStatementCode = (await AccountStatement.find({client:client})).length + 1;
  res.status(200).send({code:accountStatementCode});
};

const getAccountStatementsNames = async (req, res) => {
  try {
    const accountStatements = await AccountStatement.find(
      { isActive: { $ne: false } },
      { _id: 1, clientName: 1, code: 1 }
    );
    const clientsNames = accountStatements.map((c) => ({
      id: c._id,
      name: c.clientName,
      code: c.code,
    }));
    res.status(200).send({ clientsNames });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const toggleAccountStatementStatus = async (req, res) => {
  try {
    const { accountStatementId } = req.query;
    if (!accountStatementId) {
      return res.status(400).json({ message: "معرّف كشف الحساب مطلوب" });
    }

    const current = await AccountStatement.findById(accountStatementId);
    if (!current) {
      return res.status(404).json({ message: "كشف الحساب غير موجود" });
    }

    const newStatus = current.isActive === false ? true : false;
    current.isActive = newStatus;
    await current.save();

    res.status(200).json({
      message: newStatus ? "تم تفعيل كشف الحساب بنجاح" : "تم تعطيل كشف الحساب بنجاح",
      isActive: newStatus,
      data: current,
    });
  } catch (error) {
    console.error("Error toggling account status:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addAccountStatement,
  deleteAccountStatement,
  updateAccountStatement,
  getAccountStatements,
  getOneAccountStatement,
  getAccountStatementLastCode,
  getAccountStatementsNames,
  toggleAccountStatementStatus,
};