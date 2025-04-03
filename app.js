const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
app.use(cookieParser());

mongoose.connect("mongodb+srv://omar:DKmc8uqRGwVFD2lK@cluster0.f2c9u.mongodb.net/test")
  .then(() => console.log("Connected to DB successfully!"))
  .catch(err => console.error("DB Connection Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    name: String,
    password: String,
    email: { type: String, unique: true },
    phone: { type: String, unique: true, sparse: true },
    points: { type: Number, default: 100 },
    apikey: { type: String, unique: true }
});
const User = mongoose.model("User", userSchema);

const generateAPIKey = () => crypto.randomBytes(16).toString("hex");

app.post("/auth/register", async (req, res) => {
    try {
        const { username, name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const apikey = generateAPIKey();
        const newUser = new User({ username, name, email, password: hashedPassword, apikey });
        await newUser.save();
        res.json({ status: "success", message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ status: "error", message: "Invalid email or password" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ status: "error", message: "Invalid email or password" });
        const token = jwt.sign({ userId: user._id }, "your_secret_key", { expiresIn: "30d" });
        res.cookie("token", token, { httpOnly: true });
        res.json({ status: "success", message: "Login successful" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.get("/profile/show", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ status: "error", message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, "your_secret_key");
        const user = await User.findById(decoded.userId, { password: 0, _id: 0 });
        if (!user) return res.status(401).json({ status: "error", message: "Unauthorized" });

        res.json({ status: "success", user });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.put("/profile/update", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ status: "error", message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, "your_secret_key");
        const { type, data } = req.body;
        let updateField = {};
        switch (type) {
            case "username":
                updateField = { username: data };
                break;
            case "name":
                updateField = { name: data };
                break;
            case "phone":
                updateField = { phone: data };
                break;
            case "password":
                const hashedPassword = await bcrypt.hash(data, 10);
                updateField = { password: hashedPassword };
                break;
            default:
                return res.status(400).json({ status: "error", message: "Invalid update type" });
        }
        await User.updateOne({ _id: decoded.userId }, { $set: updateField });
        res.json({ status: "success", message: `${type} updated` });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.put("/profile/revoke/apikey", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ status: "error", message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, "your_secret_key");
        const newAPIKey = generateAPIKey();
        await User.updateOne({ _id: decoded.userId }, { $set: { apikey: newAPIKey } });
        res.json({ status: "success", apikey: newAPIKey });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.delete("/delete", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ status: "error", message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, "your_secret_key");
        await User.deleteOne({ _id: decoded.userId });
        res.json({ status: "success", message: "Account deleted successfully" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/point/add", async (req, res) => {
    const { apikey, points } = req.body;
    if (!apikey || !points) {
        return res.status(400).json({ status: "error", message: "API key and points are required" });
    }
    try {
        const user = await User.findOne({ apikey });
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
        user.points += parseInt(points); 
        await user.save();
        res.json({ status: "success", message: "Points added successfully", points: user.points });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/point/add", async (req, res) => {
    const { apikey, points } = req.body;
    if (!apikey || !points) {
        return res.status(400).json({ status: "error", message: "API key and points are required" });
    }
    try {
        const user = await User.findOne({ apikey });
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
        user.points -= parseInt(points); 
        await user.save();
        res.json({ status: "success", message: "Points removed successfully", points: user.points });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
})

app.get("/@/1", async (req, res) => {
    const { apikey } = req.query;
    try {
        const user = await User.findOne({ apikey });
        if (!user) return res.status(401).json({ status: "error", message: "Unauthorized" });

        if (user.points <= 0) {
            return res.json({ status: "error", message: "Insufficient points" });
        }
        user.points -= 1;
        await user.save();
        res.json({ status: "success", points: user.points });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
});
