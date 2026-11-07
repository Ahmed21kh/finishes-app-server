/* eslint-disable @typescript-eslint/no-explicit-any */
const { Transaction, AccountStatement } = require("../models/databaseSchema");
const { ObjectId } = require("mongodb");

/**
 * Add a new transaction (invoice/deal) to an account statement
 */
const addTransaction = async (req, res) => {
  try {
    const { accountStatement, title, date, notes, status, patches, payments } =
      req.body;

    if (!accountStatement || !title) {
      return res.status(400).json({
        message: "معرّف كشف الحساب واسم المعاملة مطلوبان",
      });
    }

    // Auto-calculate sequential 4-digit code starting from 1000 (e.g. 1000, 1001, 1002...)
    const lastTx = await Transaction.findOne({ code: { $exists: true } })
      .sort({ code: -1 })
      .select("code");

    let code = 1000;
    if (lastTx && typeof lastTx.code === "number" && lastTx.code >= 1000) {
      code = lastTx.code + 1;
    }

    const transaction = await Transaction.create({
      accountStatement: new ObjectId(accountStatement),
      code,
      title: title.trim(),
      date: date ? new Date(date) : new Date(),
      notes: notes || "",
      status: status || "قيد التنفيذ",
      patches: Array.isArray(patches) ? patches : [],
      payments: Array.isArray(payments) ? payments : [],
    });

    res.status(201).json({
      data: transaction,
      message: "تم إنشاء المعاملة وحفظها بنجاح",
    });
  } catch (error) {
    console.error("Error adding transaction:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء إضافة المعاملة",
      error: error.message,
    });
  }
};

/**
 * Update an existing transaction
 */
const updateTransaction = async (req, res) => {
  try {
    const { transactionId } = req.query;
    if (!transactionId) {
      return res.status(400).json({ message: "معرّف المعاملة مطلوب" });
    }

    const { title, date, notes, status, patches, payments } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (patches !== undefined) updateData.patches = patches;
    if (payments !== undefined) updateData.payments = payments;

    const updated = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "المعاملة غير موجودة" });
    }

    res.status(200).json({
      data: updated,
      message: "تم تحديث المعاملة بنجاح",
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء تحديث المعاملة",
      error: error.message,
    });
  }
};

/**
 * Delete a transaction
 */
const deleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.query;
    if (!transactionId) {
      return res.status(400).json({ message: "معرّف المعاملة مطلوب" });
    }

    const deleted = await Transaction.findByIdAndDelete(transactionId);
    if (!deleted) {
      return res.status(404).json({ message: "المعاملة غير موجودة" });
    }

    res.status(200).json({
      data: deleted,
      message: "تم حذف المعاملة بنجاح",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء حذف المعاملة",
      error: error.message,
    });
  }
};

/**
 * Get all transactions for a specific client account statement with calculated totals
 */
const getTransactionsByClient = async (req, res) => {
  try {
    const { accountStatementId } = req.query;
    if (!accountStatementId) {
      return res.status(400).json({ message: "معرّف كشف الحساب مطلوب" });
    }

    const statementObjectId = new ObjectId(accountStatementId);

    const client = await AccountStatement.findById(statementObjectId);
    if (!client) {
      return res.status(404).json({ message: "كشف حساب العميل غير موجود" });
    }

    const transactions = await Transaction.aggregate([
      {
        $match: {
          accountStatement: statementObjectId,
        },
      },
      {
        $addFields: {
          totalPatches: {
            $reduce: {
              input: "$patches",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
            },
          },
          totalPayments: {
            $reduce: {
              input: "$payments",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
            },
          },
        },
      },
      {
        $addFields: {
          balance: { $subtract: ["$totalPatches", "$totalPayments"] },
          creditor: {
            $cond: {
              if: { $gt: ["$totalPatches", "$totalPayments"] },
              then: { $subtract: ["$totalPatches", "$totalPayments"] },
              else: 0,
            },
          },
          debtor: {
            $cond: {
              if: { $gt: ["$totalPayments", "$totalPatches"] },
              then: { $subtract: ["$totalPayments", "$totalPatches"] },
              else: 0,
            },
          },
        },
      },
      {
        $sort: { date: -1, code: -1 },
      },
    ]);

    // Calculate grand totals across all transactions
    let grandTotalPatches = 0;
    let grandTotalPayments = 0;

    for (const tx of transactions) {
      grandTotalPatches += tx.totalPatches || 0;
      grandTotalPayments += tx.totalPayments || 0;
    }

    const summary = {
      totalTransactions: transactions.length,
      grandTotalPatches,
      grandTotalPayments,
      grandBalance: grandTotalPatches - grandTotalPayments,
      isCreditor: grandTotalPatches >= grandTotalPayments,
    };

    res.status(200).json({
      client,
      transactions,
      summary,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء جلب المعاملات",
      error: error.message,
    });
  }
};

/**
 * Get one transaction with client details populated (for viewing & single invoice print)
 */
const getOneTransaction = async (req, res) => {
  try {
    const { transactionId } = req.query;
    if (!transactionId) {
      return res.status(400).json({ message: "معرّف المعاملة مطلوب" });
    }

    const txObjectId = new ObjectId(transactionId);

    const result = await Transaction.aggregate([
      {
        $match: { _id: txObjectId },
      },
      {
        $lookup: {
          from: "accountstatements",
          localField: "accountStatement",
          foreignField: "_id",
          as: "clientDetails",
        },
      },
      {
        $unwind: {
          path: "$clientDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          totalPatches: {
            $reduce: {
              input: "$patches",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
            },
          },
          totalPayments: {
            $reduce: {
              input: "$payments",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.price", 0] }] },
            },
          },
        },
      },
      {
        $addFields: {
          balance: { $subtract: ["$totalPatches", "$totalPayments"] },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "المعاملة غير موجودة" });
    }

    res.status(200).json({ data: result[0] });
  } catch (error) {
    console.error("Error getting one transaction:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء جلب تفاصيل المعاملة",
      error: error.message,
    });
  }
};

/**
 * Get next sequential 4-digit code for a new transaction starting from 1000
 */
const getTransactionNextCode = async (req, res) => {
  try {
    const lastTx = await Transaction.findOne({ code: { $exists: true } })
      .sort({ code: -1 })
      .select("code");

    let nextCode = 1000;
    if (lastTx && typeof lastTx.code === "number" && lastTx.code >= 1000) {
      nextCode = lastTx.code + 1;
    }

    res.status(200).json({ code: nextCode });
  } catch (error) {
    console.error("Error getting next transaction code:", error);
    res.status(500).json({ message: error.message, code: 1000 });
  }
};

module.exports = {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByClient,
  getOneTransaction,
  getTransactionNextCode,
};

