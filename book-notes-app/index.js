import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// =====================
// 1. HOME PAGE
// =====================
app.get("/", async (req, res) => {
  const sortType = req.query.sort === "rating" ? "rating" : "date";
  const sortBy = sortType === "rating" ? "rating DESC" : "date_read DESC";

  try {
    const result = await db.query(`SELECT * FROM books ORDER BY ${sortBy}`);

    res.render("index.ejs", {
      books: result.rows,
      sort: sortType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

// =====================
// 2. ADD PAGE
// =====================
app.get("/add", (req, res) => {
  res.render("add.ejs");
});

// =====================
// 3. CREATE BOOK
// =====================
app.post("/add", async (req, res) => {
  const { isbn, rating, notes } = req.body;

  if (!isbn || isbn.trim() === "") {
    return res.status(400).send("ISBN is required!");
  }

  try {
    const response = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { timeout: 5000 }
    );

    const bookKey = `ISBN:${isbn}`;
    const bookData = response.data[bookKey];

    let title = "Unknown Title";
    let author = "Unknown Author";
    let cover_id = null;

    if (bookData) {
      title = bookData.title || title;
      author = bookData.authors?.[0]?.name || author;

      if (bookData.cover?.medium) {
        cover_id = bookData.cover.medium.split("/").pop().split("-")[0];
      }
    }

    await db.query(
      "INSERT INTO books (isbn, title, author, rating, notes, cover_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [isbn, title, author, rating || null, notes || "", cover_id]
    );

    res.redirect("/");
  } catch (err) {
    console.error("ERROR 👉", err);
    res.status(500).send("Error adding book.");
  }
});

// =====================
// 4. EDIT PAGE
// =====================
app.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [
      req.params.id,
    ]);

    res.render("edit.ejs", { book: result.rows[0] });
  } catch (err) {
    res.status(500).send("Could not find that book.");
  }
});

// =====================
// 5. UPDATE BOOK
// =====================
app.post("/edit/:id", async (req, res) => {
  const { rating, notes } = req.body;

  try {
    await db.query(
      "UPDATE books SET rating = $1, notes = $2 WHERE id = $3",
      [rating, notes, req.params.id]
    );

    res.redirect("/");
  } catch (err) {
    res.status(500).send("Update failed.");
  }
});

// =====================
// 6. DELETE BOOK
// =====================
app.post("/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Delete failed.");
  }
});

// =====================
// START SERVER
// =====================
app.listen(port, () =>
  console.log(`🚀 App live at http://localhost:${port}`)
);