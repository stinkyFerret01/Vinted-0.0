//Clearing test//
// console.clear();
//RECUPERATION de mes package (npm)==>
//
const express = require("express");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary").v2;
const cors = require("cors"); //WWW-deploy
require("dotenv").config(); //PRIVATE DATA
//PARAMETRAGE du serveur==>
//
const app = express(); //process.env.CLOUD_NAME
app.use(express.json());
app.use(fileUpload());
app.use(cors()); //WWW-deploy
//-----------------//CONNECTION à mes DB==>
//(données sensibles)
console.log(process.env);
mongoose.connect(process.env.DATABASE_URL);
// mongoose.connect("mongodb://localhost:27017/VintedDB");
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
//----------------//LISTE DE MODELE==>
//Modele utilisateur
const User = mongoose.model("user", {
  mail: String,
  name: String,
  salt: String,
  hash: String,
  token: String,
  avatar: String, //Possibilité de valeur par défaut?
  newsLetter: Boolean,
});
////////////////
//Modele annonce
const Offer = mongoose.model("offer", {
  product_name: String,
  product_description: String,
  product_price: Number,
  product_details: Array,
  owner: {
    account: { username: String, avatar: String },
    user_id: Object,
  },
  product_image: Array,
});
//-------------------------------------------//FONCTIONS ET MIDLEWARE==>
//Func: Converti une image en buffer (encodage)
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};
//////////////////////////////////////////
//Midle: vérifie le token de l'utilisateur
const isAuthenticated = async (req, res, next) => {
  if (req.headers.authorization) {
    const user = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      req.user = user; //ici on transmet l'objet user en l'ajoutant a l'objet req sous la clé "user"
      return next();
    }
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

//-------------------------------------------//ROUTES==>
//USER//Création de compte utilisateur (signUp)
app.post("/user/signup", async (req, res) => {
  try {
    console.log("Tout marche bien serveur");

    if (
      req.body.name === undefined ||
      req.body.mail === undefined ||
      req.body.password === undefined
    ) {
      res.status(400).json({
        Alerte:
          "Les informations que vous nous avez transmises ne permettent pas la création de votre compte(infos manquantes ou invalides)",
        Détails:
          "pour vous enregistrer, vous devez nous transmettre un nom, une adresse mail et un mot de passe",
      });
    } else {
      const user = await User.findOne({ mail: req.body.mail });
      if (user === null) {
        const newSalt = uid2(16);
        const newHash = SHA256(req.body.password + newSalt).toString(encBase64);
        const token = uid2(32);
        const newUser = new User({
          mail: req.body.mail,
          name: req.body.name,
          token: token,
          salt: newSalt,
          hash: newHash,
          newsLetter: true,
          sells: 0,
          sellerRate: null,
        });
        if (req.files !== null) {
          const pictureToUpload = req.files.picture;
          const uploaded = await cloudinary.uploader.upload(
            convertToBase64(pictureToUpload),
            {
              folder: "VintedUsers",
              public_id: `${newUser.name} - ${newUser._id}`,
            }
          );
          newUser.avatar = uploaded.secure_url;
        } else {
          newUser.avatar =
            "https://res.cloudinary.com/detc3sjm1/image/upload/v1657202246/VintedImageDB/react_ap43d7.png";
        }
        await newUser.save();

        res.status(200).json({ message: "enregistrement terminé!" });
      } else {
        res.status(400).json({
          Alerte: "cette adresse mail est déja liée à un compte utilisateur!",
        });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
/////////////////////////////////////////////////
//USER//Authentification de l'utilisateur (login)
app.post("/user/login", async (req, res) => {
  try {
    const connectingUser = await User.findOne({ mail: req.body.mail });
    if (connectingUser === null) {
      res
        .status(400)
        .json({ Alerte: "votre Mot de passe ou votre email est invalide" });
    } else if (
      connectingUser.hash ===
      SHA256(req.body.password + connectingUser.salt).toString(encBase64)
    ) {
      genToken = uid2(32);
      connectingUser.token = genToken;
      await connectingUser.save();
      res.status(400).json({
        message: "authentification réussi!",
        token: connectingUser.token,
      });
    } else {
      res.status(400).json({
        Alerte: "votre Mot de passe ou votre email est invalide",
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
///////////////////////////////
//OFFER//Publication d'annonces
app.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    console.log("Tout marche bien serveur");
    if (
      req.body.product_price !== null &&
      req.body.product_name !== null &&
      req.files !== null
    ) {
      const publishedOffer = new Offer({
        product_name: req.body.product_name,
        product_description: req.body.product_description,
        product_price: req.body.product_price,
        product_details: [
          { MARQUE: req.body.MARQUE },
          { TAILLE: req.body.TAILLE },
          { ETAT: req.body.ETAT },
          { COULEUR: req.body.COULEUR },
          { EMPLACEMENT: req.body.EMPLACEMENT },
        ],
        owner: {
          account: {
            username: req.user.name,
            avatar: req.user.avatar,
          },
          user_id: req.user._id,
        },
      });
      let picturesToUpload = [];
      return res.json(req.files.picture);
      if (req.files.picture === Object) {
        picturesToUpload.push(req.files.picture);
      } else if (req.files.picture === Array) {
        picturesToUpload = req.files.picture;
      }
      return res.json(picturesToUpload);
      let buffersToUpload = [];
      picturesToUpload.forEach(async (e) => {
        let uploaded = await cloudinary.uploader.upload(
          convertToBase64(picturesToUpload[e]),
          {
            folder: "VintedOffers",
            public_Id: `${req.body.title} - ${publishedOffer._id}`,
          }
        );
        buffersToUpload.push({ secure_url: uploaded.secure_url });
      });
      publishedOffer.product_image = buffersToUpload;
      await publishedOffer.save();
      return res.json(publishedOffer);
    } else {
      res.status(400).json({
        Alerte:
          "les informations trasmises ne permettent pas la création de votre annonce",
        Détail:
          "Les éléments nécéssaire à la publication de votre annonce sont un nom pour l'article à vendre, un prix et une photo",
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
///////////////////////////////
//USER//Modification du profil
app.post("/user/modify", isAuthenticated, async (req, res) => {
  try {
    if (req.body.name) req.user.name = req.body.name;
    if (req.body.newsLetter) req.user.newsLetter = req.body.newsLetter;
    if (req.body.mail) req.user.mail = req.body.mail;
    if (req.files !== null) {
      const pictureToUpload = req.files.picture;
      const uploaded = await cloudinary.uploader.upload(
        convertToBase64(pictureToUpload),
        {
          folder: "VintedUsers",
          public_id: `${req.user.name} - ${req.user._id}`,
        }
      );
      req.user.avatar = uploaded.secure_url;
    }
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
/////////////////////////////
//OFFER//Recherche d'articles
app.get("/offer/search", async (req, res) => {
  try {
    let skip = (req.query.page - 1) * req.query.objByPage;
    let filterObject = {};
    if (req.query.product_name) {
      filterObject.product_name = new RegExp(req.query.search, "i");
    }
    if (req.query.pricemin) {
      filterObject.product_price = { $gte: req.query.priceMin };
    }
    if (req.query.priceMax) {
      if (filterObject.product_price) {
        filterObject.product_price.$lte = req.query.priceMax;
      } else {
        filterObject.product_price = { $lte: req.query.priceMax };
      }
    }
    // tout autre filtre possible (filtre user utile/mais difficile)
    const offers = await Offer.find(filterObject)
      .limit(req.query.objByPage)
      .skip(0 + skip)
      .select("product_name - product_price - _id")
      .sort({ product_price: req.query.sorting });
    res.status(200).json(offers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
//////////////
//Welcome page
app.get("/", (req, res) => {
  res.status(200).json("Welcome!!");
});
//////////////////////////////////////
//Récuparation des routes inexistantes
app.all("*", (req, res) => {
  res.status(404).json({ Alerte: "La page n'est pas accessible!" });
});
//////////////////////
//Démarrage du serveur
app.listen(process.env.PORT, () => {
  //3000
  console.log("Server has Started!");
});
