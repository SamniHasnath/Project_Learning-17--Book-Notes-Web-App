import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

// Database Connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booknotes",
  password: "sam341@", 
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// 1. HOME: Show books with dynamic sorting
app.get("/", async (req, res) => {
  const sortType = req.query.sort === "rating" ? "rating" : "date";

  const sortBy =
    sortType === "rating"
      ? "rating DESC"
      : "date_read DESC";

  try {
    const result = await db.query(`SELECT * FROM books ORDER BY ${sortBy}`);

    res.render("index.ejs", {
      books: result.rows,
      sort: sortType   // ✅ THIS LINE FIXES ERROR
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

// 2. ADD: Show the form
app.get("/add", (req, res) => {
  res.render("add.ejs");
});

// 3. CREATE: Fetch API data and Save
app.post("/add", async (req, res) => {
  const { isbn, rating, notes } = req.body;

  // ✅ VALIDATION
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

    if (!bookData) {
      await db.query(
        "INSERT INTO books (isbn, title, author, rating, notes, cover_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [isbn, "Unknown Title", "Unknown", rating || null, notes || "", null]
      );
    } else {
      const title = bookData.title || "Unknown Title";
      const author = bookData.authors?.[0]?.name || "Unknown Author";

      let cover_id = null;
      if (bookData.cover?.medium) {
        cover_id = bookData.cover.medium.split('/').pop().split('-')[0];
      }

      await db.query(
        "INSERT INTO books (isbn, title, author, rating, notes, cover_id) VALUES ($1,$2,$3,$4,$5,$6)",
        [isbn, title, author, rating || null, notes || "", cover_id]
      );
    }

    res.redirect("/");
  } catch (err) {
    console.error("REAL ERROR 👉", err); // 👈 IMPORTANT
    res.status(500).send("Error adding book. Check your internet or Database.");
  }
});

// 4. EDIT: Show existing data
app.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
    res.render("edit.ejs", { book: result.rows[0] });
  } catch (err) {
    res.status(500).send("Could not find that book.");
  }
});

// 5. UPDATE: Save changes
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

// 6. DELETE: Remove book
app.post("/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Delete failed.");
  }
});

app.listen(port, () => console.log(`🚀 App live at http://localhost:${port}`));