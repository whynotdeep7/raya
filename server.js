import express from "express";
import path from "path";
import fs from "fs";
//will use bcrypt later for hashing passwords

const app=express();
const PORT=3000;
const USERS_FILE=path.resolve("users.json");
const CONTACTUS_FILE=path.resolve("contactus.json");

app.set("view engine","ejs");
app.use(express.static("public"));

//middleware
app.use(express.urlencoded({extended:true}));

//helper function to get all users from json file(DB)
const getUsers=()=>{
    try{
        const data=fs.readFileSync(USERS_FILE,"utf8");
        return JSON.parse(data);
    }
    catch{
        return [];
    }
}

//helper function to save signup details to json file(DB)

const saveUsers=(users)=>{
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

//routes
app.get("/", (req, res) => {
    res.render("index", { title: "Raya : Find your match" });
});

app.get("/discover", (req, res) => {
    res.render("discover", { title: "Discover Matches - Raya" });
});

app.get("/profile", (req, res) => {
    res.render("profile", { title: "My Profile - Raya" });
});

app.get("/login", (req, res) => {
    res.render("login", { title: "Login - Raya", error: null });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
        res.send(`
            <script>
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('userEmail', '${user.email}');
                window.location.href = '/';
            </script>
        `);
    } else {
        res.render("login", { title: "Login - Raya", error: "Invalid email or password" });
    }
});

// API to get user details from users.json by email
app.get("/api/user", (req, res) => {
    const email = req.query.email;
    if (!email) return res.json({ error: "No email provided" });
    const users = getUsers();
    const user = users.find((u) => u.email === email);
    if (!user) return res.json({ error: "User not found" });
    // Return everything except password
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

app.get("/signup", (req, res) => {
    res.render("signup", { title: "Sign Up - Raya", error: null });
});

app.post("/signup", (req, res) => {
    const { firstName, lastName, email, password, age, gender, location, bio } = req.body;
    const users = getUsers();

    if (users.find((u) => u.email === email)) {
        return res.render("signup", { title: "Sign Up - Raya", error: "User already exists" });
    }

    const newUser = {
        id: Date.now(),
        firstName,
        lastName,
        email,
        password,
        age: age || "",
        gender: gender || "",
        location: location || "",
        bio: bio || "",
    };

    users.push(newUser);
    saveUsers(users);
    res.redirect("/login");
});

// Contact Us helpers
const getMessages = () => {
    try {
        const data = fs.readFileSync(CONTACTUS_FILE, "utf8");
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const saveMessages = (messages) => {
    fs.writeFileSync(CONTACTUS_FILE, JSON.stringify(messages, null, 2));
};

app.get("/contact", (req, res) => {
    res.render("contact", { title: "Contact Us - Raya", success: false });
});

app.post("/contact", (req, res) => {
    const { name, email, message } = req.body;
    const messages = getMessages();
    messages.push({
        id: Date.now(),
        name,
        email,
        message,
        date: new Date().toISOString(),
    });
    saveMessages(messages);
    res.render("contact", { title: "Contact Us - Raya", success: true });
});

app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found - Raya" });
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});