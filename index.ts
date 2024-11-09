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
        // Find the specified product
        let product = db.query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)").get(productName);
        if (!product) {
          console.log("Product not found. Adding to database with 'unknown' tag.");

          // Insert new product with "unknown" tag
          db.query("INSERT INTO products (name, tags, price) VALUES (?, ?, ?)").run(productName, "unknown", 0);

          // Retrieve the newly inserted product for response consistency
          product = db.query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)").get(productName);

          return new Response(
            JSON.stringify({ message: "Product not found. New product added with 'unknown' tag.", product }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        // Extract tags and prepare for case-insensitive matching
        const tags = product.tags.split(",").map(tag => tag.trim().toLowerCase());
        const likeClauses = tags.map(() => `LOWER(tags) LIKE ?`).join(" OR ");
        const query = `
          SELECT * FROM products 
          WHERE LOWER(name) != LOWER(?) AND (${likeClauses}) AND price <= ?
        `;

        // Execute the query to find potential similar products
        const potentialProducts = db.query(query).all(
          productName,
          ...tags.map(tag => `%${tag}%`),
          product.price // Filter products by price less than or equal to the current product
        );

        // Filter products with at least 2 matching tags
        const similarProducts = potentialProducts.filter(p => {
          const productTags = p.tags.split(",").map(tag => tag.trim().toLowerCase());
          const matchingTags = tags.filter(tag => productTags.includes(tag));
          return matchingTags.length >= 2;
        });

        return new Response(JSON.stringify({ product, recommendations: similarProducts }), {
          headers: { "Content-Type": "application/json" },
        });
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
