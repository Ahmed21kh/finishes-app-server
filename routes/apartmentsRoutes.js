const express = require("express");
const router = express.Router();
const apartmentController = require("../controllers/apartments");

router.route("/get-all").get(apartmentController.getApartments);
router.route("/get-one").get(apartmentController.getOneApartment);
router.route("/add").post(apartmentController.addApartment);
router.route("/delete").delete(apartmentController.deleteApartment);
router.route("/update").put(apartmentController.updateApartment);
router.route("/get-code").get(apartmentController.getApartmentLastCode);
router.route("/get-names").get(apartmentController.getApartmentsNames);

module.exports = router;