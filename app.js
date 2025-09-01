const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const Profile = require("./models/Profile");

const app = express();
const PORT = process.env.PORT;

const server = http.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(`Connexion à la base de données réussie.`))
  .catch(err => console.error(`Erreur de connexion à la base de données : ${err}`));

app.get("/", (req, res) => {
  res.status(200).sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/init", async (req, res) => {
  try {
    await Profile.deleteMany({});

    await Profile.insertMany(
      {
        name: "Valérian Dufrène",
        email: "webdevoo.pro@gmail.com",
        description: "Gérant de l'entreprise Webdevoo."
      }
    );
    res.status(200).json({
      message: "Les données ont été réinitialisées dans la base de données."
    });
  } catch (err) {
    console.error(`Une erreur s'est produite lors de l'initialisation des données : ${err}`);
    res.status(500).json({
      error: err
    });
  };
});

app.post("/api/profile", async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const profile = await Profile.findOne({email : email});
    res.status(200).json(profile);
  } catch (err) {
    console.error(`Une erreur s'est produite lors de la récupération du profil : ${err}`);
    res.status(404).json({
      error: `Une erreur s'est produite lors de la récupération du profil : ${err}`
    });
  }
});

app.use((req, res) => {
  res.status(404).send("Erreur 404 - Contenu introuvable");
});

io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté.");

  socket.on("show profile", async (data) => {
    let email = undefined;
    if (typeof data === "string") {
      email = data.trim().toLowerCase();
    } else if (typeof data === "object") {
      email = data.email.trim().toLowerCase();
    }

    let profile = {
      name: "Profil inconnu",
      email: undefined,
      description: "Ce profil n'existe pas dans notre base de données."
    };

    try {
      const matchingProfile = await Profile.findOne({ email: email });
      if (matchingProfile) {
        profile = matchingProfile;
      }
    } catch (err) {
      console.error(`Une erreur s'est produite lors de la récupération d'un profil en base de données : ${err}`);
      profile = {
        ...profile,
        name: "Une erreur s'est produite",
        description: "Le profil n'a pas pu être récupéré."
      };
    }

    socket.emit("show profile", profile);
    // Pour propager l'évènement à tous les utilisateurs, utilisez io.emit()
    // io.emit("show profile", profile);
  });

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté.");
  });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré à l'adresse http://localhost:${PORT}`);
});