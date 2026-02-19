const { Schema, default: mongoose } = require("mongoose");

const clientSchema = new Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    code: { type: Number, required: true },
  },
  { timestamps: true }
);

const apartmentSchema = new Schema(
  {
    code: { type: Number, required: true },
    address: { type: String, required: true },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

const patchesSchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    notes: { type: String, required: false },
  }
);

const paymentsSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    notes: { type: String, required: false },
  }
);

const accountStatementSchema = new Schema(
  {
    code: { type: Number, required: true },
    clientName: { type: String, required: true },
    phoneNumber: { type: String, required: false },
    address: { type: String, required: true },
    date: { type: Date, required: true },
    notes: { type: String, required: false },
    patches: { type: [patchesSchema], required: false },
    payments: { type: [paymentsSchema], required: false },
    
  },
  { timestamps: true }
);

const itemSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    code: { type: Number, required: true },
    itemNotes: { type: String, required: false },
  }
);





const invoicesSchema = new Schema(
  {
    code: { type: Number, required: true },
    notes: { type: String, required: false },
    date: { type: Date, required: true },
    items:{ type:[itemSchema], required: false },
    payedPatch: { type: Number, required: true },
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "apartment",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "client",
    },
  },
  { timestamps: true }
);

// const Item = mongoose.model("item", itemSchema);
const Apartment = mongoose.model("apartment", apartmentSchema);
const Invoice = mongoose.model("invoice", invoicesSchema);
const Client = mongoose.model("client", clientSchema);
const AccountStatement = mongoose.model(
  "accountStatement",
  accountStatementSchema
);

module.exports = { Client, Invoice, AccountStatement ,Apartment };
