const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { nanoid } = require("nanoid");
const crypto = require("crypto");

const { auth } = require('../middleware/auth');

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

router.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  await createUser(username, password);
});

router.post("/login", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(username);
  if (!user || user.password != hash(password)) {
    res.sendStatus(401);
    return;
  }
  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/dashboard");
});

router.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }
  await deleteSession(req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");

const findUserByUsername = async (username) =>
  knex("users")
    .select()
    .where({ username })
    .limit(1)
    .then((results) => results[0]);

const createUser = async (username, password) => {
  const newUser = await knex("users").insert({
    username: username,
    password: hash(password),
  });
  return newUser;
};

const createSession = async (userId) => {
  const sessionId = nanoid();

  await knex("sessions").insert({
    user_id: userId,
    session_id: sessionId,
  });

  return sessionId;
};

const deleteSession = async (sessionId) => {
  await knex("sessions").where({ session_id: sessionId }).delete();
};

module.exports = router;
