const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const uri=process.env.MONGO_URI
const app = express();
const PORT = process.env.PORT || 4000

const corsOptions = {
    origin: 'http://localhost:5173',
};

app.use(cors(corsOptions));
app.use(bodyParser.json()); // Parse JSON request bodies

let users;

async function connect() {
    try {
        const client = await MongoClient.connect(
            uri,
        );
        const myDB = client.db("MOVIE");
        users = myDB.collection("users");
        console.log("Connected to the database");
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
}

connect().then();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
    res.send("welcome to server");
});

app.post("/login", async (req, res) => {
    try {
        const response=users.findOne({email:req.body.email})
        if(response)
        {
            res.send("Correct")

        }
        else{
            res.send("incorrect")
        }

    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/signup", async (req,res)=>{
    try{
        const {name,email,phoneNo,password}=req.body
        const response=await users.findOne({email: email})
        if(response)
        {
            res.status(208)
        }
        else {
           const result= users.insertOne({
                name:name,
                email:email,
                phoneNo:phoneNo,
                password:password,
                playlists:[]
            })
            if (result)
            {
                res.status(201)
            }
            else{
                res.send(501)
            }
        }
    }
    catch (e) {
        console.log(e)
    }
})

app.post('/addPlaylist', async (req, res) => {
    try {
        const {name, email} = req.body;
        const result = await users.findOneAndUpdate({email: email}, {
            $push: {
                playlists: {
                    name: name,
                    movies: [],
                    status:"public"
                }
            }
        }, {new: true})
        if(result)
        res.send("added successfully")

    } catch (e) {
        console.log(e);
    }
})

app.get("/userDetails/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const response = await users.findOne({ email: email });
        if (response) {
            res.send(response);
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (e) {
        console.error('Error fetching user details:', e);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.post("/addMovie", async (req, res) => {
    try {
        const { email, name, movieid } = req.body;

        const playlist = await users.findOne({ email: email, "playlists.name": name });
        if (!playlist) {
            res.status(404).send("Playlist not found");
            return;
        }

        const playlistIndex = playlist.playlists.findIndex(p => p.name === name);
        const movieExistsInPlaylist = playlist.playlists[playlistIndex].movies.includes(movieid);
        if (movieExistsInPlaylist) {
            res.status(400).send("Movie already exists in the playlist");
            return;
        }

        const response = await users.findOneAndUpdate(
            { email: email, "playlists.name": name },
            { $addToSet: { "playlists.$.movies": movieid } }
        );

        if (response) {
            res.send("Added successfully");
        } else {
            res.status(404).send("Playlist not found");
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});


app.delete('/deleteMovie', async (req, res) => {
    const { email, name, movieid } = req.body;

    if (!email || !name || !movieid) {
        return res.status(400).send('Missing required information');
    }

    try {
        const result=  await users.updateOne({email:email,"playlists.name":name},{
            $pull: {
                "playlists.$.movies":  movieid
            }
        })
        if (result.acknowledged)
        {
            res.send("movie deleted successfully from the playlist")
        }

    } catch (error) {
        console.error('Error deleting movie:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.delete('/deletePlaylist', async (req, res) => {
    try {
        const { email, name } = req.body;
        const response = await users.updateOne(
            { email: email },
            { $pull: { playlists: { name: name } } }
        );

        console.log(response);

        if (response.modifiedCount === 1) {
            res.status(200).send("Playlist deleted successfully");
        } else {
            res.status(404).send("Playlist not found or could not be deleted");
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Internal server error");
    }
});


app.get("/friendlist/:email/:name", async (req, res) => {
    try {
        const { email, name } = req.params;
        const user = await users.findOne({ email: email });

        if (user && user.playlists) {
            const playlist = user.playlists.find(list => list.name === name);
            if (playlist) {
                console.log(playlist)
                res.json({ email: email, playlist:playlist });
            } else {
                res.status(404).send("Playlist not found");
            }
        } else {
            res.status(404).send("User or playlists not found");
        }
    } catch (e) {
        console.error("Error fetching friendlist:", e); // Improved error logging
        res.status(500).send("Server error");
    }
});




app.put("/status", async (req, res) => {
    try {
        const { email, name, status } = req.body;

        const result = await users.findOneAndUpdate(
            { email: email, "playlists.name": name },
            { $set: { "playlists.$.status": status } },
            { new: true }
        );

        if (result) {
            res.status(200).send("Status updated successfully");
        } else {
            res.status(404).send("Playlist not found");
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
});

