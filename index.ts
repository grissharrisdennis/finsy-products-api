import { Database } from "bun:sqlite";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia();

app.use(cors({ origin: "http://localhost:5173" }));

app.get("/api/products", async (request) => {
  const { name: productName } = request.query;

  if (!productName) {
    return { message: "Product name is required", status: 400 };
  }

  const db = new Database("productdemo.db");

  try {
    let product = db.query("SELECT * FROM products WHERE LOWER(Name) = LOWER(?)").get(productName);
    if (!product) {
      console.log("Product not found. Adding to database with 'unknown' tag.");

      // Insert new product with "unknown" tag
      db.query("INSERT INTO products (Name, Brand, Tags, rating, Original_Price, Discount_Price) VALUES (?, ?, ?, ?, ?, ?)")
        .run(productName, "unknown", "unknown", 0.0, 0, 0);

      product = db.query("SELECT * FROM products WHERE LOWER(Name) = LOWER(?)").get(productName);

      return { message: "Product not found. New product added with 'unknown' tag.", product };
    }

    // Extract tags and prepare for case-insensitive matching
    const tags = product.Tags.split(",").map(tag => tag.trim().toLowerCase());
    const likeClauses = tags.map(() => `LOWER(Tags) LIKE ?`).join(" OR ");
    const query = `
      SELECT * FROM products 
      WHERE LOWER(Name) != LOWER(?) AND (${likeClauses}) AND Discount_Price <= ?
    `;

    // Execute the query to find potential similar products
    const potentialProducts = db.query(query).all(
      productName,
      ...tags.map(tag => `%${tag}%`),
      product.Discount_Price 
    );

    // Filter products with at least 2 matching tags
    const similarProducts = potentialProducts.filter(p => {
      const productTags = p.Tags.split(",").map(tag => tag.trim().toLowerCase());
      const matchingTags = tags.filter(tag => productTags.includes(tag));
      return matchingTags.length >= 4;
    });

    return { product, recommendations: similarProducts };

  } catch (error) {
    console.error("Error querying database:", error);
    return { message: "Internal Server Error", status: 500 };
  } finally {
    db.close();
  }
});

app.listen(3000); // Backend API listening on port 3000
console.log("Backend API is running on http://localhost:3000...");


