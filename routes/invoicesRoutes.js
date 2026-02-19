const express = require("express");
const router = express.Router();
const invoicesController = require("../controllers/invoices");

router.route("/get-all").get(invoicesController.getInvoices);
router.route("/get-one").get(invoicesController.getOneInvoice);
router.route("/add").post(invoicesController.addInvoice);
router.route("/delete").delete(invoicesController.deleteInvoice);
router.route("/update").put(invoicesController.updateInvoice);
router.route("/get-code").get(invoicesController.getInvoiceLastCode);

module.exports = router;