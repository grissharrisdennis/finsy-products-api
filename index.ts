import { Database } from "bun:sqlite";
import { serve } from 'bun';
 
const PORT = 3000; 

serve({
  async fetch(request) {
    const { method } = request;
    const url = new URL(request.url);
    const db = new Database("productdemo.db");
    const { pathname } = url;
    console.log("Received request for:", pathname);

    if (pathname === "/api/products" && method === "GET") {
      const productName = url.searchParams.get("name");
      console.log("Product Name:", productName);
      if (!productName) {
        return new Response("Product name is required", { status: 400 });
      }

      try {
        // Fetch the specified product
        let product = db.query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)").get(productName);
        if (!product) {
          console.log("Product not found. Adding to database with 'unknown' tag.");

          // Insert a new product with an "unknown" category and default values
          db.query("INSERT INTO products (name, category, price, quality_rating, brand) VALUES (?, ?, ?, ?, ?)")
            .run(productName, "unknown", 0, 0, "unknown");
          product = db.query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)").get(productName);

          return new Response(
            JSON.stringify({ message: "Product not found. New product added with 'unknown' category.", product }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        const { category, name, price } = product;

        // Query for products in the same category, excluding the specified product, and filter by price (<= input product price)
        const query = `
          SELECT * FROM products
          WHERE LOWER(category) = LOWER(?) AND LOWER(name) != LOWER(?) AND price <= ?
        `;
        const potentialProducts = db.query(query).all(category, name, price);

        // Filter similar products with high quality (4.5+) and low cost
        const similarProducts = potentialProducts
          .filter(p => p.quality_rating >= 4.5) // Products with quality rating of 4.5 or above
          .sort((a, b) => 
            b.quality_rating - a.quality_rating || a.price - b.price // Sort by quality first, then by price
          );

        return new Response(
          JSON.stringify({ product, recommendations: similarProducts }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error querying database:", error);
        return new Response("Internal Server Error", { status: 500 });
      } finally {
        db.close();
      }
    }

    return new Response("Starting the API.......", { status: 200 });
  },
});



console.log(`Listening on http://localhost:${PORT} ...`);
