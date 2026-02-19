const express = require("express");
const router = express.Router();
const customerController = require("../controllers/clients");

router.route("/get-all").get(customerController.getClients);
router.route("/get-one").get(customerController.getOneClient);
router.route("/add").post(customerController.addClient);
router.route("/delete").delete(customerController.deleteClient);
router.route("/update").put(customerController.updateClient);
router.route("/get-code").get(customerController.getClientLastCode);
router.route("/get-names").get(customerController.getClientsNames);

module.exports = router;