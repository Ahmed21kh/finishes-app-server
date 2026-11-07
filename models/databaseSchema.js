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
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

const paymentsSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

const transactionSchema = new Schema(
  {
    accountStatement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "accountStatement",
      required: true,
      index: true,
    },
    code: { type: Number, required: true },
    title: { type: String, required: true }, // اسم المعاملة / الشقة / الخدمة
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, required: false, default: "" },
    status: { type: String, default: "قيد التنفيذ" }, // قيد التنفيذ، مكتملة، ملغاة
    patches: { type: [patchesSchema], default: [] },
    payments: { type: [paymentsSchema], default: [] }, // المصروفات والتكاليف
  },
  { timestamps: true }
);

transactionSchema.index({ accountStatement: 1, createdAt: -1 });
transactionSchema.index({ code: 1 });

const accountStatementSchema = new Schema(
  {
    code: { type: Number, required: true, unique: true },
    clientName: { type: String, required: true, index: true },
    phoneNumber: { type: String, required: false },
    address: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, required: false, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    // Retained for backward-compatibility; new workflow uses transactions
    patches: { type: [patchesSchema], default: [] },
    payments: { type: [paymentsSchema], default: [] },
  },
  { timestamps: true }
);

accountStatementSchema.index({ clientName: "text" });

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
    items: { type: [itemSchema], required: false },
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

const Apartment = mongoose.model("apartment", apartmentSchema);
const Invoice = mongoose.model("invoice", invoicesSchema);
const Client = mongoose.model("client", clientSchema);
const AccountStatement = mongoose.model(
  "accountStatement",
  accountStatementSchema
);
const Transaction = mongoose.model("transaction", transactionSchema);

module.exports = {
  Client,
  Invoice,
  AccountStatement,
  Apartment,
  Transaction,
};
