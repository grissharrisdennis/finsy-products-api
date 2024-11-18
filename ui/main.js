document.getElementById('product-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  // Get the product name from the input
  const productName = document.getElementById('product-name').value;

  if (!productName) {
      alert("Please enter a product name");
      return;
  }

  // Send request to your API
  try {
      const response = await fetch(`http://localhost:3000/api/products?name=${encodeURIComponent(productName)}`);
      const result = await response.json();

      // Display the response
      const productResult = document.getElementById('product-result');
      if (response.ok) {
          productResult.innerHTML = `
              <h2>Product Information</h2>
              <p><strong>Name:</strong> ${result.product.Name}</p>
              <p><strong>Brand:</strong> ${result.product.Brand}</p>
              <p><strong>Tags:</strong> ${result.product.Tags}</p>
              <p><strong>Original Price:</strong> ${result.product.Original_Price}</p>
              <p><strong>Discounted Price:</strong> ${result.product.Discount_Price}</p>
          `;

          // Display recommendations if available
          if (result.recommendations.length > 0) {
              productResult.innerHTML += `
                  <h3>Recommendations:</h3>
                  <ul>
                      ${result.recommendations.map(product => `
                          <li>
                              <p><strong>Name:</strong> ${product.Name}</p>
                              <p><strong>Price:</strong> $${product.Discount_Price}</p>
                          </li>
                      `).join('')}
                  </ul>
              `;
          }
      } else {
          productResult.innerHTML = `<p>${result.message}</p>`;
      }
  } catch (error) {
      console.error("Error fetching data:", error);
      document.getElementById('product-result').innerHTML = `<p>Failed to fetch product data.</p>`;
  }
});

