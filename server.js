import express from "express";
import path from "path";
import fs from "fs";
//will use bcrypt later for hashing passwords

const app=express();
const PORT=3000;
const USERS_FILE=path.resolve("users.json");

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
const saveusers=(users)=>{
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

//routes
app.get("/",(req,res)=>{
    res.render("index",{title:"Raya : Find your match"});
})
app.get("/discover",(req,res)=>{
    res.render("discover",{title:"Discover Matches - Raya"});
})
app.get("/profile/:id",(req,res)=>{
    res.render("index",{title:"Raya : Find your match"});
})
app.get("/login",(req,res)=>{
    res.render("login", { title: "Login - Raya", error: null });
})

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    res.redirect("/discover");
  } else {
    res.render("login", { title: "Login - Raya", error: "Invalid email or password" });
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up - Raya", error: null });
});

app.post("/signup", (req, res) => {
  const { firstName, lastName, email, password } = req.body;
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
  };

  users.push(newUser);
  saveUsers(users);
  res.redirect("/login");
});

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found - Raya" });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});