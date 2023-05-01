var express = require('express')
var bodyParser = require("body-parser")
var mongoose = require('mongoose')

const app = express()

app.use(bodyParser.json())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended:true
}))
 
mongoose.connect('mongodb://localhost:27017/ccdb',{
    useNewUrlParser: true,
    useUnifiedTopology:true,
});

var db = mongoose.connection;
db.on('error',()=>console.log("Error in connecting to the database"));
db.once('open',()=>console.log("Connected to database"))

app.post("/signup",async (req,res)=>{
    try{

        const pass = req.body.password;
        const cpass = req.body.cpassword;
        if(pass === cpass){
            var name = req.body.name;
            var semail = req.body.email;
            var address = req.body.address;
            var number = req.body.number;
            var spassword = req.body.password;

            var signupdata = {
                name: name,
                email: semail,
                address: address,
                number: number,
                password: spassword,   
            }

            db.collection('users').insertOne(signupdata,(err,collection)=>{
                if(err){
                    throw err;
                }
                console.log("Record inserted");
            })
            //If signup successful, then directed to signin.html
            return res.redirect("login.html")
        }else{
            res.send("Passwords do not match")
        }
        
    }
    catch(error){
        res.send(error);
    }
})


app.post("/login",async (req,res)=>{
    try{
        const email = req.body.lmail;
        const password = req.body.lpassword;

        const useremail = await db.collection(`users`).findOne({email:email});
        
        //check if your are getting the data from database
        // res.send(useremail.password);
        // console.log(useremail);

        //If signin successful, then directed to updates.html
        if(useremail.password===password){
            return res.redirect("home.html")
        }else{
            res.send("Invalid password");
        }

        //check if email and password from login are taken
        // console.log(`${email} and password: ${password} `)
    }
    catch{
        res.send("Invalid Mail Id")
    }
     
})


app.get("/" ,(req,res)=>{
    res.set({
        "Allow-access-Allow-Origin": "*"
    })
    return res.redirect("signup.html");
}).listen(3000);

app.get("/signup" ,(req,res)=>{
    res.set({
        "Allow-access-Allow-Origin": "*"
    })
    return res.redirect("signup.html");
})

app.get("/login" ,(req,res)=>{
    res.set({
        "Allow-access-Allow-Origin": "*"
    })
    return res.redirect("login.html");
})


console.log("Listening on port 3000");