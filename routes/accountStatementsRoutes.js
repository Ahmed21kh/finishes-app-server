const express = require("express");
const router = express.Router();
const accountStatementController = require("../controllers/accountStatements");

router.route("/get-all").get(accountStatementController.getAccountStatements);
router.route("/get-one").get(accountStatementController.getOneAccountStatement);
router.route("/add").post(accountStatementController.addAccountStatement);
router.route("/delete").delete(accountStatementController.deleteAccountStatement);
router.route("/update").put(accountStatementController.updateAccountStatement);
router.route("/get-code").get(accountStatementController.getAccountStatementLastCode);

module.exports = router;