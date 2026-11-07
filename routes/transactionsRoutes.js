const express = require("express");
const router = express.Router();
const transactionsController = require("../controllers/transactions");

router.route("/add").post(transactionsController.addTransaction);
router.route("/update").put(transactionsController.updateTransaction);
router.route("/delete").delete(transactionsController.deleteTransaction);
router.route("/get-by-client").get(transactionsController.getTransactionsByClient);
router.route("/get-one").get(transactionsController.getOneTransaction);
router.route("/get-code").get(transactionsController.getTransactionNextCode);

module.exports = router;

