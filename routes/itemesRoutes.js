const express = require("express");
const router = express.Router();
const itemsController = require("../controllers/items");

router.route("/get-all").get(itemsController.getItems);
router.route("/get-one").get(itemsController.getOneItem);
router.route("/add").post(itemsController.addItem);
router.route("/delete").delete(itemsController.deleteItem);
router.route("/update").put(itemsController.updateItem);

module.exports = router;