# The Cozy Table

> Good Food. Good Mood.

The Cozy Table is a demo restaurant ordering website built with **Python, Flask, HTML, CSS and vanilla JavaScript**. It started as a beginner-level Python restaurant billing program and was turned into a complete, responsive website.

**This is a demo project.** No real payments are taken, no orders are stored, and no food is delivered. All contact details and opening hours are fictional.

## Features

- Responsive café website (home, menu, cart, checkout)
- 15 menu items with images, descriptions, prices in Indian rupees and veg labels
- Menu search and category filters (Pizza, Main Course, Snacks, Beverages)
- Shopping cart with add, increase, decrease, remove and clear options
- Live cart item count in the navigation bar
- Server-side billing: subtotal, 10% discount on orders of Rs. 500 or more, 5% sample tax and final total
- Order confirmation screen with a sample order number
- No database and no user accounts

## How the Billing Works

1. Subtotal = sum of (price x quantity) for every item
2. If the subtotal is Rs. 500 or more, a 10% discount is applied
3. Tax (5%) is calculated on the amount after the discount
4. Final total = amount after discount + tax

All money calculations are done in Python using `Decimal`, so rounding is accurate.

## Security Notes

- The browser sends only item names and quantities. **Prices are never sent by the browser.**
- Flask reads prices from the menu in `restaurant.py` and recalculates everything on the server.
- Item names and quantities are validated on the server (unknown items, zero, negative, decimal and very large quantities are rejected).
- The cart is stored temporarily in the browser's `localStorage`. It is not saved on the server and can be lost if browser data is cleared.
- No secret keys or credentials are used in this project.

## Tech Stack

| Part | Technology |
|---|---|
| Backend | Python 3, Flask |
| Templates | Jinja2 |
| Frontend | HTML, CSS, vanilla JavaScript |
| Storage | Browser localStorage (cart only) |

## Project Structure

```
the-cozy-table/
├── app.py              # Flask routes (pages and API)
├── restaurant.py       # Menu, settings and billing logic
├── requirements.txt    # Python dependencies
├── .gitignore
├── README.md
├── templates/
│   ├── base.html       # Shared layout (navbar, footer)
│   ├── _food_card.html # Reusable menu item card
│   ├── index.html      # Home page
│   ├── menu.html       # Menu page
│   ├── cart.html       # Cart page
│   └── checkout.html   # Checkout and confirmation
└── static/
    ├── css/style.css   # All styling
    ├── js/script.js    # Cart, search, filters, checkout
    └── images/         # Food and hero photos
```

## Run Locally (Windows)

1. Install Python 3.10 or newer from python.org (tick "Add python.exe to PATH").
2. Open the project folder in a terminal and create a virtual environment:

```
   python -m venv venv
```

3. Activate it:

```
   venv\Scripts\Activate.ps1
```

   (In Command Prompt use `venv\Scripts\activate.bat`.)

4. Install the dependencies:

```
   pip install -r requirements.txt
```

5. Start the server:

```
   python app.py
```

6. Open `http://127.0.0.1:5000` in your browser.

## Customising

- **Menu, prices, tax and discount:** edit the settings and `MENU` in `restaurant.py`.
- **Contact details and opening hours:** edit `RESTAURANT_INFO` in `restaurant.py`.
- **Images:** replace the files in `static/images/`. File names must match the item names, for example `margherita-pizza.jpg`.

## Image Credits

Food and café photos are free-to-use images. Add your photo sources and photographer credits here.

## Limitations

- Orders are not stored anywhere.
- The cart exists only in the browser that created it.
- There are no payments, user accounts or real delivery.

## License

This project was created for learning and portfolio purposes.